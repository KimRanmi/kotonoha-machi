"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthStatus from "@/components/AuthStatus";
import styles from "./town.module.css";
import {
  BUILDINGS,
  NEW_BUILDING_SIZE,
  nextBuildingColor,
  type Building,
  withThemeResident,
  type PlacedBuilding,
} from "./buildings";
import { BuildingMarker, BuildingTag, buildingDepth } from "./BuildingMarker";
import { Ambient, FrontFence, Prop, SceneGround, STATIC_PROPS } from "./TownScenery";
import { MAP_HEIGHT, MAP_WIDTH, STAGE_HEIGHT, STAGE_WIDTH, project, unproject } from "./iso";
import { makeHomeBuilding } from "./home";
import { getNextOnboardingStep } from "./onboarding";
import {
  CHAR_SIZE,
  clamp,
  collidesWithRects,
  isNearRect,
  rectsOverlap,
  useWalker,
  type Point,
} from "@/lib/walk";
import {
  loadFromStorage,
  saveToStorage,
  removeFromStorage,
  loadHomePosition,
  saveHomePosition,
  loadOnboardingDone,
  markOnboardingStepDone,
  setTownReturnBuilding,
  takeTownReturnBuilding,
  PENDING_BUILDING_STORAGE_KEY,
  PLACED_BUILDINGS_STORAGE_KEY,
} from "@/lib/storage";
import type { PendingBuilding } from "@/lib/types";

// 맵/캐릭터 기본 수치. 이번 범위는 "하나로 이어진 오픈맵 위에서 자유롭게 걸어다니기"까지이며
// 실제 아트 에셋, 건물 기능, 대화 연동 등은 이후 단계에서 다룬다.
// 건물 목록/타입은 ./buildings, 건물 한 채의 렌더링은 ./BuildingMarker 에 분리해뒀다 —
// 건물별 기능을 추가할 때 이동/충돌을 다루는 이 파일을 건드릴 필요가 없도록 하기 위함이다.
// (MAP_WIDTH/MAP_HEIGHT와 비스듬한 시점 투영은 ./iso 에 있다. 이동·충돌·배치 판정은 월드 좌표 그대로다.)

// 건물 안으로 "들어갈 수 있는" 거리: 건물 테두리 밖으로 이 거리 안.
const INTERACTION_MARGIN = 28;

// 건물 내부에서 나왔을 때 캐릭터를 세울 자리: 건물 입구(아래쪽 가운데) 앞을 우선하고,
// 막혀 있으면(맵 가장자리, 다른 건물 등) 위/오른쪽/왼쪽 순으로 비어 있는 곳을 찾는다.
function findExitSpot(building: Building, buildings: Building[]): Point {
  const cx = building.x + building.width / 2 - CHAR_SIZE / 2;
  const cy = building.y + building.height / 2 - CHAR_SIZE / 2;
  const gap = 4;
  const candidates: Point[] = [
    { x: cx, y: building.y + building.height + gap },
    { x: cx, y: building.y - CHAR_SIZE - gap },
    { x: building.x + building.width + gap, y: cy },
    { x: building.x - CHAR_SIZE - gap, y: cy },
  ];
  const inMap = (p: Point) =>
    p.x >= 0 && p.y >= 0 && p.x <= MAP_WIDTH - CHAR_SIZE && p.y <= MAP_HEIGHT - CHAR_SIZE;
  return (
    candidates.find((p) => inMap(p) && !collidesWithRects(p.x, p.y, buildings)) ?? {
      x: clamp(candidates[0].x, 0, MAP_WIDTH - CHAR_SIZE),
      y: clamp(candidates[0].y, 0, MAP_HEIGHT - CHAR_SIZE),
    }
  );
}

// 캐릭터가 들어갈 수 있는 거리(테두리 + margin)에 있는 건물을 찾는다.
// 여러 건물 범위가 겹치는 배치는 없으므로 첫 매치를 그대로 쓴다.
function findNearbyBuilding(x: number, y: number, buildings: Building[]) {
  return buildings.find((b) => isNearRect(x, y, b, INTERACTION_MARGIN)) ?? null;
}

