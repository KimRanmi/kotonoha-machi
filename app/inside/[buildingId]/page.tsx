"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import ChatPanel from "@/components/ChatPanel";
import townStyles from "../../town.module.css";
import styles from "./room.module.css";
import { BUILDINGS, withThemeResident, type Building, type PlacedBuilding } from "../../buildings";
import { getRoomObstacles, getRoomTemplate, type Room } from "../../interiors";
import { CHAR_SIZE, isNearRect, rectsOverlap, useWalker } from "@/lib/walk";
import { getVillager } from "@/lib/villager";
import {
  loadFromStorage,
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
    const found = [...BUILDINGS, ...placed].find((b) => b.id === buildingId) ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ building: found });
  }, [buildingId]);

  if (!state) return <div className={townStyles.page} />;
  if (!state.building) {
    return (
      <div className={townStyles.page}>
        <p className={townStyles.interactionBanner}>찾을 수 없는 건물입니다.</p>
        <Link href="/" className={townStyles.navLink}>
          마을로 돌아가기
        </Link>
      </div>
    );
  }
  return <RoomView building={state.building} />;
}

function RoomView({ building }: { building: Building }) {
  const router = useRouter();
  const room: Room = useMemo(() => getRoomTemplate(building), [building]);

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
  const { position } = useWalker({
    width: room.width,
    height: room.height,
    obstacles,
    initial: room.spawn,
    paused: chatOpen,
  });

  const isNearResident =
    !!resident && isNearRect(position.x, position.y, residentRect, INTERACTION_MARGIN);
  const nearResidentRef = useRef(false);
  const chatOpenRef = useRef(false);
  const leavingRef = useRef(false);

  useEffect(() => {
    nearResidentRef.current = isNearResident;
  }, [isNearResident]);
  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

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
        leave();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={townStyles.page}>
      <header className={townStyles.header}>
        <div className={townStyles.title}>ことばのまち — {building.label} 내부</div>
        <div className={townStyles.headerLinks}>
          <button type="button" className={townStyles.navLink} onClick={leave}>
            나가기 (Esc)
          </button>
          <AuthStatus className={townStyles.navLink} />
        </div>
      </header>

      <main className={townStyles.mapWrapper} style={{ width: room.width, height: room.height }}>
        <div
          className={styles.room}
          style={{ width: room.width, height: room.height, background: room.floorColor }}
        >
          <div
            className={styles.wall}
            style={{ height: room.wallHeight, background: room.wallColor }}
          />
          <div
            className={styles.door}
            style={{ left: room.door.x, top: room.door.y, width: room.door.width, height: room.door.height }}
          >
            문
          </div>

          {room.furniture.map((f) => (
            <div
              key={f.id}
              className={styles.furniture}
              title={f.label}
              style={{
                left: f.x,
                top: f.y,
                width: f.width,
                height: f.height,
                background: f.color,
                borderRadius: f.shape === "round" ? "50%" : 4,
              }}
            >
              {f.emoji}
            </div>
          ))}

          {resident && (
            <div
              className={styles.resident}
              style={{ left: residentRect.x, top: residentRect.y, width: CHAR_SIZE, height: CHAR_SIZE }}
            >
              {isNearResident && <div className={townStyles.interactionHint}>💬</div>}
              <span>{resident.avatar}</span>
              <div className={styles.nameTag}>{resident.name}</div>
            </div>
          )}

          <div
            className={townStyles.character}
            style={{ left: position.x, top: position.y, width: CHAR_SIZE, height: CHAR_SIZE }}
          >
            🧑
          </div>
        </div>
      </main>

      {isNearResident ? (
        <p className={townStyles.interactionBanner}>Enter 또는 Space로 대화하기</p>
      ) : (
        <p className={townStyles.hint}>
          방향키 또는 WASD로 걸어 다니세요. 아래쪽 문으로 가거나 Esc를 누르면 나갑니다.
          {!resident && " (이 건물에는 아직 주민이 없어요.)"}
        </p>
      )}

      {chatOpen && residentId && (
        <div className={townStyles.chatOverlay}>
          <ChatPanel villagerId={residentId} onClose={() => setChatOpen(false)} />
        </div>
      )}
    </div>
  );
}
