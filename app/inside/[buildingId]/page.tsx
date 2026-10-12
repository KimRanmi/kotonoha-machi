"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import ChatPanel from "@/components/ChatPanel";
import townStyles from "../../town.module.css";
import styles from "./room.module.css";
import dynamic from "next/dynamic";
import { initialNpcStates, useRoomNpcs, type NpcState } from "./useRoomNpcs";
import { BUILDINGS, withThemeResident, type Building, type PlacedBuilding } from "../../buildings";
import { getRoomObstacles, getRoomTemplate, getSeats, type Furniture, type Room, type Seat } from "../../interiors";
import {
  PLACE_FAILURE_MESSAGE,
  checkFurniturePlacement,
  defaultHomeFurniture,
  makeHomeBuilding,
} from "../../home";
import { CHAR_SIZE, collidesWithRects, isNearRect, rectsOverlap, useWalker } from "@/lib/walk";
import { VILLAGERS, getVillager } from "@/lib/villager";
import { LINE_ACCEPT, LINE_BUSY, LINE_ENJOY, LINE_SERVE, ORDER_ITEMS, getOrderItem, type OrderItem } from "../../orders";
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
  // 방 안 사람들의 현재 위치(앉기/돌아다니기는 useRoomNpcs가 갱신한다)
  const [npcStates, setNpcStates] = useState<NpcState[]>(() => initialNpcStates(room));
  const npcRects = useMemo(() => npcStates.map((n) => ({ x: n.x, y: n.y, width: CHAR_SIZE, height: CHAR_SIZE })), [npcStates]);
  // 사람들이 피해 다닐 고정 장애물: 벽·가구·건물 담당 주민
  const staticObstacles = useMemo(
    () => [...getRoomObstacles(room), ...(resident ? [residentRect] : [])],
    [room, resident, residentRect]
  );
  const obstacles = useMemo(
    () => [...getRoomObstacles(room), ...(resident ? [residentRect] : []), ...npcRects],
    [room, resident, residentRect, npcRects]
  );

  // 대화 가능한 사람들: 건물 담당 주민 + 방 안의 직원·손님·학생(주민 목록에 등록된 사람). 가까이 가면 대화할 수 있다.
  const talkables = useMemo(() => {
    const list: { id: string; name: string; x: number; y: number }[] = [];
    if (resident && residentId) list.push({ id: residentId, name: resident.name, x: residentRect.x, y: residentRect.y });
    npcStates.forEach((n) => {
      const v = VILLAGERS[n.id];
      if (v) list.push({ id: n.id, name: v.name, x: n.x, y: n.y });
    });
    return list;
  }, [resident, residentId, residentRect, npcStates]);
  // 지금 대화 중인 주민 id (없으면 대화창 닫힘)
  const [chatWith, setChatWith] = useState<string | null>(null);
  const chatOpen = chatWith !== null;
  // 앉아 있는 자리(없으면 서 있음). 앉으면 이동이 멈추고, 이동 키를 누르거나 F로 일어난다.
  const [seated, setSeated] = useState<Seat | null>(null);
  // 꾸미기 모드(내 집만). 켜져 있으면 캐릭터 이동을 멈추고 클릭으로 가구를 옮긴다.
  const [decorating, setDecorating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [decorMessage, setDecorMessage] = useState<string | null>(null);
  const { position, positionRef, teleport } = useWalker({
    width: room.width,
    height: room.height,
    obstacles,
    initial: room.spawn,
    paused: chatOpen || decorating || !!seated,
  });

  // 가장 가까운 대화 가능한 사람
  const nearTalk =
    talkables
      .filter((t) => isNearRect(position.x, position.y, { x: t.x, y: t.y, width: CHAR_SIZE, height: CHAR_SIZE }, INTERACTION_MARGIN))
      .sort((a, b) => Math.hypot(a.x - position.x, a.y - position.y) - Math.hypot(b.x - position.x, b.y - position.y))[0] ?? null;
  const { serve } = useRoomNpcs({ room, staticObstacles, playerRef: positionRef, paused: decorating, talkingTo: chatWith, onStates: setNpcStates });

  // ── 앉기: 의자 가까이에서 F로 앉고, 앉은 채로 주문하면 음식이 테이블 위로 서빙된다 ──
  const seats = useMemo(() => getSeats(room), [room]);
  const seatedRef = useRef<Seat | null>(null);
  useEffect(() => {
    seatedRef.current = seated;
  }, [seated]);
  // 비어 있는 자리 중 가장 가까운 자리(다른 사람이 앉아 있거나 플레이어가 앉아 있으면 제외)
  const freeSeat = useMemo(() => {
    if (seated) return null;
    const cx = position.x + CHAR_SIZE / 2;
    const cy = position.y + CHAR_SIZE / 2;
    return (
      seats
        .filter((st) => !npcStates.some((n) => n.sitting && Math.hypot(n.x + CHAR_SIZE / 2 - st.x, n.y + CHAR_SIZE / 2 - st.y) < 24))
        .map((st) => ({ st, d: Math.hypot(st.x - cx, st.y - cy) }))
        .filter((o) => o.d < 58)
        .sort((a, b) => a.d - b.d)[0]?.st ?? null
    );
  }, [seats, npcStates, position, seated]);
  const freeSeatRef = useRef<Seat | null>(null);
  useEffect(() => {
    freeSeatRef.current = freeSeat;
  }, [freeSeat]);
  function sitDown(seat: Seat) {
    setSeated(seat);
    teleport({ x: seat.x - CHAR_SIZE / 2, y: seat.y - CHAR_SIZE / 2 });
  }
  function standUp() {
    const seat = seatedRef.current;
    if (!seat) return;
    // 테이블 반대쪽(등받이 쪽)으로 한 걸음 물러나 선다. 막히면 의자 자리에 그대로 선다.
    const ox = -Math.sin(seat.facing);
    const oy = -Math.cos(seat.facing);
    const spot = { x: seat.x + ox * 46 - CHAR_SIZE / 2, y: seat.y + oy * 46 - CHAR_SIZE / 2 };
    const blocked = collidesWithRects(spot.x, spot.y, obstacles) || spot.x < 0 || spot.y < room.wallHeight || spot.x > room.width - CHAR_SIZE || spot.y > room.height - CHAR_SIZE;
    teleport(blocked ? { x: seat.x - CHAR_SIZE / 2, y: seat.y - CHAR_SIZE / 2 } : spot);
    setSeated(null);
  }
  const sitRef = useRef({ sitDown, standUp });
  useEffect(() => {
    sitRef.current = { sitDown, standUp };
  });

  // ── 카페 주문: 주문하면 직원이 준비해서 플레이어 쪽으로 서빙해 주고, 받은 음식은 손에 들고 먹을 수 있다 ──
  const canOrder = room.id === "cafe";
  const SERVER_ID = "cafe-owner2";
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderBusy, setOrderBusy] = useState(false);
  const [held, setHeld] = useState<string | null>(null); // 플레이어가 들고 있는 품목 id
  const [tableItem, setTableItem] = useState<{ id: string; x: number; z: number } | null>(null); // 테이블 위에 놓인 음식
  const [speech, setSpeech] = useState<{ who: string; ja: string; ko: string } | null>(null);
  const speechTimer = useRef<number | null>(null);
  const heldRef = useRef<string | null>(null);
  useEffect(() => {
    heldRef.current = held;
  }, [held]);
  function say(who: string, line: { ja: string; ko: string }, ms = 4500) {
    setSpeech({ who, ...line });
    if (speechTimer.current !== null) window.clearTimeout(speechTimer.current);
    speechTimer.current = window.setTimeout(() => setSpeech(null), ms);
  }
  const serverName = VILLAGERS[SERVER_ID]?.name ?? "직원";
  function placeOrder(item: OrderItem) {
    setOrderOpen(false);
    if (orderBusy || held || tableItem) {
      say(serverName, LINE_BUSY);
      return;
    }
    const counter = room.furniture.find((f) => f.id === "counter");
    const showcase = room.furniture.find((f) => f.id === "showcase");
    const y = room.wallHeight + 4;
    const station =
      item.station === "showcase" && showcase
        ? { x: showcase.x + showcase.width / 2 - CHAR_SIZE / 2, y }
        : { x: (counter?.x ?? 60) + 28, y };
    const ok = serve(SERVER_ID, item.id, {
      station,
      prepareSeconds: 3,
      onHandover: () => {
        const seat = seatedRef.current;
        if (seat?.table) {
          // 앉아 있으면 내 앞 테이블 위에 놓아 준다
          const dx = seat.x - seat.table.x;
          const dy = seat.y - seat.table.y;
          const len = Math.hypot(dx, dy) || 1;
          setTableItem({ id: item.id, x: seat.table.x + (dx / len) * seat.table.r * 0.45, z: seat.table.y + (dy / len) * seat.table.r * 0.45 });
        } else {
          setHeld(item.id);
        }
        say(serverName, LINE_SERVE, 5000);
      },
      onDone: () => setOrderBusy(false),
    });
    if (!ok) {
      say(serverName, LINE_BUSY);
      return;
    }
    setOrderBusy(true);
    say(serverName, LINE_ACCEPT, 5000);
  }
  // 먹을 수 있는 음식: 손에 든 것, 또는 (앉아 있거나 가까이 있는) 테이블 위의 것
  const nearTableItem =
    tableItem && (seated || Math.hypot(position.x + CHAR_SIZE / 2 - tableItem.x, position.y + CHAR_SIZE / 2 - tableItem.z) < 90);
  const eatableId = held ?? (tableItem && nearTableItem ? tableItem.id : null);
  const eatableRef = useRef<string | null>(null);
  useEffect(() => {
    eatableRef.current = eatableId;
  }, [eatableId]);
  function eatHeld() {
    const id = heldRef.current ?? eatableRef.current;
    const item = id ? getOrderItem(id) : null;
    if (!item) return;
    if (heldRef.current) setHeld(null);
    else setTableItem(null);
    say("나", LINE_ENJOY[item.verb], 4500);
  }
  const eatRef = useRef(eatHeld);
  useEffect(() => {
    eatRef.current = eatHeld;
  });
  const nearTalkRef = useRef<string | null>(null);
  const chatOpenRef = useRef(false);
  const leavingRef = useRef(false);
  const decoratingRef = useRef(false);

  useEffect(() => {
    nearTalkRef.current = nearTalk?.id ?? null;
  }, [nearTalk?.id]);
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
      if ((key === "enter" || key === " ") && nearTalkRef.current) {
        e.preventDefault();
        setChatWith(nearTalkRef.current);
      } else if (key === "e" && eatableRef.current) {
        e.preventDefault();
        eatRef.current();
      } else if (key === "f") {
        // 앉기/일어나기
        e.preventDefault();
        if (seatedRef.current) sitRef.current.standUp();
        else if (freeSeatRef.current) sitRef.current.sitDown(freeSeatRef.current);
      } else if (seatedRef.current && ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        // 앉은 채로 이동 키를 누르면 일어난다
        e.preventDefault();
        sitRef.current.standUp();
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
          npcStates={npcStates}
          playerCarry={held}
          playerSeat={seated ? { x: seated.x, y: seated.y, facing: seated.facing } : null}
          tableItem={tableItem}
          npcNames={Object.fromEntries(room.npcs.filter((n) => VILLAGERS[n.id]).map((n) => [n.id, VILLAGERS[n.id].name]))}
          hintAt={nearTalk ? { x: nearTalk.x + CHAR_SIZE / 2, z: nearTalk.y + CHAR_SIZE / 2 } : null}
          decorating={decorating}
          onFloorPoint={(pt, type) => (type === "click" ? pt && handleRoomClick(pt) : setHover(pt))}
        />
        <div className={townStyles.vignette} />
      </div>

      <header className={townStyles.townHeader}>
        <div className={townStyles.title}>ことばのまち — {building.label} 내부</div>
        <div className={townStyles.headerLinks}>
          {seated ? (
            <button type="button" className="pill" onClick={standUp}>
              일어나기 (F)
            </button>
          ) : freeSeat ? (
            <button type="button" className="pill pillPrimary" onClick={() => sitDown(freeSeat)}>
              앉기 (F)
            </button>
          ) : null}
          {canOrder && (
            <button type="button" className="pill pillPrimary" onClick={() => setOrderOpen(true)} disabled={chatOpen}>
              주문하기
            </button>
          )}
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
        {speech ? (
          <div className={styles.speech}>
            <div className={styles.speechWho}>{speech.who}</div>
            <div className={styles.speechJa}>{speech.ja}</div>
            <div className={styles.speechKo}>{speech.ko}</div>
            {eatableId && (
              <button type="button" className="pill pillPrimary" onClick={eatHeld}>
                {getOrderItem(eatableId)?.verb === "drink" ? "마시기 (E)" : "먹기 (E)"}
              </button>
            )}
          </div>
        ) : eatableId ? (
          <p className={townStyles.interactionBanner}>
            {getOrderItem(eatableId)?.emoji} {getOrderItem(eatableId)?.ja}{held ? "を持っています" : "が届いています"} ·{" "}
            <button type="button" className="pill pillPrimary" onClick={eatHeld}>
              {getOrderItem(eatableId)?.verb === "drink" ? "마시기 (E)" : "먹기 (E)"}
            </button>
          </p>
        ) : decorating && homeFurniture ? (
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
      ) : nearTalk ? (
        <p className={townStyles.interactionBanner}>Enter 또는 Space로 {nearTalk.name}와 대화하기</p>
      ) : (
        <p className={townStyles.hint}>
          방향키 또는 WASD로 걸어 다니세요. 아래쪽 문으로 가거나 Esc를 누르면 나갑니다.
          {!resident && !isHome && " (이 건물에는 아직 주민이 없어요.)"}
        </p>
      )}
      </div>

      {orderOpen && (
        <div className={townStyles.chatOverlay} onClick={() => setOrderOpen(false)}>
          <div className={styles.orderPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.orderHead}>
              <div>
                <div className={styles.orderTitle}>メニュー · 메뉴</div>
                <div className={styles.orderSub}>일본어로 주문해 보세요. 선택하면 직원이 준비해서 가져다줘요.</div>
              </div>
              <button type="button" className="closeButton" onClick={() => setOrderOpen(false)} aria-label="닫기">
                ✕
              </button>
            </div>
            <ul className={styles.orderList}>
              {ORDER_ITEMS.map((it) => (
                <li key={it.id}>
                  <button type="button" className={styles.orderItem} onClick={() => placeOrder(it)}>
                    <span className={styles.orderEmoji}>{it.emoji}</span>
                    <span className={styles.orderText}>
                      <span className={styles.orderJa}>{it.ja}</span>
                      <span className={styles.orderKo}>{it.ko}</span>
                      <span className={styles.orderPhrase}>「{it.phrase}」</span>
                      <span className={styles.orderPhraseKo}>{it.phraseKo}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {chatWith && (
        <div className={townStyles.chatOverlay}>
          <ChatPanel villagerId={chatWith} onClose={() => setChatWith(null)} />
        </div>
      )}
    </div>
  );
}
