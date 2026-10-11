import type { Furniture, Room } from "../../interiors";
import { CHAR_SIZE } from "@/lib/walk";
import { FLOOR_SLAB, ROOM_K, ROOM_SCALE as S, WALL_Z, darken, lighten, mix, type RoomIso } from "../../roomIso";
import { pts } from "../../iso";

// 건물 내부 방 그림 (아이소메트릭 파스텔 미니어처): 바닥 + 두 면의 벽 + 가구 블록 + 주민/캐릭터.
// 방 데이터(Furniture/Room)는 그대로 쓰고, 눈에 보이는 모양만 만든다. 이미지 파일 없이 SVG만 쓴다.

// 가구 종류별 높이(화면 px). id로 대충 구분하고, 모르면 기본값.
function heightOf(f: Furniture): number {
  const id = f.id;
  const h = id.startsWith("shelf") ? 86 : id.startsWith("counter") ? 42 : id.startsWith("register") ? 38 : id.startsWith("display") ? 46 : id.startsWith("desk") ? 30 : id === "meeting" ? 30 : id === "plant" ? 22 : id === "bed" ? 26 : id === "chair" ? 24 : id.startsWith("table") ? 30 : 30;
  return h * (S / 1.4);
}

type Item = { depth: number; key: string; node: React.ReactNode };

