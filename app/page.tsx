"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import styles from "./town.module.css";
import {
  BUILDINGS,
  NEW_BUILDING_SIZE,
  nextBuildingColor,
  type Building,
  type PlacedBuilding,
} from "./buildings";
import { BuildingMarker } from "./BuildingMarker";
import { THEME_RESIDENTS } from "@/lib/villager";
import ChatPanel from "@/components/ChatPanel";
import {
  loadFromStorage,
  saveToStorage,
  removeFromStorage,
  PENDING_BUILDING_STORAGE_KEY,
  PLACED_BUILDINGS_STORAGE_KEY,
} from "@/lib/storage";
import type { PendingBuilding } from "@/lib/types";

// 맵/캐릭터 기본 수치. 이번 범위는 "하나로 이어진 오픈맵 위에서 자유롭게 걸어다니기"까지이며
// 실제 아트 에셋, 건물 기능, 대화 연동 등은 이후 단계에서 다룬다.
// 건물 목록/타입은 ./buildings, 건물 한 채의 렌더링은 ./BuildingMarker 에 분리해뒀다 —
// 건물별 기능을 추가할 때 이동/충돌을 다루는 이 파일을 건드릴 필요가 없도록 하기 위함이다.
const MAP_WIDTH = 960;
const MAP_HEIGHT = 640;
const CHAR_SIZE = 32;
const MOVE_SPEED = 220; // px / sec
const INTERACTION_MARGIN = 28; // 건물 테두리 밖으로 이 거리 안에 들어오면 "대화 가능"으로 본다

