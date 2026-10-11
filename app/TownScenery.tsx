import { ISO_K, MAP_HEIGHT, MAP_WIDTH, SLAB, project, pts } from "./iso";

// 마을 맵의 바닥과 소품 (아이소메트릭 파스텔 미니어처).
// - SceneGround: 두께가 있는 땅 판, 잔디 얼룩, 길, 꽃·풀·자갈 (전부 월드 좌표를 project()로 그린 납작한 면)
// - PROPS / Prop: 벚나무·활엽수·덤불·바위·등롱. 월드 좌표의 한 점(밑동)에 세워 두는 "서 있는" 그림이라
//   건물·캐릭터와 함께 깊이 순서로 섞어 그린다(page.tsx).
// 전부 SVG이고 클릭/충돌/배치 판정과 무관한 장식이다. 길도 눈에 보이는 그림일 뿐 이동 충돌과는 무관하다.

const SHADOW = "rgba(90,110,70,0.2)";
const GRASS = "var(--grass)";

// ───────── 소품 ─────────
// 모든 소품 그림은 (0,0)이 밑동(바닥 접점)이고 위로(-y) 솟는다.

function Sakura() {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={24} ry={7} fill={SHADOW} />
      <rect x={-5} y={-34} width={9} height={34} rx={4} fill="#c9a47c" />
      <rect x={0} y={-34} width={4} height={34} rx={2} fill="#b98f68" />
      <circle cx={-13} cy={-42} r={16} fill="#e3a3a6" />
      <circle cx={13} cy={-42} r={16} fill="#e3a3a6" />
      <circle cx={0} cy={-37} r={15} fill="#e3a3a6" />
      <circle cx={-13} cy={-49} r={16} fill="#ecb8b8" />
      <circle cx={13} cy={-50} r={16} fill="#ecb8b8" />
      <circle cx={0} cy={-60} r={19} fill="#ecb8b8" />
      <circle cx={-6} cy={-65} r={9} fill="#f3cdcd" />
      {[[-3, -48], [8, -60], [-15, -42], [15, -40], [3, -36]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={2.4} fill="#fffaf0" />)}
    </g>
  );
}

function Leafy() {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={24} ry={7} fill={SHADOW} />
      <rect x={-5} y={-34} width={9} height={34} rx={4} fill="#c9a47c" />
      <rect x={0} y={-34} width={4} height={34} rx={2} fill="#b98f68" />
      <circle cx={-13} cy={-42} r={16} fill="#8fb685" />
      <circle cx={13} cy={-42} r={16} fill="#8fb685" />
      <circle cx={0} cy={-37} r={15} fill="#8fb685" />
      <circle cx={-13} cy={-49} r={16} fill="#a9ca97" />
      <circle cx={13} cy={-50} r={16} fill="#a9ca97" />
      <circle cx={0} cy={-60} r={19} fill="#a9ca97" />
      <circle cx={-6} cy={-65} r={9} fill="#c6dcb4" />
    </g>
  );
}

function Bush({ flower }: { flower: string }) {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={20} ry={5} fill={SHADOW} />
      <circle cx={-10} cy={-9} r={10} fill="#8fb685" />
      <circle cx={10} cy={-9} r={10} fill="#8fb685" />
      <circle cx={0} cy={-13} r={12} fill="#a9ca97" />
      <circle cx={-5} cy={-17} r={5} fill="#c6dcb4" />
      {[[-11, -10], [4, -17], [11, -8], [-1, -7]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={2.3} fill={i % 2 ? flower : "#fffaf0"} />)}
    </g>
  );
}

function Rock() {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={19} ry={5} fill={SHADOW} />
      <path d="M-16 -2Q-17 -14 -7 -18Q4 -22 13 -15Q18 -9 16 -2Z" fill="#cfc6b4" />
      <path d="M4 -17Q14 -15 16 -2H6Q8 -10 4 -17Z" fill="#b3aa98" />
      <path d="M-12 -11Q-8 -17 -1 -18Q-6 -15 -8 -9Z" fill="#e4dccb" />
    </g>
  );
}