export default function TownPage() {
  const router = useRouter();
  // 테마 학습에서 배치되어 저장된 건물들. 정적 BUILDINGS와 합쳐 이동 충돌/렌더링에 쓴다.
  // localStorage는 서버에 없으므로, 하이드레이션 불일치를 피하기 위해 빈 상태로 시작했다가
  // 클라이언트 마운트 후 한 번만 읽어온다.
  const [placedBuildings, setPlacedBuildings] = useState<PlacedBuilding[]>([]);
  // 테마를 막 완료하고 넘어와서, 아직 배치하지 않은 건물이 있으면 배치 모드가 된다.
  const [pendingBuilding, setPendingBuilding] = useState<PendingBuilding | null>(null);

  // 내 집 위치(온보딩에서 배치). 아직 배치 전이면 null.
  const [homePosition, setHomePosition] = useState<Point | null>(null);
  // 끝낸 온보딩 단계. 저장소를 읽기 전(null)에는 온보딩 모드를 켜지 않는다.
  const [onboardingDone, setOnboardingDone] = useState<string[] | null>(null);
  const onboardingStep = onboardingDone ? getNextOnboardingStep(onboardingDone) : null;

  const allBuildings = useMemo<Building[]>(
    () => [
      ...BUILDINGS,
      ...(homePosition ? [makeHomeBuilding(homePosition)] : []),
      ...placedBuildings,
    ],
    [homePosition, placedBuildings]
  );
  // rAF 루프(마운트 시 한 번만 등록)가 항상 최신 건물 목록으로 충돌 판정을 하도록 ref로도 들고 있는다.
  const allBuildingsRef = useRef<Building[]>(allBuildings);

  // 이동/충돌(방향키·WASD, rAF 루프, 맵 경계·건물에 막힘)은 건물 내부 방과 공유하는 useWalker가 맡는다.
  const { position, positionRef, teleport } = useWalker({
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    obstacles: allBuildings,
    isometric: true, // 방향키는 화면 기준(위 = 화면 위쪽)으로 움직인다
    initial: {
      x: MAP_WIDTH / 2 - CHAR_SIZE / 2,
      y: MAP_HEIGHT / 2 - CHAR_SIZE / 2,
    },
  });

  useEffect(() => {
    const placed = loadFromStorage<PlacedBuilding[]>(PLACED_BUILDINGS_STORAGE_KEY, []).map(
      withThemeResident // 주민 연결이 생기기 전에 저장된 건물에는 테마 주민을 소급해서 붙여준다.
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlacedBuildings(placed);
    const home = loadHomePosition();
    setHomePosition(home);
    setOnboardingDone(loadOnboardingDone());

    // 건물 내부에서 나온 경우, 그 건물 입구 앞에 캐릭터를 세운다.
    const returnId = takeTownReturnBuilding();
    if (returnId) {
      const all = [...BUILDINGS, ...(home ? [makeHomeBuilding(home)] : []), ...placed];
      const from = all.find((b) => b.id === returnId);
      if (from) teleport(findExitSpot(from, all));
    }

    // 배치 대기 건물은 실제로 배치할 때까지 남겨 둔다. 배치 전에 나가도 건물이 사라지지 않고,
    // 테마 완료 기록은 이미 남아 있어 같은 테마로 중복 pending이 생기지도 않는다.
    const pending = loadFromStorage<PendingBuilding | null>(
      PENDING_BUILDING_STORAGE_KEY,
      null
    );
    if (pending) {
      setPendingBuilding(pending);
    }
  }, [teleport]);

  // 방금 배치된 건물 id. 짧은 건설 연출 클래스를 붙이는 동안만 값을 들고 있는다.
  const [justPlacedId, setJustPlacedId] = useState<string | null>(null);
  const justPlacedTimeoutRef = useRef<number | null>(null);

  // 들어갈 수 있는 건물에 가까이 있는지는 매 렌더마다 현재 위치에서 파생시킨다(별도 state 불필요).
  // ref로도 함께 들고 있는 이유는 키 이벤트 핸들러(마운트 시 한 번만 등록)가
  // 최신 값을 읽어야 하는데 클로저에 갇힌 state를 그대로 참조하면 값이 갱신되지 않기 때문이다.
  const nearBuildingId = useMemo(
    () => findNearbyBuilding(position.x, position.y, allBuildings)?.id ?? null,
    [position, allBuildings]
  );
  const nearBuildingIdRef = useRef<string | null>(null);

  useEffect(() => {
    allBuildingsRef.current = allBuildings;
  }, [allBuildings]);

  useEffect(() => {
    return () => {
      if (justPlacedTimeoutRef.current !== null) {
        window.clearTimeout(justPlacedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    nearBuildingIdRef.current = nearBuildingId;
  }, [nearBuildingId]);

  // 건물 근처에서 Enter/Space를 누르면 그 건물의 내부 화면으로 들어간다.
  // (예전처럼 건물 밖에서 바로 대화가 뜨지 않는다. 대화는 방 안의 주민에게서 시작한다.)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if ((key === "enter" || key === " ") && nearBuildingIdRef.current) {
        e.preventDefault();
        const id = nearBuildingIdRef.current;
        setTownReturnBuilding(id);
        router.push(`/inside/${encodeURIComponent(id)}`);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // 배치 모드일 때, 맵의 빈 자리를 클릭/탭하면 대기 중인 건물을 그 자리에 배치한다.
  // 온보딩의 집 배치가 먼저고, 끝나면 대기 중인 테마 건물 차례가 된다.
  // 기존 건물이나 캐릭터의 현재 위치와 겹치면 빈 자리가 아니므로 무시한다.
  function handleMapClick(e: MouseEvent<HTMLDivElement>) {
    if (!onboardingStep && !pendingBuilding) return;

    // 화면(비스듬한 시점) 클릭 위치를 월드 좌표로 되돌린다. 땅 밖을 누르면 무시한다.
    const rect = e.currentTarget.getBoundingClientRect();
    const { x: clickX, y: clickY } = unproject(e.clientX - rect.left, e.clientY - rect.top);
    if (clickX < 0 || clickY < 0 || clickX > MAP_WIDTH || clickY > MAP_HEIGHT) return;

    const { width, height } = NEW_BUILDING_SIZE;
    const x = clamp(clickX - width / 2, 0, MAP_WIDTH - width);
    const y = clamp(clickY - height / 2, 0, MAP_HEIGHT - height);

    if (collidesWithRects(x, y, allBuildingsRef.current)) return;
    const current = positionRef.current;
    if (rectsOverlap(x, y, width, height, current.x, current.y, CHAR_SIZE, CHAR_SIZE)) {
      return;
    }

    if (onboardingStep === "place-home") {
      const position = { x, y };
      saveHomePosition(position);
      markOnboardingStepDone("place-home");
      setHomePosition(position);
      setOnboardingDone(loadOnboardingDone());
      return;
    }
    if (!pendingBuilding) return;

    const newBuilding: PlacedBuilding = {
      id: `theme-${pendingBuilding.completedAt}`,
      x,
      y,
      width,
      height,
      label: `${pendingBuilding.themeTitle} 학습관`,
      color: nextBuildingColor(placedBuildings.length),
      themeTitle: pendingBuilding.themeTitle,
      placedAt: Date.now(),
    };
    const withResident = withThemeResident(newBuilding);

    const updated = [...placedBuildings, withResident];
    setPlacedBuildings(updated);
    saveToStorage(PLACED_BUILDINGS_STORAGE_KEY, updated);
    setPendingBuilding(null);
    removeFromStorage(PENDING_BUILDING_STORAGE_KEY);

    setJustPlacedId(withResident.id);
    if (justPlacedTimeoutRef.current !== null) {
      window.clearTimeout(justPlacedTimeoutRef.current);
    }
    justPlacedTimeoutRef.current = window.setTimeout(() => {
      setJustPlacedId(null);
    }, 1300);
  }

  // 건물·소품·캐릭터를 "앞쪽(월드 x+y가 큰 쪽)일수록 나중에" 그려서 비스듬한 시점의 앞뒤 가림을 맞춘다.
  // 움직이지 않는 것(소품·건물)은 정렬/요소를 메모해 두고, 매 프레임 바뀌는 캐릭터만 끼워 넣는다.
  const staticItems = useMemo(
    () =>
      [
        ...STATIC_PROPS.map((p, i) => ({ key: `prop-${i}`, depth: p.x + p.y, node: <Prop def={p} i={i} /> })),
        ...allBuildings.map((b) => ({
          key: `b-${b.id}`,
          depth: buildingDepth(b),
          node: <BuildingMarker building={b} isConstructing={justPlacedId === b.id} />,
        })),
      ].sort((a, b) => a.depth - b.depth),
    [allBuildings, justPlacedId]
  );
  const ground = useMemo(() => <SceneGround />, []);
  const frontFence = useMemo(() => <FrontFence />, []);
  const ambient = useMemo(() => <Ambient />, []);

  const [charX, charY] = project(position.x + CHAR_SIZE / 2, position.y + CHAR_SIZE / 2, 0);
  const charDepth = position.x + position.y + CHAR_SIZE;
  let charIndex = staticItems.findIndex((it) => it.depth > charDepth);
  if (charIndex < 0) charIndex = staticItems.length;
  const characterNode = (
    <g key="character">
      <ellipse cx={charX} cy={charY} rx={17} ry={6.5} fill="rgba(60,70,40,0.3)" />
      <text x={charX} y={charY - 4} textAnchor="middle" fontSize={38}>
        🧑
      </text>
    </g>
  );

  // 카메라: 캐릭터가 화면 가운데(약간 아래)에 오도록 무대를 옮긴다. 무대 가장자리 밖은 보이지 않게 막는다.
  const [view, setView] = useState({ w: 1280, h: 800 });
  const [cameraReady, setCameraReady] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      setView({ w: el.clientWidth, h: el.clientHeight });
      setCameraReady(true);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const camX = STAGE_WIDTH <= view.w ? (STAGE_WIDTH - view.w) / 2 : clamp(charX - view.w / 2, 0, STAGE_WIDTH - view.w);
  const camY = STAGE_HEIGHT <= view.h ? (STAGE_HEIGHT - view.h) / 2 : clamp(charY - view.h * 0.55, 0, STAGE_HEIGHT - view.h);

  return (
    <div className={styles.townRoot}>
      <div ref={viewportRef} className={styles.viewport}>
        <main
          className={[styles.stage, onboardingStep || pendingBuilding ? styles.placementMode : "", cameraReady ? styles.cameraReady : ""].join(" ")}
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `translate3d(${-camX}px, ${-camY}px, 0)` }}
          onClick={handleMapClick}
        >
          <svg className={styles.stageSvg} width={STAGE_WIDTH} height={STAGE_HEIGHT} viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`} aria-hidden="true">
            {ground}
            {staticItems.slice(0, charIndex).map((it) => (
              <g key={it.key}>{it.node}</g>
            ))}
            {characterNode}
            {staticItems.slice(charIndex).map((it) => (
              <g key={it.key}>{it.node}</g>
            ))}
            {/* 건물 뒤로 가려졌을 때도 위치를 알 수 있게 옅은 실루엣을 맨 위에 한 번 더 그린다 */}
            <text x={charX} y={charY - 4} textAnchor="middle" fontSize={38} opacity={0.3}>
              🧑
            </text>
            {frontFence}
            {ambient}
          </svg>
          {allBuildings.map((b) => (
            <BuildingTag key={b.id} building={b} isNear={nearBuildingId === b.id} isConstructing={justPlacedId === b.id} />
          ))}
        </main>
        <div className={styles.vignette} />
      </div>

      <header className={styles.townHeader}>
        <div className={styles.title}>ことばのまち — 마을 지도</div>
        <div className={styles.headerLinks}>
          <Link href="/theme-learning" className="pill">
            학습하기
          </Link>
          <Link href="/words" className="pill">
            학습 단어 목록
          </Link>
          <Link href="/villagers" className="pill">
            주민 목록
          </Link>
          <AuthStatus className="pill" />
        </div>
      </header>

      <div className={styles.townFooter}>
        {onboardingStep === "place-home" ? (
          <p className={styles.interactionBanner}>
            환영합니다! 빈 자리를 클릭/탭해서 &quot;내 집&quot;을 지어보세요. 한 번 지으면 옮길 수 없어요.
          </p>
        ) : pendingBuilding ? (
          <p className={styles.interactionBanner}>
            빈 자리를 클릭/탭해서 &quot;{pendingBuilding.themeTitle}&quot; 건물을 지어보세요!
          </p>
        ) : nearBuildingId ? (
          <p className={styles.interactionBanner}>Enter 또는 Space로 들어가기</p>
        ) : (
          <p className={styles.hint}>방향키 또는 WASD로 캐릭터를 움직여보세요.</p>
        )}
      </div>
    </div>
  );
}