const KEY_DIRECTIONS: Record<string, { dx: number; dy: number }> = {
  arrowup: { dx: 0, dy: -1 },
  arrowdown: { dx: 0, dy: 1 },
  arrowleft: { dx: -1, dy: 0 },
  arrowright: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function collidesWithBuildings(x: number, y: number, buildings: Building[]) {
  return buildings.some((b) =>
    rectsOverlap(x, y, CHAR_SIZE, CHAR_SIZE, b.x, b.y, b.width, b.height)
  );
}

// 담당 주민이 있는 건물 중 캐릭터와 상호작용 가능한 거리(테두리 + margin)에 있는
// 건물을 찾는다. 여러 건물 범위가 겹치는 배치는 없으므로 첫 매치를 그대로 쓴다.
function findNearbyResidentBuilding(x: number, y: number, buildings: Building[]) {
  return (
    buildings.find(
      (b) =>
        b.hasResident &&
        rectsOverlap(
          x,
          y,
          CHAR_SIZE,
          CHAR_SIZE,
          b.x - INTERACTION_MARGIN,
          b.y - INTERACTION_MARGIN,
          b.width + INTERACTION_MARGIN * 2,
          b.height + INTERACTION_MARGIN * 2
        )
    ) ?? null
  );
}

// 테마 건물에 그 테마의 주민을 연결한다(해당 테마 주민이 없으면 그대로 둔다).
function withThemeResident(b: PlacedBuilding): PlacedBuilding {
  const residentId = THEME_RESIDENTS[b.themeTitle];
  if (!residentId || b.residentId) return b;
  return { ...b, hasResident: true, residentId };
}

export default function TownPage() {
  const [position, setPosition] = useState({
    x: MAP_WIDTH / 2 - CHAR_SIZE / 2,
    y: MAP_HEIGHT / 2 - CHAR_SIZE / 2,
  });
  const positionRef = useRef(position);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // 테마 학습에서 배치되어 저장된 건물들. 정적 BUILDINGS와 합쳐 이동 충돌/렌더링에 쓴다.
  // localStorage는 서버에 없으므로, 하이드레이션 불일치를 피하기 위해 빈 상태로 시작했다가
  // 클라이언트 마운트 후 한 번만 읽어온다.
  const [placedBuildings, setPlacedBuildings] = useState<PlacedBuilding[]>([]);
  // 테마를 막 완료하고 넘어와서, 아직 배치하지 않은 건물이 있으면 배치 모드가 된다.
  const [pendingBuilding, setPendingBuilding] = useState<PendingBuilding | null>(null);

  useEffect(() => {
    // 주민 연결이 생기기 전에 저장된 건물에는 테마 주민을 소급해서 붙여준다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlacedBuildings(
      loadFromStorage<PlacedBuilding[]>(PLACED_BUILDINGS_STORAGE_KEY, []).map(withThemeResident)
    );

    // 배치 대기 건물은 실제로 배치할 때까지 남겨 둔다. 배치 전에 나가도 건물이 사라지지 않고,
    // 테마 완료 기록은 이미 남아 있어 같은 테마로 중복 pending이 생기지도 않는다.
    const pending = loadFromStorage<PendingBuilding | null>(
      PENDING_BUILDING_STORAGE_KEY,
      null
    );
    if (pending) {
      setPendingBuilding(pending);
    }
  }, []);

  // 방금 배치된 건물 id. 짧은 건설 연출 클래스를 붙이는 동안만 값을 들고 있는다.
  const [justPlacedId, setJustPlacedId] = useState<string | null>(null);
  const justPlacedTimeoutRef = useRef<number | null>(null);

  const allBuildings = useMemo<Building[]>(
    () => [...BUILDINGS, ...placedBuildings],
    [placedBuildings]
  );
  // rAF 루프(마운트 시 한 번만 등록)가 항상 최신 건물 목록으로 충돌 판정을 하도록 ref로도 들고 있는다.
  const allBuildingsRef = useRef<Building[]>(allBuildings);

  // 대화 가능한 건물에 가까이 있는지는 매 렌더마다 현재 위치에서 파생시킨다(별도 state 불필요).
  // ref로도 함께 들고 있는 이유는 키 이벤트 핸들러(마운트 시 한 번만 등록)가
  // 최신 값을 읽어야 하는데 클로저에 갇힌 state를 그대로 참조하면 값이 갱신되지 않기 때문이다.
  const nearBuildingId = useMemo(
    () => findNearbyResidentBuilding(position.x, position.y, allBuildings)?.id ?? null,
    [position, allBuildings]
  );
  const nearBuildingIdRef = useRef<string | null>(null);
  const [activeChatBuildingId, setActiveChatBuildingId] = useState<string | null>(null);
  const isChatOpenRef = useRef(false);

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
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    nearBuildingIdRef.current = nearBuildingId;
  }, [nearBuildingId]);

  useEffect(() => {
    isChatOpenRef.current = activeChatBuildingId !== null;
    if (activeChatBuildingId !== null) {
      // 대화가 열리는 동안 남아있는 이동 입력을 지워 캐릭터가 계속 움직이지 않게 한다.
      pressedKeysRef.current.clear();
    }
  }, [activeChatBuildingId]);

  // 키보드 입력 처리: 방향키 / WASD를 누르고 있는 동안 계속 이동하고,
  // 대화 가능한 건물 근처에서 Enter/Space를 누르면 그 건물의 주민과 대화를 시작한다.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isChatOpenRef.current) return; // 대화 오버레이가 열려있으면 이동/상호작용 입력을 무시한다.

      const key = e.key.toLowerCase();
      if (KEY_DIRECTIONS[key]) {
        pressedKeysRef.current.add(key);
        e.preventDefault();
        return;
      }
      if ((key === "enter" || key === " ") && nearBuildingIdRef.current) {
        e.preventDefault();
        setActiveChatBuildingId(nearBuildingIdRef.current);
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      pressedKeysRef.current.delete(key);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // requestAnimationFrame 루프: 눌린 키에 따라 매 프레임 위치를 갱신하고,
  // 맵 경계와 건물에 막히도록 충돌 처리를 한다 (X/Y 축을 각각 체크해 벽을 따라 미끄러지듯 이동).
  useEffect(() => {
    function tick(time: number) {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      // 탭이 백그라운드로 밀리는 등 프레임이 크게 밀렸다가 재개되면 delta가 비정상적으로
      // 커져 한 프레임에 큰 거리를 이동하게 되고, 도착 지점만 검사하는 충돌 처리 특성상
      // 건물을 그대로 관통(터널링)할 수 있다. 최대 delta를 제한해 이를 방지한다.
      const delta = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      let dx = 0;
      let dy = 0;
      pressedKeysRef.current.forEach((key) => {
        const dir = KEY_DIRECTIONS[key];
        if (dir) {
          dx += dir.dx;
          dy += dir.dy;
        }
      });

      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy) || 1;
        const moveX = (dx / length) * MOVE_SPEED * delta;
        const moveY = (dy / length) * MOVE_SPEED * delta;

        const current = positionRef.current;
        let nextX = current.x;
        let nextY = current.y;

        const candidateX = clamp(current.x + moveX, 0, MAP_WIDTH - CHAR_SIZE);
        if (!collidesWithBuildings(candidateX, current.y, allBuildingsRef.current)) {
          nextX = candidateX;
        }

        const candidateY = clamp(current.y + moveY, 0, MAP_HEIGHT - CHAR_SIZE);
        if (!collidesWithBuildings(nextX, candidateY, allBuildingsRef.current)) {
          nextY = candidateY;
        }

        if (nextX !== current.x || nextY !== current.y) {
          positionRef.current = { x: nextX, y: nextY };
          setPosition({ x: nextX, y: nextY });
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, []);

  // 배치 모드일 때, 맵의 빈 자리를 클릭/탭하면 대기 중인 새 건물을 그 자리에 배치한다.
  // 기존 건물이나 캐릭터의 현재 위치와 겹치면 빈 자리가 아니므로 무시한다.
  function handleMapClick(e: MouseEvent<HTMLDivElement>) {
    if (!pendingBuilding) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { width, height } = NEW_BUILDING_SIZE;
    const x = clamp(clickX - width / 2, 0, MAP_WIDTH - width);
    const y = clamp(clickY - height / 2, 0, MAP_HEIGHT - height);

    if (collidesWithBuildings(x, y, allBuildingsRef.current)) return;
    const current = positionRef.current;
    if (rectsOverlap(x, y, width, height, current.x, current.y, CHAR_SIZE, CHAR_SIZE)) {
      return;
    }

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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.title}>ことばのまち — 마을 지도</div>
        <div className={styles.headerLinks}>
          <Link href="/theme-learning" className={styles.navLink}>
            학습하기
          </Link>
          <Link href="/words" className={styles.navLink}>
            학습 단어 목록
          </Link>
          <Link href="/villagers" className={styles.navLink}>
            주민 목록
          </Link>
          <AuthStatus className={styles.navLink} />
        </div>
      </header>

      <main
        className={styles.mapWrapper}
        style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
      >
        <div
          className={
            pendingBuilding ? `${styles.map} ${styles.placementMode}` : styles.map
          }
          style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
          onClick={handleMapClick}
        >
          <div
            className={styles.path}
            style={{ left: 0, top: MAP_HEIGHT / 2 - 30, width: MAP_WIDTH, height: 60 }}
          />
          <div
            className={styles.path}
            style={{ left: MAP_WIDTH / 2 - 30, top: 0, width: 60, height: MAP_HEIGHT }}
          />

          {allBuildings.map((b) => (
            <BuildingMarker
              key={b.id}
              building={b}
              isNear={nearBuildingId === b.id}
              isConstructing={justPlacedId === b.id}
            />
          ))}

          <div
            className={styles.character}
            style={{ left: position.x, top: position.y, width: CHAR_SIZE, height: CHAR_SIZE }}
          >
            🧑
          </div>
        </div>
      </main>

      {pendingBuilding ? (
        <p className={styles.interactionBanner}>
          빈 자리를 클릭/탭해서 &quot;{pendingBuilding.themeTitle}&quot; 건물을 지어보세요!
        </p>
      ) : nearBuildingId ? (
        <p className={styles.interactionBanner}>Enter 또는 Space로 대화하기</p>
      ) : (
        <p className={styles.hint}>방향키 또는 WASD로 캐릭터를 움직여보세요.</p>
      )}

      {activeChatBuildingId && (
        <div className={styles.chatOverlay}>
          <ChatPanel
            villagerId={
              allBuildings.find((b) => b.id === activeChatBuildingId)?.residentId ??
              activeChatBuildingId
            }
            onClose={() => setActiveChatBuildingId(null)}
          />
        </div>
      )}
    </div>
  );
}