function Lantern() {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={10} ry={3.2} fill={SHADOW} />
      <rect x={-1.5} y={-26} width={3} height={26} rx={1.5} fill="#c9a47c" />
      <rect x={-6} y={-52} width={12} height={4} rx={2} fill="#b98f68" />
      <ellipse cx={0} cy={-37} rx={10} ry={12} fill="#e68576" />
      <ellipse cx={3} cy={-36} rx={6} ry={11} fill="#d6705f" />
      <ellipse cx={-4} cy={-42} rx={2.2} ry={4} fill="#fff" opacity={0.5} />
      <rect x={-6} y={-26} width={12} height={4} rx={2} fill="#b98f68" />
    </g>
  );
}

export type PropKind = "sakura" | "leafy" | "bush" | "bushY" | "rock" | "lantern";
export interface PropDef {
  kind: PropKind;
  x: number; // 월드 좌표의 밑동
  y: number;
}

// 건물·길과 겹치지 않는 빈 곳에 놓은 소품들 (월드 좌표).
export const PROPS: PropDef[] = [
  { kind: "sakura", x: 62, y: 96 },
  { kind: "leafy", x: 332, y: 92 },
  { kind: "sakura", x: 592, y: 96 },
  { kind: "leafy", x: 882, y: 114 },
  { kind: "sakura", x: 202, y: 470 },
  { kind: "leafy", x: 82, y: 570 },
  { kind: "leafy", x: 632, y: 540 },
  { kind: "sakura", x: 882, y: 570 },
  { kind: "bush", x: 42, y: 256 },
  { kind: "bushY", x: 898, y: 260 },
  { kind: "bush", x: 320, y: 504 },
  { kind: "bushY", x: 572, y: 590 },
  { kind: "bush", x: 720, y: 102 },
  { kind: "bush", x: 140, y: 570 },
  { kind: "rock", x: 398, y: 240 },
  { kind: "rock", x: 918, y: 420 },
  { kind: "rock", x: 388, y: 618 },
  { kind: "lantern", x: 433, y: 290 },
  { kind: "lantern", x: 527, y: 290 },
  { kind: "lantern", x: 433, y: 398 },
  { kind: "lantern", x: 527, y: 398 },
  { kind: "lantern", x: 262, y: 280 },
  { kind: "lantern", x: 702, y: 408 },
];

export function Prop({ def }: { def: PropDef }) {
  const [sx, sy] = project(def.x, def.y, 0);
  const s = def.kind === "lantern" ? 0.85 : 0.95;
  return (
    <g transform={`translate(${sx} ${sy}) scale(${s})`}>
      {def.kind === "sakura" && <Sakura />}
      {def.kind === "leafy" && <Leafy />}
      {def.kind === "bush" && <Bush flower="#efbcc0" />}
      {def.kind === "bushY" && <Bush flower="#f3dc9c" />}
      {def.kind === "rock" && <Rock />}
      {def.kind === "lantern" && <Lantern />}
    </g>
  );
}

// ───────── 바닥 ─────────

// 시드 고정 난수 — 서버/클라이언트 렌더 결과가 같아야 하이드레이션이 어긋나지 않는다.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const FLOWER_COLORS = ["#fffaf0", "#efbcc0", "#f3dc9c"];