export default function RoomScene({
  room,
  iso,
  furniture,
  selectedId,
  ghost,
  residentRect,
  residentEmoji,
  position,
}: {
  room: Room;
  iso: RoomIso;
  furniture: Furniture[];
  selectedId: string | null;
  ghost: { x: number; y: number; width: number; height: number; round: boolean; bad: boolean } | null;
  residentRect: { x: number; y: number } | null;
  residentEmoji: string | null;
  position: { x: number; y: number };
}) {
  const { project: P } = iso;
  const W = room.width;
  const H = room.height;
  const wh = room.wallHeight;
  const wallC = mix(room.wallColor, "#fff4e4", 0.55);
  const wallL = darken(wallC, 0.08);
  const floorC = mix(room.floorColor, "#fff4e4", 0.35);
  const quad = (a: [number, number], b: [number, number], c: [number, number], d: [number, number], fill: string, key?: string | number) => (
    <polygon key={key} points={pts([a, b, c, d])} fill={fill} />
  );

  // ── 바닥 ──
  const floor = (
    <g>
      {quad(P(0, H, 0), P(W, H, 0), P(W, H, -FLOOR_SLAB), P(0, H, -FLOOR_SLAB), "#d9bd96")}
      {quad(P(W, wh, 0), P(W, H, 0), P(W, H, -FLOOR_SLAB), P(W, wh, -FLOOR_SLAB), "#c4a47c")}
      {quad(P(0, wh), P(W, wh), P(W, H), P(0, H), floorC)}
      {/* 마루 무늬: x 방향 널판 + 엇갈린 이음매 */}
      {Array.from({ length: Math.floor((H - wh) / 40) }, (_, i) => {
        const y = wh + (i + 1) * 40;
        return <polyline key={i} points={pts([P(0, y), P(W, y)])} stroke="rgba(120,80,40,0.1)" strokeWidth={1.6} fill="none" />;
      })}
      {Array.from({ length: Math.floor((H - wh) / 40) }, (_, i) =>
        Array.from({ length: 3 }, (_, j) => {
          const y0 = wh + i * 40;
          const x = ((i * 97 + j * 211) % W) + 30;
          return <polyline key={`${i}-${j}`} points={pts([P(x, y0), P(x, y0 + 40)])} stroke="rgba(120,80,40,0.08)" strokeWidth={1.4} fill="none" />;
        })
      )}
      {/* 문 앞 깔개 */}
      {quad(P(room.door.x + 6, H - 70), P(room.door.x + room.door.width - 6, H - 70), P(room.door.x + room.door.width - 6, H), P(room.door.x + 6, H), "#ecc9a2")}
      {quad(P(room.door.x + 12, H - 62), P(room.door.x + room.door.width - 12, H - 62), P(room.door.x + room.door.width - 12, H - 6), P(room.door.x + 12, H - 6), "#f6dcc0")}
    </g>
  );

  // ── 벽: 안쪽 오른쪽(y = wh)과 안쪽 왼쪽(x = 0) ──
  const wz = WALL_Z;
  const matrix = (x: number, y: number, z: number) => {
    const [e, f] = P(x, y, z);
    return `matrix(${ROOM_K} ${ROOM_K / 2} 0 ${S} ${e} ${f})`;
  };
  const wallMounted = furniture.filter((f) => f.y + f.height <= wh);
  const walls = (
    <g>
      {quad(P(0, wh, 0), P(W, wh, 0), P(W, wh, wz), P(0, wh, wz), wallC)}
      {quad(P(0, wh, 0), P(0, H, 0), P(0, H, wz), P(0, wh, wz), wallL)}
      {quad(P(0, wh, 0), P(W, wh, 0), P(W, wh, 12), P(0, wh, 12), "rgba(90,60,40,0.12)")}
      {quad(P(0, wh, 0), P(0, H, 0), P(0, H, 12), P(0, wh, 12), "rgba(90,60,40,0.16)")}
      {quad(P(0, wh, wz - 10), P(W, wh, wz - 10), P(W, wh, wz), P(0, wh, wz), "rgba(255,255,255,0.45)")}
      {quad(P(0, wh, wz - 10), P(0, H, wz - 10), P(0, H, wz), P(0, wh, wz), "rgba(255,255,255,0.3)")}
      {/* 벽 윗면 두께 */}
      {quad(P(-8, wh - 8, wz), P(W, wh - 8, wz), P(W, wh, wz), P(-8, wh, wz), "#fff7ea")}
      {quad(P(-8, wh - 8, wz), P(-8, H, wz), P(0, H, wz), P(0, wh - 8, wz), "#f1e3cf")}
      {/* 안쪽 오른쪽 벽의 창 두 개 */}
      {[0.2, 0.62].map((u, i) => {
        const x0 = W * u;
        const x1 = x0 + 90;
        return (
          <g key={i}>
            {quad(P(x0 - 6, wh, 60), P(x1 + 6, wh, 60), P(x1 + 6, wh, 128), P(x0 - 6, wh, 128), "#fffaf0")}
            {quad(P(x0, wh, 66), P(x1, wh, 66), P(x1, wh, 122), P(x0, wh, 122), "#cfe8f0")}
            {quad(P(x0, wh, 66), P(x1, wh, 66), P(x1, wh, 80), P(x0, wh, 80), "#e6f4f8")}
            {quad(P((x0 + x1) / 2 - 2, wh, 66), P((x0 + x1) / 2 + 2, wh, 66), P((x0 + x1) / 2 + 2, wh, 122), P((x0 + x1) / 2 - 2, wh, 122), "#fffaf0")}
            {quad(P(x0 - 10, wh, 56), P(x1 + 10, wh, 56), P(x1 + 10, wh, 62), P(x0 - 10, wh, 62), "#e0b88a")}
          </g>
        );
      })}
      {/* 안쪽 왼쪽 벽의 액자 */}
      {(() => {
        const y0 = wh + (H - wh) * 0.34;
        const y1 = y0 + 64;
        return (
          <g>
            {[ [P(0, y0, 70), P(0, y1, 70), P(0, y1, 126), P(0, y0, 126)] ].map((q, i) => (
              <g key={i}>
                <polygon points={pts(q as [number, number][])} fill="#e0b88a" />
                <polygon points={pts([P(0, y0 + 5, 75), P(0, y1 - 5, 75), P(0, y1 - 5, 121), P(0, y0 + 5, 121)])} fill="#f6dcc0" />
                <polygon points={pts([P(0, y0 + 14, 82), P(0, y1 - 14, 82), P(0, y1 - 14, 100), P(0, y0 + 14, 100)])} fill="#cfe3b6" />
              </g>
            ))}
          </g>
        );
      })()}
      {/* 벽에 붙은 가구(칠판 등) */}
      {wallMounted.map((f) => (
        <g key={f.id}>
          {quad(P(f.x - 6, wh, 52), P(f.x + f.width + 6, wh, 52), P(f.x + f.width + 6, wh, 128), P(f.x - 6, wh, 128), "#c9a47c")}
          {quad(P(f.x, wh, 58), P(f.x + f.width, wh, 58), P(f.x + f.width, wh, 122), P(f.x, wh, 122), f.color)}
          {f.emoji && (
            <text transform={matrix(f.x + f.width / 2, wh, 90)} textAnchor="middle" fontSize={26}>
              {f.emoji}
            </text>
          )}
        </g>
      ))}
    </g>
  );

  // ── 가구 ──
  const furnitureItem = (f: Furniture): Item => {
    const Hh = heightOf(f);
    const selected = f.id === selectedId;
    const top = lighten(f.color, 0.2);
    const left = f.color;
    const right = darken(f.color, 0.16);
    const depth = f.x + f.width + f.y + f.height;
    let node: React.ReactNode;
    if (f.shape === "round") {
      const r = f.width / 2;
      const cx = f.x + r;
      const cy = f.y + r;
      const [tx, ty] = P(cx, cy, Hh);
      const [bx, by] = P(cx, cy, 0);
      const rx = r * ROOM_K * 1.414;
      const ry = r * ROOM_K * 0.707;
      node = (
        <g>
          <ellipse cx={bx + 6} cy={by + 4} rx={rx * 1.1} ry={ry * 1.15} fill="rgba(80,60,40,0.16)" />
          <path d={`M${tx - rx} ${ty}V${by}A${rx} ${ry} 0 0 0 ${tx + rx} ${by}V${ty}Z`} fill={left} />
          <path d={`M${tx} ${ty + ry}V${by + ry}A${rx} ${ry} 0 0 0 ${tx + rx} ${by}V${ty}Z`} fill={right} opacity={0.7} />
          <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill={top} />
          {f.emoji && (
            <text x={tx} y={ty - 6} textAnchor="middle" fontSize={26}>
              {f.emoji}
            </text>
          )}
          {selected && <ellipse cx={bx} cy={by} rx={rx + 4} ry={ry + 3} fill="none" stroke="#f2b84b" strokeWidth={3} />}
        </g>
      );
    } else {
      const x0 = f.x;
      const y0 = f.y;
      const x1 = f.x + f.width;
      const y1 = f.y + f.height;
      const [cx, cy] = P((x0 + x1) / 2, (y0 + y1) / 2, 0);
      const tall = f.id.startsWith("shelf");
      node = (
        <g>
          <ellipse cx={cx + 8} cy={cy + 4} rx={(f.width + f.height) * ROOM_K * 0.36} ry={(f.width + f.height) * ROOM_K * 0.17} fill="rgba(80,60,40,0.12)" />
          {quad(P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, Hh), P(x0, y1, Hh), left)}
          {quad(P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, Hh), P(x1, y0, Hh), right)}
          {quad(P(x0, y0, Hh), P(x1, y0, Hh), P(x1, y1, Hh), P(x0, y1, Hh), top)}
          {tall &&
            [0.28, 0.52, 0.76].map((t, i) => (
              <g key={i}>
                {quad(P(x0 + 4, y1, Hh * t), P(x1 - 4, y1, Hh * t), P(x1 - 4, y1, Hh * t + 4), P(x0 + 4, y1, Hh * t + 4), darken(f.color, 0.3))}
                {[0.12, 0.3, 0.5, 0.68, 0.84].map((u, j) => quad(P(x0 + (x1 - x0) * u, y1, Hh * t + 4), P(x0 + (x1 - x0) * u + 9, y1, Hh * t + 4), P(x0 + (x1 - x0) * u + 9, y1, Hh * t + 16 + (j % 2) * 5), P(x0 + (x1 - x0) * u, y1, Hh * t + 16 + (j % 2) * 5), ["#e3a3a6", "#9ec0c6", "#f3dc9c", "#a9ca97", "#b9aec9"][(i + j) % 5], `${i}-${j}`))}
              </g>
            ))}
          {f.emoji && (() => {
            const [ex, ey] = P((x0 + x1) / 2, (y0 + y1) / 2, Hh);
            return (
              <text x={ex} y={ey - 4} textAnchor="middle" fontSize={26}>
                {f.emoji}
              </text>
            );
          })()}
          {selected && <polygon points={pts([P(x0 - 2, y0 - 2), P(x1 + 2, y0 - 2), P(x1 + 2, y1 + 2), P(x0 - 2, y1 + 2)])} fill="none" stroke="#f2b84b" strokeWidth={3} />}
        </g>
      );
    }
    return { depth, key: `f-${f.id}`, node };
  };

  const items: Item[] = furniture.filter((f) => f.y + f.height > wh).map(furnitureItem);

  if (residentRect && residentEmoji) {
    const [rx, ry] = P(residentRect.x + CHAR_SIZE / 2, residentRect.y + CHAR_SIZE / 2, 0);
    items.push({
      depth: residentRect.x + residentRect.y + CHAR_SIZE,
      key: "resident",
      node: (
        <g>
          <ellipse cx={rx} cy={ry} rx={17} ry={6.5} fill="rgba(60,50,40,0.28)" />
          <text x={rx} y={ry - 4} textAnchor="middle" fontSize={38}>
            {residentEmoji}
          </text>
        </g>
      ),
    });
  }
  const [cx, cy] = P(position.x + CHAR_SIZE / 2, position.y + CHAR_SIZE / 2, 0);
  items.push({
    depth: position.x + position.y + CHAR_SIZE,
    key: "player",
    node: (
      <g>
        <ellipse cx={cx} cy={cy} rx={17} ry={6.5} fill="rgba(60,50,40,0.28)" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={38}>
          🧑
        </text>
      </g>
    ),
  });
  items.sort((a, b) => a.depth - b.depth);

  return (
    <g>
      {floor}
      {walls}
      {ghost &&
        (ghost.round ? (
          (() => {
            const r = ghost.width / 2;
            const [gx, gy] = P(ghost.x + r, ghost.y + r);
            return <ellipse cx={gx} cy={gy} rx={r * ROOM_K * 1.414} ry={r * ROOM_K * 0.707} fill={ghost.bad ? "rgba(220,80,80,0.5)" : "rgba(80,200,120,0.5)"} stroke={ghost.bad ? "#c0392b" : "#2e9e5b"} strokeWidth={2.5} strokeDasharray="6 4" />;
          })()
        ) : (
          <polygon points={pts([P(ghost.x, ghost.y), P(ghost.x + ghost.width, ghost.y), P(ghost.x + ghost.width, ghost.y + ghost.height), P(ghost.x, ghost.y + ghost.height)])} fill={ghost.bad ? "rgba(220,80,80,0.5)" : "rgba(80,200,120,0.5)"} stroke={ghost.bad ? "#c0392b" : "#2e9e5b"} strokeWidth={2.5} strokeDasharray="6 4" />
        ))}
      {items.map((it) => (
        <g key={it.key}>{it.node}</g>
      ))}
    </g>
  );
}
