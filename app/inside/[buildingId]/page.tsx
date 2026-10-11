"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import ChatPanel from "@/components/ChatPanel";
import townStyles from "../../town.module.css";
import styles from "./room.module.css";
import dynamic from "next/dynamic";
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

// 3D 방은 건물 안 화면에서만 필요하므로 따로 내려받는다(마을 등 다른 화면 로딩에는 영향이 없다).
const RoomCanvas = dynamic(() => import("./room3d/RoomCanvas"), { ssr: false });

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

  const residentId = building.residentId ?? (building.hasResident ? building.id : null);
  const resident = residentId ? getVillager(residentId) : null;
  const residentRect = useMemo(
    () => ({ ...room.residentSpot, width: CHAR_SIZE, height: CHAR_SIZE }),
    [room]
  );

  // 벽·가구에 주민이 서 있는 자리를 더해, 주민도 통과할 수 없게 한다.
  // 방 안의 다른 사람들(직원·손님 등)도 통과할 수 없다.
  const npcRects = useMemo(() => room.npcs.map((n) => ({ x: n.x, y: n.y, width: CHAR_SIZE, height: CHAR_SIZE })), [room]);
  const obstacles = useMemo(
    () => [...getRoomObstacles(room), ...(resident ? [residentRect] : []), ...npcRects],
    [room, resident, residentRect, npcRects]
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

  // 3D 방에서 바닥을 클릭한 지점(방의 평면 좌표)으로 가구를 선택/이동한다.
  function handleRoomClick(pt: { x: number; y: number }) {
    if (!decorating || !homeFurniture) return;
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

  const ghostRect = decorating && selectedItem && hover ? targetRect(selectedItem, hover) : null;

  return (
    <div className={`${townStyles.townRoot} ${styles.roomRoot}`}>
      <div className={townStyles.viewport}>
        <RoomCanvas
          room={room}
          furniture={room.furniture}
          selectedId={selected}
          ghost={ghostRect ? { ...ghostRect, round: selectedItem?.shape === "round", bad: !!hoverFailure } : null}
          position={position}
          residentRect={resident ? residentRect : null}
          residentId={resident ? residentId : null}
          residentName={resident ? resident.name : null}
          nearResident={isNearResident}
          decorating={decorating}
          onFloorPoint={(pt, type) => (type === "click" ? pt && handleRoomClick(pt) : setHover(pt))}
        />
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