export function SceneGround() {
  const W = MAP_WIDTH;
  const H = MAP_HEIGHT;
  const hy1 = H / 2 - 30;
  const hy2 = H / 2 + 30;
  const vx1 = W / 2 - 30;
  const vx2 = W / 2 + 30;
  const poly = (a: [number, number][], z = 0) => pts(a.map(([x, y]) => project(x, y, z)));
  const rnd = seeded(20240611);

  const onRoad = (x: number, y: number, m: number) => (y > hy1 - m && y < hy2 + m) || (x > vx1 - m && x < vx2 + m);
  const patches = Array.from({ length: 22 }, () => ({ x: rnd() * W, y: rnd() * H, r: 40 + rnd() * 60, light: rnd() > 0.5 }));
  const flowers: { x: number; y: number; c: string }[] = [];
  while (flowers.length < 70) {
    const x = 10 + rnd() * (W - 20);
    const y = 10 + rnd() * (H - 20);
    const c = FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)];
    if (!onRoad(x, y, 12)) flowers.push({ x, y, c });
  }
  const tufts: { x: number; y: number }[] = [];
  while (tufts.length < 60) {
    const x = 10 + rnd() * (W - 20);
    const y = 10 + rnd() * (H - 20);
    if (!onRoad(x, y, 12)) tufts.push({ x, y });
  }
  const pebbles = Array.from({ length: 30 }, () => {
    const horizontal = rnd() > 0.5;
    return horizontal ? { x: rnd() * W, y: hy1 + 8 + rnd() * 44 } : { x: vx1 + 8 + rnd() * 44, y: rnd() * H };
  });

  // 십자 모양 길 (월드 좌표 다각형)
  const road: [number, number][] = [[0, hy1], [vx1, hy1], [vx1, 0], [vx2, 0], [vx2, hy1], [W, hy1], [W, hy2], [vx2, hy2], [vx2, H], [vx1, H], [vx1, hy2], [0, hy2]];
  const m = 9;
  const inner: [number, number][] = [[0, hy1 + m], [vx1 + m, hy1 + m], [vx1 + m, 0], [vx2 - m, 0], [vx2 - m, hy1 + m], [W, hy1 + m], [W, hy2 - m], [vx2 - m, hy2 - m], [vx2 - m, H], [vx1 + m, H], [vx1 + m, hy2 - m], [0, hy2 - m]];

  return (
    <g>
      <defs>
        <clipPath id="town-clip">
          <polygon points={poly([[0, 0], [W, 0], [W, H], [0, H]])} />
        </clipPath>
      </defs>
      {/* 땅의 두께: 앞쪽 두 옆면 */}
      <polygon points={pts([project(0, H, 0), project(W, H, 0), project(W, H, -SLAB), project(0, H, -SLAB)])} fill="#d3b995" />
      <polygon points={pts([project(W, 0, 0), project(W, H, 0), project(W, H, -SLAB), project(W, 0, -SLAB)])} fill="#bd9f7c" />
      <polygon points={pts([project(0, H, -SLAB + 8), project(W, H, -SLAB + 8), project(W, H, -SLAB + 4), project(0, H, -SLAB + 4)])} fill="#c7aa86" />
      <polygon points={poly([[0, 0], [W, 0], [W, H], [0, H]])} fill={GRASS} />
      <g clipPath="url(#town-clip)">
        {patches.map((p, i) => {
          const [cx, cy] = project(p.x, p.y);
          return <ellipse key={i} cx={cx} cy={cy} rx={p.r * ISO_K * 1.414} ry={p.r * ISO_K * 0.707} fill={p.light ? "#cfe3b6" : "#b5d09b"} opacity={0.55} />;
        })}
        {/* 길: 두께 → 본체 → 안쪽 점선 */}
        <polygon points={poly(road)} transform="translate(0 5)" fill="#dcc5a0" />
        <polygon points={poly(road)} fill="var(--road)" />
        <polygon points={poly(inner)} fill="none" stroke="#e3d1ae" strokeWidth={2} strokeDasharray="7 6" strokeLinejoin="round" />
        {pebbles.map((p, i) => {
          const [cx, cy] = project(p.x, p.y);
          return <ellipse key={i} cx={cx} cy={cy} rx={2.6 + (i % 3)} ry={1.4 + (i % 2) * 0.5} fill={i % 2 ? "#cfc6b4" : "#e3d1ae"} />;
        })}
        {tufts.map((t, i) => {
          const [cx, cy] = project(t.x, t.y);
          return <path key={i} d={`M${cx - 3} ${cy}l1.5 -5M${cx} ${cy}v-7M${cx + 3} ${cy}l-1.5 -5`} stroke="#98b884" strokeWidth={1.8} strokeLinecap="round" fill="none" />;
        })}
        {flowers.map((f, i) => {
          const [cx, cy] = project(f.x, f.y);
          return (
            <g key={i}>
              {[0, 90, 180, 270].map((deg) => (
                <circle key={deg} cx={cx + 2.3 * Math.cos((deg * Math.PI) / 180)} cy={cy + 1.3 * Math.sin((deg * Math.PI) / 180)} r={1.9} fill={f.c} />
              ))}
              <circle cx={cx} cy={cy} r={1.3} fill="#e6bb62" />
            </g>
          );
        })}
      </g>
    </g>
  );
}
