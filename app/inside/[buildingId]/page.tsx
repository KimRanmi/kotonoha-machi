"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import ChatPanel from "@/components/ChatPanel";
import townStyles from "../../town.module.css";
import styles from "./room.module.css";
import RoomScene from "./RoomScene";
import { makeRoomIso } from "../../roomIso";
import { BUILDINGS, withThemeResident, type Building, type PlacedBuilding } from "../../buildings";
import { getRoomObstacles, getRoomTemplate, type Furniture, type Room } from "../../interiors";
import {
  PLACE_FAILURE_MESSAGE,
  checkFurniturePlacement,
  defaultHomeFurniture,
  makeHomeBuilding,
} from "../../home";
import { CHAR_SIZE, isNearRect, rectsOverlap, useWalker } from "@/lib/walk";
import { getVillager } from "@/lib/villager";
import {
  loadFromStorage,
  loadHomeFurniture,
  loadHomePosition,
  saveHomeFurniture,
  setTownReturnBuilding,
  PLACED_BUILDINGS_STORAGE_KEY,
} from "@/lib/storage";

const INTERACTION_MARGIN = 28; // 주민 테두리 밖으로 이 거리 안에 들어오면 "대화 가능"

// 건물 내부 화면. 테마로 지은 건물은 localStorage에 있으므로 마운트 후에 건물을 찾는다.
export default function InsidePage() {
  const params = useParams<{ buildingId: string }>();
  const buildingId = decodeURIComponent(params.buildingId);
  const [state, setState] = useState<{ building: Building | null } | null>(null);

  useEffect(() => {
    const placed = loadFromStorage<PlacedBuilding[]>(PLACED_BUILDINGS_STORAGE_KEY, []).map(
      withThemeResident
    );
    const home = loadHomePosition();
    const found = [...BUILDINGS, ...(home ? [makeHomeBuilding(home)] : []), ...placed].find((b) => b.id === buildingId) ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ building: found });
  }, [buildingId]);

  if (!state) return <div className={townStyles.page} />;
  if (!state.building) {
    return (
      <div className={townStyles.page}>
        <p className={townStyles.interactionBanner}>찾을 수 없는 건물입니다.</p>
        <Link href="/" className="pill">
          마을로 돌아가기
        </Link>
      </div>
    );
  }
  return <RoomView building={state.building} />;
}

