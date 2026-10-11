import type { Furniture, Room } from "../../interiors";
import { CHAR_SIZE } from "@/lib/walk";
import { FLOOR_SLAB, ROOM_K, WALL_Z, darken, lighten, mix, type RoomIso } from "../../roomIso";
import { pts, type P2 } from "../../iso";

// 건물 내부 방 그림 (실제 방처럼): 마을과 같은 비스듬한 시점에서, 가구를 단색 상자가 아니라
// 다리·상판·서랍·소품이 있는 진짜 가구처럼 여러 부품으로 조립해 그린다. 마루 결, 창에서 들어오는 빛,
// 커튼·걸레받이·몰딩, 바닥 그림자로 질감과 깊이를 준다. 방 데이터(Furniture/Room)는 그대로 쓰고
// 눈에 보이는 모양만 만든다. 이미지 파일은 쓰지 않고 SVG만 쓴다.

type Part = { key: string; depth: number; z: number; node: React.ReactNode };
type Tone = { t: string; l: string; r: string };

const woodTone = (base: string, k = 0): Tone => ({ t: lighten(base, 0.2 + k), l: base, r: darken(base, 0.17) });
const WOOD = "#a9784a";
const LINE = "rgba(40,25,15,0.16)";

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
  const K = ROOM_K;
  const kind = room.id;

  const wallC = mix(room.wallColor, "#f7efe0", 0.62);
  const wallL = darken(wallC, 0.09);
  const wains = mix(room.wallColor, "#8a6a50", 0.35);
  const floorC = mix(room.floorColor, "#c9a374", 0.45);

  const q = (a: P2, b: P2, c: P2, d: P2, fill: string, key?: string | number, extra?: React.SVGProps<SVGPolygonElement>) => (
    <polygon key={key} points={pts([a, b, c, d])} fill={fill} {...extra} />
  );

  // 직육면체(위/왼/오른쪽 면). 윗면 앞쪽 모서리에 하이라이트 선을 얹어 두께를 살린다.
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: Tone, key?: string | number) => (
    <g key={key}>
      {q(P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1), c.l)}
      {q(P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1), c.r)}
      {q(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), c.t)}
      <polyline points={pts([P(x0, y1, z1), P(x1, y1, z1), P(x1, y0, z1)])} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
    </g>
  );
  // 앞면(y = y1) 위의 사각형 / 오른쪽 면(x = x1) 위의 사각형
  const faceY = (x0: number, x1: number, y: number, z0: number, z1: number, fill: string, key?: string | number) =>
    q(P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1), fill, key);
  const faceX = (y0: number, y1: number, x: number, z0: number, z1: number, fill: string, key?: string | number) =>
    q(P(x, y0, z0), P(x, y1, z0), P(x, y1, z1), P(x, y0, z1), fill, key);
  const shadow = (cx: number, cy: number, rx: number, ry: number) => {
    const [sx, sy] = P(cx, cy, 0);
    return <ellipse cx={sx + 6} cy={sy + 3} rx={rx * K * 1.2} ry={ry * K * 0.62} fill="rgba(50,32,18,0.22)" filter="url(#rs-blur)" />;
  };

  // ───────── 소품 ─────────
  const cup = (x: number, y: number, z: number, c = "#fffaf0") => {
    const [sx, sy] = P(x, y, z);
    return (
      <g>
        <ellipse cx={sx} cy={sy + 1} rx={7} ry={3.2} fill="#e8e0d2" />
        <path d={`M${sx - 4.5} ${sy - 7}h9v5.5a4.5 3 0 0 1 -9 0Z`} fill={c} />
        <ellipse cx={sx} cy={sy - 7} rx={4.5} ry={1.8} fill="#7a4a2c" />
      </g>
    );
  };
  const books = (x0: number, x1: number, y: number, z: number, h: number, seed: number) => {
    const cols = ["#b5655a", "#6f8fa3", "#d4b46a", "#7f9a72", "#8d7aa8", "#c98a5a"];
    const out = [];
    let x = x0;
    for (let i = 0; x < x1 - 4; i++) {
      const w = 5 + ((i * 7 + seed) % 4);
      const hh = h * (0.72 + (((i * 5 + seed) % 5) / 5) * 0.28);
      out.push(<g key={i}>{faceY(x, Math.min(x + w, x1), y, z, z + hh, cols[(i + seed) % cols.length])}{faceY(x, Math.min(x + w, x1), y, z + hh - 1.5, z + hh, "rgba(255,255,255,0.3)")}</g>);
      x += w + 0.6;
    }
    return <g>{out}</g>;
  };

  // ───────── 가구 조립 ─────────
  const legs = (x0: number, y0: number, x1: number, y1: number, h: number, t: number, c: Tone) =>
    [[x0, y0], [x1 - t, y0], [x0, y1 - t], [x1 - t, y1 - t]].map(([lx, ly], i) => ({ key: `leg${i}`, depth: lx + ly, z: 0, node: box(lx, ly, 0, lx + t, ly + t, h, c) }));

  const chair = (cx: number, cy: number, back: "n" | "s" | "e" | "w", tone: Tone): Part => {
    const s = 11;
    const x0 = cx - s;
    const x1 = cx + s;
    const y0 = cy - s;
    const y1 = cy + s;
    const bk = {
      n: [x0, y0, x1, y0 + 3],
      s: [x0, y1 - 3, x1, y1],
      w: [x0, y0, x0 + 3, y1],
      e: [x1 - 3, y0, x1, y1],
    }[back];
    return {
      key: `ch-${cx}-${cy}`,
      depth: x1 + y1,
      z: 0,
      node: (
        <g>
          {shadow(cx, cy, 16, 16)}
          {[[x0, y0], [x1 - 3, y0], [x0, y1 - 3], [x1 - 3, y1 - 3]].map(([lx, ly], i) => <g key={i}>{box(lx, ly, 0, lx + 3, ly + 3, 20, tone)}</g>)}
          {box(x0, y0, 20, x1, y1, 25, tone)}
          {box(bk[0], bk[1], 25, bk[2], bk[3], 52, tone)}
        </g>
      ),
    };
  };

  const buildFurniture = (f: Furniture): Part[] => {
    const x0 = f.x;
    const y0 = f.y;
    const x1 = f.x + f.width;
    const y1 = f.y + f.height;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const wood = woodTone(mix(f.color, WOOD, 0.45));
    const dark = woodTone(darken(mix(f.color, WOOD, 0.3), 0.1));
    const id = f.id;
    const parts: Part[] = [];
    const add = (key: string, depth: number, node: React.ReactNode, z = 0) => parts.push({ key, depth, z, node });

    if (f.shape === "round" && id !== "plant") {
      // 둥근 테이블: 받침 + 기둥 + 얇은 상판 + 의자 + 찻잔
      const r = f.width / 2;
      const topZ = 38;
      const [tx, ty] = P(cx, cy, topZ);
      const [bx, by] = P(cx, cy, 0);
      const rx = r * K * 1.414;
      const ry = r * K * 0.707;
      add("sh", cx + cy - 2, shadow(cx, cy, r * 1.15, r * 1.15));
      [["n", cx, cy - r - 6], ["e", cx + r + 6, cy], ["w", cx - r - 6, cy]].forEach(([b, px, py]) => {
        const c = chair(px as number, py as number, b as "n" | "e" | "w", dark);
        parts.push({ ...c, depth: (px as number) + (py as number) + 11 });
      });
      add(
        "table",
        cx + cy + r,
        <g>
          <ellipse cx={bx} cy={by} rx={rx * 0.38} ry={ry * 0.38} fill={dark.r} />
          <rect x={bx - 4} y={ty} width={8} height={by - ty} fill={dark.l} />
          <path d={`M${tx - rx} ${ty}v4a${rx} ${ry} 0 0 0 ${rx * 2} 0v-4Z`} fill={wood.l} />
          <path d={`M${tx} ${ty + ry + 4}a${rx} ${ry} 0 0 0 ${rx} -${ry + 4}v4a${rx} ${ry} 0 0 1 -${rx} ${ry}Z`} fill={wood.r} opacity={0.6} />
          <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill={wood.t} />
          <ellipse cx={tx} cy={ty} rx={rx * 0.82} ry={ry * 0.82} fill="none" stroke={LINE} strokeWidth={1} />
          {cup(cx + 6, cy - 4, topZ + 1)}
          {cup(cx - 10, cy + 6, topZ + 1, "#f3e4cf")}
        </g>,
        1
      );
      return parts;
    }

    if (id === "plant") {
      const [sx, sy] = P(cx, cy, 0);
      add("pl", cx + cy, (
        <g>
          {shadow(cx, cy, 20, 20)}
          <path d={`M${sx - 14} ${sy - 22}h28l-4 22h-20Z`} fill="#b86f4a" />
          <path d={`M${sx - 14} ${sy - 22}h28v4h-28Z`} fill="#d18a60" />
          {[[-16, -52], [-6, -70], [8, -66], [17, -48], [0, -52], [-10, -38], [10, -38]].map(([lx, ly], i) => (
            <polygon key={i} points={pts([[sx, sy - 22], [sx + lx - 6, sy + ly + 10], [sx + lx, sy + ly], [sx + lx + 7, sy + ly + 12]])} fill={["#5d8a52", "#6f9c5f", "#4f7a47"][i % 3]} />
          ))}
        </g>
      ));
      return parts;
    }

    if (id === "bed") {
      // 침대: 틀 + 매트리스 + 이불 + 베개 + 머리판
      add("sh", x0 + y0, shadow(cx, cy, f.width * 0.55, f.height * 0.5));
      add("frame", cx + cy, box(x0, y0, 0, x1, y1, 14, dark), 0);
      add("mat", cx + cy, box(x0 + 3, y0 + 3, 14, x1 - 3, y1 - 3, 26, { t: "#f4efe6", l: "#e9e1d3", r: "#d6cdbd" }), 1);
      add("blanket", cx + cy, box(x0 + 3, y0 + f.height * 0.38, 26, x1 - 3, y1 - 3, 30, { t: lighten(f.color, 0.1), l: f.color, r: darken(f.color, 0.14) }), 2);
      add("pillow1", cx + cy, box(x0 + 10, y0 + 8, 26, cx - 3, y0 + 30, 33, { t: "#fffdf8", l: "#f0eadf", r: "#ddd5c6" }), 3);
      add("pillow2", cx + cy, box(cx + 3, y0 + 8, 26, x1 - 10, y0 + 30, 33, { t: "#fffdf8", l: "#f0eadf", r: "#ddd5c6" }), 3);
      add("head", x0 + y0, box(x0, y0 - 4, 0, x1, y0 + 4, 52, dark), 4);
      return parts;
    }

    if (id === "chair") {
      const c = chair(cx, cy, "n", dark);
      parts.push(c);
      return parts;
    }

    if (id.startsWith("shelf")) {
      // 책장/상품 선반: 틀 + 칸막이 + 꽂힌 물건
      const Hh = 104;
      const stock = kind === "shop";
      add("sh", x1 + y1, shadow(cx, cy, f.width * 0.6, f.height * 0.9));
      add("body", cx + cy, box(x0, y0, 0, x1, y1, Hh, dark), 0);
      const sy = y1 + 0.5;
      add("inner", cx + cy + 1, (
        <g>
          {faceY(x0 + 4, x1 - 4, sy, 5, Hh - 5, darken(wood.l, 0.35))}
          {[0, 1, 2, 3].map((i) => {
            const z = 6 + i * 24;
            return (
              <g key={i}>
                {stock ? (
                  <g>
                    {[0.1, 0.32, 0.55, 0.76].map((u, j) => {
                      const gx = x0 + (x1 - x0) * u;
                      const gc = ["#c0584a", "#d9b85a", "#6f9a72", "#6f8fb0"][(i + j) % 4];
                      return <g key={j}>{faceY(gx, gx + 10, sy, z + 2, z + 17, gc)}{faceY(gx, gx + 10, sy, z + 14, z + 17, "rgba(255,255,255,0.35)")}</g>;
                    })}
                  </g>
                ) : (
                  books(x0 + 6, x1 - 6, sy, z + 2, 18, i * 3)
                )}
                {faceY(x0 + 4, x1 - 4, sy, z - 1, z + 2, wood.t)}
              </g>
            );
          })}
        </g>
      ), 1);
      return parts;
    }

    if (id.startsWith("display")) {
      // 진열대: 나무 받침 + 유리 케이스 + 상품
      add("sh", x1 + y1, shadow(cx, cy, f.width * 0.7, f.height * 0.6));
      add("base", cx + cy, box(x0, y0, 0, x1, y1, 24, dark), 0);
      add("glass", cx + cy + 1, (
        <g>
          {faceY(x0, x1, y1, 24, 52, "rgba(190,225,235,0.45)")}
          {faceX(y0, y1, x1, 24, 52, "rgba(150,195,210,0.45)")}
          {[0.2, 0.55].map((u, i) => (
            <g key={i}>{faceY(x0 + (x1 - x0) * u, x0 + (x1 - x0) * u + 14, y1, 24, 36, ["#d9a05a", "#c0584a"][i])}</g>
          ))}
          <polyline points={pts([P(x0, y1, 52), P(x1, y1, 52), P(x1, y0, 52)])} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} />
        </g>
      ), 1);
      return parts;
    }

    if (id === "counter" || id === "register") {
      // 카운터: 패널 달린 몸통 + 돌출된 상판 + 위의 기계/찻잔
      const Hh = 46;
      add("sh", x1 + y1, shadow(cx, cy, f.width * 0.45, f.height * 0.7));
      add("body", cx + cy, box(x0, y0, 0, x1, y1, Hh, dark), 0);
      const n = Math.max(2, Math.round(f.width / 56));
      add("panels", cx + cy + 1, (
        <g>
          {Array.from({ length: n }, (_, i) => {
            const pw = (f.width - 10) / n;
            const a = x0 + 5 + i * pw;
            return <g key={i}>{faceY(a + 3, a + pw - 3, y1 + 0.4, 6, Hh - 8, "rgba(255,255,255,0.14)")}{faceY(a + 3, a + pw - 3, y1 + 0.4, 6, 8, "rgba(0,0,0,0.12)")}</g>;
          })}
        </g>
      ), 1);
      add("top", cx + cy + 2, box(x0 - 3, y0 - 3, Hh, x1 + 3, y1 + 4, Hh + 5, woodTone(lighten(wood.l, 0.15))), 2);
      if (id === "counter") {
        const [mx, my] = P(x0 + 40, cy, Hh + 5);
        add("mach", cx + cy + 3, (
          <g>
            <polygon points={pts([[mx - 14, my], [mx + 14, my], [mx + 14, my - 30], [mx - 14, my - 30]])} fill="#c9c4bb" />
            <polygon points={pts([[mx + 14, my], [mx + 22, my - 5], [mx + 22, my - 35], [mx + 14, my - 30]])} fill="#a59f95" />
            <polygon points={pts([[mx - 14, my - 30], [mx + 14, my - 30], [mx + 22, my - 35], [mx - 6, my - 35]])} fill="#e4dfd6" />
            <rect x={mx - 8} y={my - 20} width={10} height={8} fill="#5a4a3a" />
          </g>
        ), 3);
        add("cups", cx + cy + 4, <g>{cup(x0 + 120, cy, Hh + 6)}{cup(x0 + 150, cy + 4, Hh + 6, "#f3e4cf")}</g>, 3);
        const [dx, dy] = P(x1 - 36, cy, Hh + 5);
        add("cake", cx + cy + 5, (
          <g>
            <ellipse cx={dx} cy={dy} rx={14} ry={5} fill="#e9e1d3" />
            <path d={`M${dx - 11} ${dy - 1}a11 12 0 0 1 22 0Z`} fill="rgba(200,230,240,0.55)" />
            <rect x={dx - 7} y={dy - 9} width={14} height={7} fill="#e9a3a0" />
          </g>
        ), 3);
      } else {
        const [rx, ry] = P(cx, cy, Hh + 5);
        add("reg", cx + cy + 3, (
          <g>
            <polygon points={pts([[rx - 14, ry], [rx + 14, ry], [rx + 14, ry - 16], [rx - 14, ry - 16]])} fill="#4f4a44" />
            <polygon points={pts([[rx - 12, ry - 16], [rx + 12, ry - 16], [rx + 8, ry - 34], [rx - 8, ry - 34]])} fill="#6a645c" />
            <rect x={rx - 6} y={ry - 30} width={12} height={8} fill="#a9d4a0" />
          </g>
        ), 3);
      }
      return parts;
    }

    if (id.startsWith("desk") || id === "meeting") {
      // 책상/회의 테이블: 상판 + 다리 + 서랍 + 위의 서류·노트, 회의 테이블은 의자 포함
      const topZ = 34;
      add("sh", x1 + y1, shadow(cx, cy, f.width * 0.58, f.height * 0.7));
      legs(x0 + 2, y0 + 2, x1 - 2, y1 - 2, topZ, 5, dark).forEach((p) => parts.push(p));
      add("top", cx + cy + 2, box(x0, y0, topZ, x1, y1, topZ + 5, wood), 1);
      if (id === "meeting") {
        for (let i = 0; i < 4; i++) {
          const px = x0 + 36 + i * ((f.width - 72) / 3);
          parts.push({ ...chair(px, y0 - 14, "n", dark), depth: px + y0 - 14 + 11 });
          parts.push({ ...chair(px, y1 + 14, "s", dark), depth: px + y1 + 14 + 11 });
        }
        add("papers", cx + cy + 3, <g>{faceY(cx - 30, cx - 6, cy + 2, topZ + 6, topZ + 7, "#fffaf0")}{faceY(cx + 10, cx + 40, cy - 2, topZ + 6, topZ + 7, "#f3ecdc")}</g>, 3);
      } else {
        add("drawer", cx + cy + 3, (
          <g>
            {faceY(x0 + 6, x0 + 6 + f.width * 0.28, y1 - 3, 6, topZ - 2, darken(dark.l, 0.1))}
            {faceY(x0 + 12, x0 + 6 + f.width * 0.28 - 6, y1 - 2.5, 20, 22, "#d9c9a0")}
            {faceY(x0 + 12, x0 + 6 + f.width * 0.28 - 6, y1 - 2.5, 10, 12, "#d9c9a0")}
          </g>
        ), 2);
        const [lx, ly] = P(x1 - 28, cy, topZ + 5);
        add("note", cx + cy + 4, (
          <g>
            <polygon points={pts([[lx - 22, ly + 4], [lx + 6, ly - 8], [lx + 20, ly - 1], [lx - 8, ly + 11]])} fill="#fffaf0" />
            <polygon points={pts([[lx - 6, ly - 2], [lx + 10, ly - 10], [lx + 18, ly - 6], [lx + 2, ly + 2]])} fill="#c9594a" />
          </g>
        ), 3);
        parts.push({ ...chair(cx, y1 + 16, "s", dark), depth: cx + y1 + 16 + 11 });
      }
      return parts;
    }

    if (id === "table") {
      // 집 안 사각 테이블(내 집 기본 가구는 둥근 테이블이지만 혹시 사각이면)
      add("sh", x1 + y1, shadow(cx, cy, f.width * 0.58, f.height * 0.7));
      legs(x0 + 2, y0 + 2, x1 - 2, y1 - 2, 36, 5, dark).forEach((p) => parts.push(p));
      add("top", cx + cy + 2, box(x0, y0, 36, x1, y1, 41, wood), 1);
      return parts;
    }

    // 기본: 상판 있는 나무 가구
    add("sh", x1 + y1, shadow(cx, cy, f.width * 0.58, f.height * 0.7));
    add("box", cx + cy, box(x0, y0, 0, x1, y1, 34, wood), 0);
    return parts;
  };

  // 가구 하나를 부품 단위로 정렬해 한 덩어리 노드로 만든다.
  const furnitureNode = (f: Furniture) => {
    const parts = buildFurniture(f).sort((a, b) => a.depth - b.depth || a.z - b.z);
    const selected = f.id === selectedId;
    const [fx, fy] = P(f.x + f.width / 2, f.y + f.height / 2, 0);
    return (
      <g>
        {parts.map((p) => (
          <g key={p.key}>{p.node}</g>
        ))}
        {selected && (
          <polygon
            points={pts([P(f.x - 3, f.y - 3), P(f.x + f.width + 3, f.y - 3), P(f.x + f.width + 3, f.y + f.height + 3), P(f.x - 3, f.y + f.height + 3)])}
            fill="rgba(242,184,75,0.18)"
            stroke="#f2b84b"
            strokeWidth={3}
          />
        )}
        <circle cx={fx} cy={fy} r={0} />
      </g>
    );
  };

  // ───────── 바닥 / 벽 ─────────
  const floorLines: React.ReactNode[] = [];
  for (let y = wh + 24, i = 0; y < H; y += 24, i++) {
    floorLines.push(<polyline key={`l${i}`} points={pts([P(0, y), P(W, y)])} stroke={LINE} strokeWidth={1.4} fill="none" opacity={0.55} />);
    // 널판 이음매(줄마다 엇갈림)
    for (let x = ((i * 137) % 190) + 40; x < W; x += 190) {
      floorLines.push(<polyline key={`j${i}-${x}`} points={pts([P(x, y - 24), P(x, y)])} stroke={LINE} strokeWidth={1.2} fill="none" opacity={0.5} />);
    }
    if (i % 3 === 0) floorLines.push(q(P(0, y - 24), P(W, y - 24), P(W, y), P(0, y), "rgba(255,255,255,0.045)", `s${i}`));
  }

  const windowXs = [W * 0.16, W * 0.56];
  const winW = 110;
  const winZ0 = 78;
  const winZ1 = 150;

  const wallDeco = () => {
    const out: React.ReactNode[] = [];
    // 걸레받이 + 벽 아랫부분 패널(웨인스콧)
    out.push(faceY(0, W, wh, 0, 12, "rgba(255,250,240,0.9)", "bb1"));
    out.push(faceX(wh, H, 0, 0, 12, "rgba(255,250,240,0.8)", "bb2"));
    out.push(faceY(0, W, wh, 12, 60, wains, "w1"));
    out.push(faceX(wh, H, 0, 12, 60, darken(wains, 0.1), "w2"));
    out.push(faceY(0, W, wh, 60, 66, "#fff7ea", "r1"));
    out.push(faceX(wh, H, 0, 60, 66, "#f1e3cf", "r2"));
    // 몰딩
    out.push(faceY(0, W, wh, WALL_Z - 12, WALL_Z, "#fffaf0", "m1"));
    out.push(faceX(wh, H, 0, WALL_Z - 12, WALL_Z, "#f1e6d4", "m2"));
    // 창문 + 커튼 + 창턱
    windowXs.forEach((x0, i) => {
      const x1 = x0 + winW;
      out.push(
        <g key={`win${i}`}>
          {faceY(x0 - 8, x1 + 8, wh, winZ0 - 8, winZ1 + 8, "#fffaf0")}
          {faceY(x0, x1, wh, winZ0, winZ1, "#bfe0ec")}
          {faceY(x0, x1, wh, winZ1 - 22, winZ1, "#e2f3f8")}
          {faceY(x0, x1, wh, winZ0, winZ0 + 8, "#9cc7d8")}
          {faceY((x0 + x1) / 2 - 2, (x0 + x1) / 2 + 2, wh, winZ0, winZ1, "#fffaf0")}
          {faceY(x0, x1, wh, (winZ0 + winZ1) / 2 - 2, (winZ0 + winZ1) / 2 + 2, "#fffaf0")}
          {q(P(x0 - 14, wh - 8, winZ0 - 12), P(x1 + 14, wh - 8, winZ0 - 12), P(x1 + 14, wh + 4, winZ0 - 12), P(x0 - 14, wh + 4, winZ0 - 12), "#e8d7bd")}
          {faceY(x0 - 20, x0 + 14, wh, winZ0 - 6, winZ1 + 16, "#c98f7e")}
          {faceY(x0 - 20, x0 - 12, wh, winZ0 - 6, winZ1 + 16, "rgba(255,255,255,0.18)")}
          {faceY(x1 - 14, x1 + 20, wh, winZ0 - 6, winZ1 + 16, "#c98f7e")}
          {faceY(x1 + 12, x1 + 20, wh, winZ0 - 6, winZ1 + 16, "rgba(0,0,0,0.12)")}
          {faceY(x0 - 24, x1 + 24, wh, winZ1 + 14, winZ1 + 19, "#8a6a50")}
        </g>
      );
    });
    // 방 종류별 벽 장식
    if (kind === "cafe") {
      out.push(
        <g key="menu">
          {faceY(W * 0.42, W * 0.5, wh, 84, 136, "#e9d7b8")}
          {faceY(W * 0.42 + 4, W * 0.5 - 4, wh, 88, 132, "#33473a")}
          {[100, 112, 122].map((z, i) => <g key={i}>{faceY(W * 0.42 + 9, W * 0.5 - 12 - i * 4, wh, z, z + 2, "rgba(255,255,255,0.7)")}</g>)}
        </g>
      );
    } else if (kind === "shop") {
      out.push(
        <g key="shopsign">
          {faceY(W * 0.4, W * 0.52, wh, 124, 150, "#e9d7b8")}
          {faceY(W * 0.4 + 4, W * 0.52 - 4, wh, 128, 146, "#b5655a")}
        </g>
      );
    } else if (kind === "hall") {
      out.push(
        <g key="notice">
          {faceY(W * 0.4, W * 0.54, wh, 80, 146, "#b98f68")}
          {faceY(W * 0.4 + 5, W * 0.54 - 5, wh, 85, 141, "#d8c19a")}
          {[0, 1, 2].map((i) => <g key={i}>{faceY(W * 0.4 + 10 + i * 20, W * 0.4 + 24 + i * 20, wh, 96 + (i % 2) * 14, 126 + (i % 2) * 10, "#fffaf0")}</g>)}
        </g>
      );
    } else if (kind === "home") {
      out.push(
        <g key="art">
          {faceY(W * 0.4, W * 0.52, wh, 90, 148, "#8a6a50")}
          {faceY(W * 0.4 + 4, W * 0.52 - 4, wh, 94, 144, "#d9e8d0")}
          {faceY(W * 0.4 + 10, W * 0.52 - 10, wh, 100, 118, "#a9c6a0")}
        </g>
      );
    }
    // 왼쪽 벽 액자
    const ay0 = wh + (H - wh) * 0.4;
    out.push(
      <g key="frameL">
        {faceX(ay0, ay0 + 70, 0, 84, 148, "#8a6a50")}
        {faceX(ay0 + 5, ay0 + 65, 0, 89, 143, "#efe3cc")}
        {faceX(ay0 + 12, ay0 + 58, 0, 96, 118, "#a9c6cb")}
        {faceX(ay0 + 12, ay0 + 40, 0, 96, 104, "#c9a47c")}
      </g>
    );
    return out;
  };

  // 창에서 들어오는 빛이 바닥에 비스듬히 떨어진다
  const light = windowXs.map((x0, i) => (
    <polygon key={`lt${i}`} points={pts([P(x0 + 6, wh), P(x0 + winW, wh), P(x0 + winW + 150, wh + 260), P(x0 + 156, wh + 260)])} fill="rgba(255,243,205,0.2)" />
  ));

  // 바닥 깔개(충돌과 무관한 장식)
  const rugColor = kind === "cafe" ? "#c98f7e" : kind === "shop" ? "#9ec0c6" : kind === "hall" ? "#a8b99a" : kind === "home" ? "#c9a0b8" : "#b9a89a";
  const rug = (() => {
    const rx0 = W * 0.34;
    const rx1 = W * 0.66;
    const ry0 = H * 0.5;
    const ry1 = H * 0.78;
    return (
      <g>
        {q(P(rx0, ry0), P(rx1, ry0), P(rx1, ry1), P(rx0, ry1), rugColor)}
        {q(P(rx0 + 10, ry0 + 10), P(rx1 - 10, ry0 + 10), P(rx1 - 10, ry1 - 10), P(rx0 + 10, ry1 - 10), lighten(rugColor, 0.25))}
        {q(P(rx0 + 22, ry0 + 22), P(rx1 - 22, ry0 + 22), P(rx1 - 22, ry1 - 22), P(rx0 + 22, ry1 - 22), rugColor)}
      </g>
    );
  })();

  const doorMat = q(P(room.door.x + 6, H - 74), P(room.door.x + room.door.width - 6, H - 74), P(room.door.x + room.door.width - 6, H), P(room.door.x + 6, H), "#8f6a4a");

  // ── 깊이 정렬: 가구 · 주민 · 플레이어 ──
  type Item = { depth: number; key: string; node: React.ReactNode };
  const items: Item[] = furniture
    .filter((f) => f.y + f.height > wh)
    .map((f) => ({ depth: f.x + f.width + f.y + f.height, key: `f-${f.id}`, node: furnitureNode(f) }));
  const wallMounted = furniture.filter((f) => f.y + f.height <= wh);

  const person = (px: number, py: number, emoji: string) => {
    const [sx, sy] = P(px + CHAR_SIZE / 2, py + CHAR_SIZE / 2, 0);
    return (
      <g>
        <ellipse cx={sx} cy={sy} rx={17} ry={6.5} fill="rgba(50,32,18,0.3)" />
        <text x={sx} y={sy - 4} textAnchor="middle" fontSize={38}>
          {emoji}
        </text>
      </g>
    );
  };
  if (residentRect && residentEmoji) {
    items.push({ depth: residentRect.x + residentRect.y + CHAR_SIZE, key: "resident", node: person(residentRect.x, residentRect.y, residentEmoji) });
  }
  items.push({ depth: position.x + position.y + CHAR_SIZE, key: "player", node: person(position.x, position.y, "🧑") });
  items.sort((a, b) => a.depth - b.depth);

  const ghostFill = ghost?.bad ? "rgba(220,80,80,0.45)" : "rgba(80,200,120,0.45)";
  const ghostStroke = ghost?.bad ? "#c0392b" : "#2e9e5b";

  return (
    <g>
      <defs>
        <filter id="rs-blur" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {/* 바닥 두께 + 마루 */}
      {q(P(0, H, 0), P(W, H, 0), P(W, H, -FLOOR_SLAB), P(0, H, -FLOOR_SLAB), "#cfae85")}
      {q(P(W, wh, 0), P(W, H, 0), P(W, H, -FLOOR_SLAB), P(W, wh, -FLOOR_SLAB), "#b08f68")}
      {q(P(0, wh), P(W, wh), P(W, H), P(0, H), floorC)}
      {floorLines}
      {rug}
      {doorMat}
      {light}
      {/* 벽 */}
      {q(P(0, wh, 0), P(W, wh, 0), P(W, wh, WALL_Z), P(0, wh, WALL_Z), wallC)}
      {q(P(0, wh, 0), P(0, H, 0), P(0, H, WALL_Z), P(0, wh, WALL_Z), wallL)}
      {wallDeco()}
      {q(P(-8, wh - 8, WALL_Z), P(W, wh - 8, WALL_Z), P(W, wh, WALL_Z), P(-8, wh, WALL_Z), "#fff7ea")}
      {q(P(-8, wh - 8, WALL_Z), P(-8, H, WALL_Z), P(0, H, WALL_Z), P(0, wh - 8, WALL_Z), "#f1e3cf")}
      {wallMounted.map((f) => (
        <g key={f.id}>
          {faceY(f.x - 7, f.x + f.width + 7, wh, 58, 150, "#8a6a50")}
          {faceY(f.x, f.x + f.width, wh, 66, 142, f.color)}
          {[0.2, 0.5, 0.78].map((u, i) => <g key={i}>{faceY(f.x + f.width * u, f.x + f.width * u + 30, wh, 112 - i * 12, 114 - i * 12, "rgba(255,255,255,0.75)")}</g>)}
          {faceY(f.x + 6, f.x + f.width - 6, wh, 60, 64, "#c9a47c")}
        </g>
      ))}
      {ghost &&
        (ghost.round ? (
          (() => {
            const r = ghost.width / 2;
            const [gx, gy] = P(ghost.x + r, ghost.y + r);
            return <ellipse cx={gx} cy={gy} rx={r * K * 1.414} ry={r * K * 0.707} fill={ghostFill} stroke={ghostStroke} strokeWidth={2.5} strokeDasharray="6 4" />;
          })()
        ) : (
          <polygon points={pts([P(ghost.x, ghost.y), P(ghost.x + ghost.width, ghost.y), P(ghost.x + ghost.width, ghost.y + ghost.height), P(ghost.x, ghost.y + ghost.height)])} fill={ghostFill} stroke={ghostStroke} strokeWidth={2.5} strokeDasharray="6 4" />
        ))}
      {items.map((it) => (
        <g key={it.key}>{it.node}</g>
      ))}
    </g>
  );
}