function RoomView({ building }: { building: Building }) {
  const router = useRouter();
  const isHome = !!building.isHome;
  // 내 집의 가구는 저장소에서 읽는다(RoomView는 마운트 후에만 렌더되므로 lazy init으로 충분).
  const [homeFurniture, setHomeFurniture] = useState(() =>
    isHome ? (loadHomeFurniture() ?? defaultHomeFurniture()) : null
  );
  const room: Room = useMemo(() => {
    const template = getRoomTemplate(building);
    return homeFurniture ? { ...template, furniture: homeFurniture.placed } : template;
  }, [building, homeFurniture]);

  const iso = useMemo(() => makeRoomIso(room), [room]);

  const residentId = building.residentId ?? (building.hasResident ? building.id : null);
  const resident = residentId ? getVillager(residentId) : null;
  const residentRect = useMemo(
    () => ({ ...room.residentSpot, width: CHAR_SIZE, height: CHAR_SIZE }),
    [room]
  );

  // 벽·가구에 주민이 서 있는 자리를 더해, 주민도 통과할 수 없게 한다.
  const obstacles = useMemo(
    () => (resident ? [...getRoomObstacles(room), residentRect] : getRoomObstacles(room)),
    [room, resident, residentRect]
  );

  const [chatOpen, setChatOpen] = useState(false);
  // 꾸미기 모드(내 집만). 켜져 있으면 캐릭터 이동을 멈추고 클릭으로 가구를 옮긴다.
  const [decorating, setDecorating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [decorMessage, setDecorMessage] = useState<string | null>(null);
  const { position } = useWalker({
    width: room.width,
    height: room.height,
    obstacles,
    initial: room.spawn,
    paused: chatOpen || decorating,
  });

  const isNearResident =
    !!resident && isNearRect(position.x, position.y, residentRect, INTERACTION_MARGIN);
  const nearResidentRef = useRef(false);
  const chatOpenRef = useRef(false);
  const leavingRef = useRef(false);
  const decoratingRef = useRef(false);

  useEffect(() => {
    nearResidentRef.current = isNearResident;
  }, [isNearResident]);
  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);
  useEffect(() => {
    decoratingRef.current = decorating;
  }, [decorating]);

  function stopDecorating() {
    setDecorating(false);
    setSelected(null);
    setHover(null);
    setDecorMessage(null);
  }

  // 선택한 가구(방에 놓인 것 또는 목록의 것)의 크기. 없으면 null.
  const selectedItem: Furniture | null = homeFurniture
    ? ([...homeFurniture.placed, ...homeFurniture.stored].find((f) => f.id === selected) ?? null)
    : null;
  const selectedIsPlaced = !!homeFurniture?.placed.some((f) => f.id === selected);

  // 마우스 위치를 가구 중심으로 보고, 방 안쪽(벽 아래~바닥)으로 클램프한 좌상단 좌표.
  function targetRect(item: Furniture, pt: { x: number; y: number }) {
    return {
      x: Math.min(Math.max(pt.x - item.width / 2, 0), room.width - item.width),
      y: Math.min(Math.max(pt.y - item.height / 2, room.wallHeight), room.height - item.height),
      width: item.width,
      height: item.height,
    };
  }

  function commitFurniture(next: { placed: Furniture[]; stored: Furniture[] }) {
    setHomeFurniture(next);
    saveHomeFurniture(next);
  }

  // 화면(비스듬한 시점) 클릭 위치 -> 방의 평면 좌표. 무대가 화면에 맞게 축소돼 있으므로 배율로 나눈다.
  function roomPoint(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const scale = r.width / iso.stageWidth;
    return iso.unproject((e.clientX - r.left) / scale, (e.clientY - r.top) / scale);
  }

  function handleRoomClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!decorating || !homeFurniture) return;
    const pt = roomPoint(e);
    // 선택한 가구 말고 다른 가구를 클릭하면 그 가구를 선택한다.
    const hit = homeFurniture.placed.find(
      (f) =>
        f.id !== selected && pt.x >= f.x && pt.x <= f.x + f.width && pt.y >= f.y && pt.y <= f.y + f.height
    );
    if (hit) {
      setSelected(hit.id);
      setDecorMessage(null);
      return;
    }
    if (!selectedItem) return;
    const rect = targetRect(selectedItem, pt);
    const failure = checkFurniturePlacement(room, rect, homeFurniture.placed, position, selectedItem.id);
    if (failure) {
      setDecorMessage(PLACE_FAILURE_MESSAGE[failure]);
      return;
    }
    const moved: Furniture = { ...selectedItem, x: rect.x, y: rect.y };
    commitFurniture({
      placed: selectedIsPlaced
        ? homeFurniture.placed.map((f) => (f.id === moved.id ? moved : f))
        : [...homeFurniture.placed, moved],
      stored: homeFurniture.stored.filter((f) => f.id !== moved.id),
    });
    setDecorMessage(null);
    setSelected(null);
  }

  // 선택한 놓인 가구를 치워 목록으로 되돌린다.
  function storeSelected() {
    if (!homeFurniture || !selectedItem || !selectedIsPlaced) return;
    commitFurniture({
      placed: homeFurniture.placed.filter((f) => f.id !== selectedItem.id),
      stored: [...homeFurniture.stored, selectedItem],
    });
    setSelected(null);
    setDecorMessage(null);
  }

  const hoverFailure =
    decorating && homeFurniture && selectedItem && hover
      ? checkFurniturePlacement(room, targetRect(selectedItem, hover), homeFurniture.placed, position, selectedItem.id)
      : null;

  function leave() {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setTownReturnBuilding(building.id);
    router.push("/");
  }

  // 문 영역에 닿으면 나간다.
  useEffect(() => {
    const d = room.door;
    if (rectsOverlap(position.x, position.y, CHAR_SIZE, CHAR_SIZE, d.x, d.y, d.width, d.height)) {
      leave();
    }
    // leave는 매 렌더 새로 만들어지지만 ref로 중복 호출을 막으므로 position 변화에만 반응하면 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, room]);

  // Enter/Space: 주민 근처면 대화 시작. Escape: 방 나가기. 대화 중에는 모두 무시한다.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (chatOpenRef.current) return;
      const key = e.key.toLowerCase();
      if ((key === "enter" || key === " ") && nearResidentRef.current) {
        e.preventDefault();
        setChatOpen(true);
      } else if (key === "escape") {
        // 꾸미기 중 Esc는 방을 나가지 않고 꾸미기만 끈다.
        if (decoratingRef.current) stopDecorating();
        else leave();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 방 무대를 화면 가운데에 맞춰 놓는다(작은 화면에서는 축소).
  const [view, setView] = useState({ w: 1280, h: 800 });
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setView({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = Math.min(1.7, (view.w - 16) / iso.stageWidth, (view.h - 110) / iso.stageHeight);
  const stageLeft = (view.w - iso.stageWidth * fit) / 2;
  const stageTop = Math.max(52, (view.h - iso.stageHeight * fit) / 2 - 8);

  const ghostRect = decorating && selectedItem && hover ? targetRect(selectedItem, hover) : null;
  const [resPx, resPy] = resident ? iso.project(residentRect.x + CHAR_SIZE / 2, residentRect.y + CHAR_SIZE / 2, 0) : [0, 0];
  const [doorX, doorY] = iso.project(room.door.x + room.door.width / 2, room.height - 6, 0);

  return (
    <div className={`${townStyles.townRoot} ${styles.roomRoot}`}>
      <div ref={viewportRef} className={townStyles.viewport}>
        <div
          className={styles.stage}
          style={{
            width: iso.stageWidth,
            height: iso.stageHeight,
            transform: `translate(${stageLeft}px, ${stageTop}px) scale(${fit})`,
            cursor: decorating ? "crosshair" : undefined,
          }}
          onClick={handleRoomClick}
          onMouseMove={(e) => decorating && setHover(roomPoint(e))}
          onMouseLeave={() => setHover(null)}
        >
          <svg width={iso.stageWidth} height={iso.stageHeight} viewBox={`0 0 ${iso.stageWidth} ${iso.stageHeight}`} aria-hidden="true" className={townStyles.stageSvg}>
            <RoomScene
              room={room}
              iso={iso}
              furniture={room.furniture}
              selectedId={selected}
              ghost={ghostRect ? { ...ghostRect, round: selectedItem?.shape === "round", bad: !!hoverFailure } : null}
              residentRect={resident ? residentRect : null}
              residentEmoji={resident ? resident.avatar : null}
              position={position}
            />
          </svg>
          {resident && (
            <>
              <div className={styles.nameTag} style={{ left: resPx, top: resPy + 6 }}>
                {resident.name}
              </div>
              {isNearResident && (
                <div className={townStyles.interactionHint} style={{ left: resPx, top: resPy - 62 }}>
                  💬
                </div>
              )}
            </>
          )}
          <div className={styles.doorTag} style={{ left: doorX, top: doorY + 6 }}>
            문
          </div>
        </div>
        <div className={townStyles.vignette} />
      </div>

      <header className={townStyles.townHeader}>
        <div className={townStyles.title}>ことばのまち — {building.label} 내부</div>
        <div className={townStyles.headerLinks}>
          {isHome && (
            <button
              type="button"
              className="pill"
              onClick={() => (decorating ? stopDecorating() : setDecorating(true))}
            >
              {decorating ? "꾸미기 끝내기" : "꾸미기"}
            </button>
          )}
          <button type="button" className="pill" onClick={leave}>
            나가기 (Esc)
          </button>
          <AuthStatus className="pill" />
        </div>
      </header>

      <div className={townStyles.townFooter}>
        {decorating && homeFurniture ? (
        <div className={styles.decorPanel}>
          <p className={townStyles.interactionBanner}>
            {decorMessage ??
              (selectedItem
                ? `"${selectedItem.label ?? "가구"}": 놓을 자리를 클릭하세요.`
                : "옮기거나 치울 가구를 클릭하세요. (Esc: 꾸미기 끝내기)")}
          </p>
          <div className={styles.decorRow}>
            <button
              type="button"
              className={styles.decorButton}
              disabled={!selectedItem || !selectedIsPlaced}
              onClick={storeSelected}
            >
              선택한 가구 치우기
            </button>
            <span className={styles.decorLabel}>보관 중:</span>
            {homeFurniture.stored.length === 0 && <span className={styles.decorLabel}>없음</span>}
            {homeFurniture.stored.map((f) => (
              <button
                key={f.id}
                type="button"
                className={f.id === selected ? `${styles.decorButton} ${styles.decorActive}` : styles.decorButton}
                onClick={() => {
                  setSelected(f.id);
                  setDecorMessage(null);
                }}
              >
                {f.emoji ?? ""} {f.label ?? "가구"}
              </button>
            ))}
          </div>
        </div>
      ) : isNearResident ? (
        <p className={townStyles.interactionBanner}>Enter 또는 Space로 대화하기</p>
      ) : (
        <p className={townStyles.hint}>
          방향키 또는 WASD로 걸어 다니세요. 아래쪽 문으로 가거나 Esc를 누르면 나갑니다.
          {!resident && !isHome && " (이 건물에는 아직 주민이 없어요.)"}
        </p>
      )}
      </div>

      {chatOpen && residentId && (
        <div className={townStyles.chatOverlay}>
          <ChatPanel villagerId={residentId} onClose={() => setChatOpen(false)} />
        </div>
      )}
    </div>
  );
}
