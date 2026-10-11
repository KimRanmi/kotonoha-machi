import { EXT, ISO_K, ISO_SCALE, MAP_HEIGHT, MAP_WIDTH, STAGE_HEIGHT, STAGE_WIDTH, project, pts } from "./iso";
import styles from "./town.module.css";

// 마을 맵의 바닥과 소품 (아이소메트릭 파스텔 미니어처).
// - SceneGround: 마을 바깥까지 이어지는 땅, 잔디 얼룩, 길(바깥 숲길로 이어짐), 호수, 뒤쪽 울타리, 꽃·풀·자갈
// - STATIC_PROPS / Prop: 나무·덤불·바위·등롱·벤치 등. 월드 좌표의 한 점(밑동)에 세워 두는 "서 있는" 그림이라
//   건물·캐릭터와 함께 깊이 순서로 섞어 그린다(page.tsx). 마을 바깥 숲도 같은 방식이다.
// - FrontFence / Ambient: 앞쪽 울타리, 구름 그림자·새·나비 같은 움직이는 분위기 요소
// 전부 SVG이고 클릭/충돌/배치 판정과 무관한 장식이다. 길도 눈에 보이는 그림일 뿐 이동 충돌과는 무관하다.

const SHADOW = "rgba(90,110,70,0.22)";
const GRASS = "var(--grass)";
const OUTER = "#aac78f"; // 마을 바깥 풀밭
const W = MAP_WIDTH;
const H = MAP_HEIGHT;
const S = ISO_SCALE;

// ───────── 소품 (밑동이 (0,0), 위로 -y로 솟는다) ─────────

function Sway({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <g className={styles.sway} style={{ animationDelay: `${-delay}s`, animationDuration: `${4.5 + (delay % 3)}s` }}>
      {children}
    </g>
  );
}

function Sakura({ d }: { d: number }) {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={26} ry={7.5} fill={SHADOW} />
      <rect x={-5} y={-34} width={9} height={34} rx={4} fill="#c9a47c" />
      <rect x={0} y={-34} width={4} height={34} rx={2} fill="#b98f68" />
      <Sway delay={d}>
        <circle cx={-13} cy={-42} r={16} fill="#e3a3a6" />
        <circle cx={13} cy={-42} r={16} fill="#e3a3a6" />
        <circle cx={0} cy={-37} r={15} fill="#e3a3a6" />
        <circle cx={-13} cy={-49} r={16} fill="#ecb8b8" />
        <circle cx={13} cy={-50} r={16} fill="#ecb8b8" />
        <circle cx={0} cy={-60} r={19} fill="#ecb8b8" />
        <circle cx={-6} cy={-65} r={9} fill="#f3cdcd" />
        {[[-3, -48], [8, -60], [-15, -42], [15, -40], [3, -36], [-9, -58]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={2.4} fill="#fffaf0" />)}
      </Sway>
    </g>
  );
}

function Leafy({ d }: { d: number }) {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={26} ry={7.5} fill={SHADOW} />
      <rect x={-5} y={-34} width={9} height={34} rx={4} fill="#c9a47c" />
      <rect x={0} y={-34} width={4} height={34} rx={2} fill="#b98f68" />
      <Sway delay={d}>
        <circle cx={-13} cy={-42} r={16} fill="#8fb685" />
        <circle cx={13} cy={-42} r={16} fill="#8fb685" />
        <circle cx={0} cy={-37} r={15} fill="#8fb685" />
        <circle cx={-13} cy={-49} r={16} fill="#a9ca97" />
        <circle cx={13} cy={-50} r={16} fill="#a9ca97" />
        <circle cx={0} cy={-60} r={19} fill="#a9ca97" />
        <circle cx={-6} cy={-65} r={9} fill="#c6dcb4" />
      </Sway>
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
      <circle cx={0} cy={-37} r={26} fill="#ffd27a" opacity={0.2} className={styles.glow} />
      <rect x={-1.5} y={-26} width={3} height={26} rx={1.5} fill="#c9a47c" />
      <rect x={-6} y={-52} width={12} height={4} rx={2} fill="#b98f68" />
      <ellipse cx={0} cy={-37} rx={10} ry={12} fill="#e68576" />
      <ellipse cx={3} cy={-36} rx={6} ry={11} fill="#d6705f" />
      <ellipse cx={-4} cy={-42} rx={2.2} ry={4} fill="#fff" opacity={0.5} />
      <rect x={-6} y={-26} width={12} height={4} rx={2} fill="#b98f68" />
    </g>
  );
}

function Bench() {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={24} ry={6} fill={SHADOW} />
      <rect x={-20} y={-12} width={4} height={12} fill="#b98f68" />
      <rect x={16} y={-12} width={4} height={12} fill="#b98f68" />
      <rect x={-22} y={-16} width={44} height={6} rx={2} fill="#e0b88a" />
      <rect x={-22} y={-28} width={44} height={5} rx={2} fill="#e0b88a" />
      <rect x={-20} y={-24} width={4} height={10} fill="#b98f68" />
      <rect x={16} y={-24} width={4} height={10} fill="#b98f68" />
    </g>
  );
}

function Flowerbed({ c }: { c: string }) {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={24} ry={9} fill="#c9a47c" />
      <ellipse cx={0} cy={-2} rx={21} ry={7} fill="#a98a63" />
      {[[-12, -4], [-4, -8], [6, -5], [14, -3], [0, -2], [-8, 0], [10, -9]].map(([cx, cy], i) => (
        <g key={i}>
          <path d={`M${cx} ${cy}v-6`} stroke="#6f9a52" strokeWidth={1.6} />
          <circle cx={cx} cy={cy - 8} r={3.4} fill={i % 2 ? c : "#fffaf0"} />
          <circle cx={cx} cy={cy - 8} r={1.2} fill="#e6bb62" />
        </g>
      ))}
    </g>
  );
}

function Crates() {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={22} ry={6} fill={SHADOW} />
      <rect x={-18} y={-13} width={18} height={13} rx={2} fill="#d9a56b" />
      <rect x={2} y={-11} width={16} height={11} rx={2} fill="#c9935a" />
      <rect x={-14} y={-25} width={16} height={12} rx={2} fill="#e0b88a" />
      {[[-12, -15, "#e68576"], [-6, -16, "#f3dc9c"], [8, -13, "#9cc08a"], [13, -13, "#e68576"]].map(([cx, cy, c], i) => <circle key={i} cx={cx as number} cy={cy as number} r={3.6} fill={c as string} />)}
    </g>
  );
}

function Signpost() {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={9} ry={3} fill={SHADOW} />
      <rect x={-2} y={-46} width={4} height={46} rx={2} fill="#b98f68" />
      <path d="M-22 -44H12L20 -38L12 -32H-22Z" fill="#e0b88a" />
      <path d="M22 -28H-10L-18 -22L-10 -16H22Z" fill="#ecc89c" />
    </g>
  );
}

export type PropKind = "sakura" | "leafy" | "bush" | "bushY" | "rock" | "lantern" | "bench" | "bed" | "bedY" | "crates" | "sign";
export interface PropDef {
  kind: PropKind;
  x: number; // 월드 좌표의 밑동
  y: number;
  s?: number; // 크기 배율
}

// 마을 안: 건물·길과 겹치지 않는 빈 곳에 놓은 소품들 (월드 좌표).
const TOWN_PROPS: PropDef[] = [
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
  { kind: "bench", x: 330, y: 372 },
  { kind: "bench", x: 610, y: 372 },
  { kind: "bed", x: 130, y: 232 },
  { kind: "bedY", x: 276, y: 238 },
  { kind: "bed", x: 700, y: 300 },
  { kind: "crates", x: 800, y: 280 },
  { kind: "sign", x: 440, y: 270 },
];

// 시드 고정 난수 — 서버/클라이언트 렌더 결과가 같아야 하이드레이션이 어긋나지 않는다.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 호수(마을 바깥 남동쪽)
const LAKE = { cx: W + 190, cy: 520, rx: 120, ry: 135 };
const inLake = (x: number, y: number, m = 0) => ((x - LAKE.cx) / (LAKE.rx + m)) ** 2 + ((y - LAKE.cy) / (LAKE.ry + m)) ** 2 < 1;

// 마을 바깥을 두른 숲: 마을 경계 밖 EXT 안쪽에 나무·덤불·바위를 흩어 놓는다. 길이 이어지는 자리와 호수는 비운다.
const OUTER_PROPS: PropDef[] = (() => {
  const rnd = seeded(77);
  const out: PropDef[] = [];
  let guard = 0;
  while (out.length < 130 && guard++ < 4000) {
    const x = -EXT + 20 + rnd() * (W + 2 * EXT - 40);
    const y = -EXT + 20 + rnd() * (H + 2 * EXT - 40);
    if (x > 14 && x < W - 14 && y > 14 && y < H - 14) continue; // 마을 안
    if (x > -14 && x < W + 14 && y > -14 && y < H + 14) continue; // 울타리 바로 둘레
    const nearRoad = (Math.abs(y - H / 2) < 46 && (x < 0 || x > W)) || (Math.abs(x - W / 2) < 46 && (y < 0 || y > H));
    // 앞쪽(화면 아래쪽) 경계 바로 바깥은 마을을 가리지 않게 비워 둔다.
    if ((x > W && x < W + 130) || (y > H && y < H + 130)) continue;
    if (nearRoad || inLake(x, y, 40)) continue;
    const r = rnd();
    const kind: PropKind = r < 0.5 ? "leafy" : r < 0.78 ? "sakura" : r < 0.93 ? "bush" : "rock";
    out.push({ kind, x, y, s: 0.9 + rnd() * 0.5 });
  }
  return out;
})();

export const STATIC_PROPS: PropDef[] = [...TOWN_PROPS, ...OUTER_PROPS];

export function Prop({ def, i }: { def: PropDef; i: number }) {
  const [sx, sy] = project(def.x, def.y, 0);
  const base = def.kind === "lantern" || def.kind === "sign" ? 0.85 : def.kind === "bench" || def.kind === "crates" ? 0.9 : def.kind === "sakura" || def.kind === "leafy" ? 0.78 : 0.95;
  const s = base * S * (def.s ?? 1);
  return (
    <g transform={`translate(${sx} ${sy}) scale(${s})`}>
      {def.kind === "sakura" && <Sakura d={i} />}
      {def.kind === "leafy" && <Leafy d={i} />}
      {def.kind === "bush" && <Bush flower="#efbcc0" />}
      {def.kind === "bushY" && <Bush flower="#f3dc9c" />}
      {def.kind === "rock" && <Rock />}
      {def.kind === "lantern" && <Lantern />}
      {def.kind === "bench" && <Bench />}
      {def.kind === "bed" && <Flowerbed c="#efbcc0" />}
      {def.kind === "bedY" && <Flowerbed c="#f3dc9c" />}
      {def.kind === "crates" && <Crates />}
      {def.kind === "sign" && <Signpost />}
    </g>
  );
}

// ───────── 울타리 ─────────
// 마을 경계를 따라 나무 울타리. 길이 지나가는 자리는 비워 문처럼 보이게 한다.
function fenceSegments(side: "back" | "front") {
  const out: { a: [number, number]; b: [number, number] }[] = [];
  const step = 48;
  const gate = (v: number, c: number) => Math.abs(v - c) < 44;
  const edges: [number, number, number, number][] =
    side === "back"
      ? [[0, 0, W, 0], [0, 0, 0, H]]
      : [[W, 0, W, H], [0, H, W, H]];
  for (const [x1, y1, x2, y2] of edges) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.round(len / step);
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const a: [number, number] = [x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0];
      const b: [number, number] = [x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1];
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      // 가로길(y=H/2)이 지나는 x=0, x=W 변 / 세로길(x=W/2)이 지나는 y=0, y=H 변은 비운다
      if ((x1 === x2 && gate(my, H / 2)) || (y1 === y2 && gate(mx, W / 2))) continue;
      out.push({ a, b });
    }
  }
  return out;
}

function Fence({ side }: { side: "back" | "front" }) {
  const segs = fenceSegments(side);
  const post = (p: [number, number]) => {
    const [bx, by] = project(p[0], p[1], 0);
    return <path d={`M${bx} ${by}v${-20 * S * 0.8}`} stroke="#d9b98a" strokeWidth={5 * S * 0.8} strokeLinecap="round" />;
  };
  return (
    <g>
      {segs.map(({ a, b }, i) => {
        const rail = (z: number) => {
          const [ax, ay] = project(a[0], a[1], z * S * 0.8);
          const [bx, by] = project(b[0], b[1], z * S * 0.8);
          return <path d={`M${ax} ${ay}L${bx} ${by}`} stroke="#e8d2b0" strokeWidth={3.4 * S * 0.8} strokeLinecap="round" />;
        };
        return (
          <g key={i}>
            {rail(15)}
            {rail(8)}
            {post(a)}
            {post(b)}
          </g>
        );
      })}
    </g>
  );
}

export function FrontFence() {
  return <Fence side="front" />;
}

// ───────── 바닥 ─────────

const FLOWER_COLORS = ["#fffaf0", "#efbcc0", "#f3dc9c"];

export function SceneGround() {
  const hy1 = H / 2 - 30;
  const hy2 = H / 2 + 30;
  const vx1 = W / 2 - 30;
  const vx2 = W / 2 + 30;
  const poly = (a: [number, number][], z = 0) => pts(a.map(([x, y]) => project(x, y, z)));
  const rnd = seeded(20240611);

  const onRoad = (x: number, y: number, m: number) => (y > hy1 - m && y < hy2 + m) || (x > vx1 - m && x < vx2 + m);
  const patches = Array.from({ length: 30 }, () => ({ x: rnd() * W, y: rnd() * H, r: 40 + rnd() * 60, light: rnd() > 0.5 }));
  const outerPatches = Array.from({ length: 40 }, () => ({ x: -EXT + rnd() * (W + 2 * EXT), y: -EXT + rnd() * (H + 2 * EXT), r: 60 + rnd() * 90, light: rnd() > 0.5 }));
  const flowers: { x: number; y: number; c: string }[] = [];
  while (flowers.length < 130) {
    const x = 10 + rnd() * (W - 20);
    const y = 10 + rnd() * (H - 20);
    const c = FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)];
    if (!onRoad(x, y, 12)) flowers.push({ x, y, c });
  }
  const tufts: { x: number; y: number }[] = [];
  while (tufts.length < 150) {
    const x = 10 + rnd() * (W - 20);
    const y = 10 + rnd() * (H - 20);
    if (!onRoad(x, y, 12)) tufts.push({ x, y });
  }
  const outerTufts: { x: number; y: number }[] = [];
  while (outerTufts.length < 110) {
    const x = -EXT + rnd() * (W + 2 * EXT);
    const y = -EXT + rnd() * (H + 2 * EXT);
    if (!(x > 0 && x < W && y > 0 && y < H) && !inLake(x, y, 10)) outerTufts.push({ x, y });
  }
  const pebbles = Array.from({ length: 40 }, () => {
    const horizontal = rnd() > 0.5;
    return horizontal ? { x: rnd() * W, y: hy1 + 8 + rnd() * 44 } : { x: vx1 + 8 + rnd() * 44, y: rnd() * H };
  });

  // 십자 모양 길. 마을 바깥으로도 숲길로 이어진다.
  const E = EXT - 20;
  const road: [number, number][] = [[-E, hy1], [vx1, hy1], [vx1, -E], [vx2, -E], [vx2, hy1], [W + E, hy1], [W + E, hy2], [vx2, hy2], [vx2, H + E], [vx1, H + E], [vx1, hy2], [-E, hy2]];
  const m = 9;
  const inner: [number, number][] = [[-E, hy1 + m], [vx1 + m, hy1 + m], [vx1 + m, -E], [vx2 - m, -E], [vx2 - m, hy1 + m], [W + E, hy1 + m], [W + E, hy2 - m], [vx2 - m, hy2 - m], [vx2 - m, H + E], [vx1 + m, H + E], [vx1 + m, hy2 - m], [-E, hy2 - m]];

  const ring = (rx: number, ry: number) =>
    Array.from({ length: 40 }, (_, i) => {
      const a = (i / 40) * Math.PI * 2;
      return project(LAKE.cx + Math.cos(a) * rx, LAKE.cy + Math.sin(a) * ry);
    });

  return (
    <g>
      <defs>
        <clipPath id="town-clip">
          <polygon points={poly([[0, 0], [W, 0], [W, H], [0, H]])} />
        </clipPath>
        <clipPath id="outer-clip">
          <polygon points={poly([[-EXT, -EXT], [W + EXT, -EXT], [W + EXT, H + EXT], [-EXT, H + EXT]])} />
        </clipPath>
      </defs>
      <rect width={STAGE_WIDTH} height={STAGE_HEIGHT} fill={OUTER} />
      <polygon points={poly([[-EXT, -EXT], [W + EXT, -EXT], [W + EXT, H + EXT], [-EXT, H + EXT]])} fill={OUTER} />
      <g clipPath="url(#outer-clip)">
        {outerPatches.map((p, i) => {
          const [cx, cy] = project(p.x, p.y);
          return <ellipse key={i} cx={cx} cy={cy} rx={p.r * ISO_K * 1.414} ry={p.r * ISO_K * 0.707} fill={p.light ? "#bcd6a0" : "#9bba82"} opacity={0.5} />;
        })}
        {/* 호수: 모래톱 → 물 → 반짝임 → 연잎 */}
        <polygon points={pts(ring(LAKE.rx + 16, LAKE.ry + 16))} fill="#eadcb8" />
        <polygon points={pts(ring(LAKE.rx + 6, LAKE.ry + 6))} fill="#cfe3d2" />
        <polygon points={pts(ring(LAKE.rx, LAKE.ry))} fill="#a9d4dc" />
        <polygon points={pts(ring(LAKE.rx * 0.65, LAKE.ry * 0.65))} fill="#b9e0e6" />
        {[[-0.3, -0.2, 40], [0.25, 0.3, 54], [0.1, -0.45, 30]].map(([fx, fy, rr], i) => {
          const [px, py] = project(LAKE.cx + (fx as number) * LAKE.rx, LAKE.cy + (fy as number) * LAKE.ry);
          return <ellipse key={i} className={styles.twinkle} style={{ animationDelay: `${-i * 1.2}s` }} cx={px} cy={py} rx={rr as number} ry={(rr as number) * 0.4} fill="none" stroke="#fff" strokeWidth={2} />;
        })}
        {[[0.45, -0.1], [-0.5, 0.35], [0.2, 0.55]].map(([fx, fy], i) => {
          const [px, py] = project(LAKE.cx + fx * LAKE.rx, LAKE.cy + fy * LAKE.ry);
          return (
            <g key={i}>
              <ellipse cx={px} cy={py} rx={13} ry={6} fill="#8fc27a" />
              <circle cx={px - 3} cy={py - 2} r={3} fill="#f9c6d0" />
            </g>
          );
        })}
        {outerTufts.map((t, i) => {
          const [cx, cy] = project(t.x, t.y);
          return <path key={i} d={`M${cx - 4} ${cy}l2 -7M${cx} ${cy}v-9M${cx + 4} ${cy}l-2 -7`} stroke="#8aab75" strokeWidth={2} strokeLinecap="round" fill="none" />;
        })}
        {/* 바깥 숲길 */}
        <polygon points={poly(road)} fill="#d9c79f" opacity={0.85} />
      </g>

      {/* 마을 바닥 */}
      <polygon points={poly([[0, 0], [W, 0], [W, H], [0, H]])} fill={GRASS} />
      <g clipPath="url(#town-clip)">
        {patches.map((p, i) => {
          const [cx, cy] = project(p.x, p.y);
          return <ellipse key={i} cx={cx} cy={cy} rx={p.r * ISO_K * 1.414} ry={p.r * ISO_K * 0.707} fill={p.light ? "#cfe3b6" : "#b5d09b"} opacity={0.55} />;
        })}
        <polygon points={poly(road)} transform="translate(0 6)" fill="#dcc5a0" />
        <polygon points={poly(road)} fill="var(--road)" />
        <polygon points={poly(inner)} fill="none" stroke="#e3d1ae" strokeWidth={2.5} strokeDasharray="8 7" strokeLinejoin="round" />
        {pebbles.map((p, i) => {
          const [cx, cy] = project(p.x, p.y);
          return <ellipse key={i} cx={cx} cy={cy} rx={3.4 + (i % 3)} ry={1.8 + (i % 2) * 0.6} fill={i % 2 ? "#cfc6b4" : "#e3d1ae"} />;
        })}
        {tufts.map((t, i) => {
          const [cx, cy] = project(t.x, t.y);
          return <path key={i} d={`M${cx - 4} ${cy}l2 -7M${cx} ${cy}v-9M${cx + 4} ${cy}l-2 -7`} stroke="#98b884" strokeWidth={2} strokeLinecap="round" fill="none" />;
        })}
        {flowers.map((f, i) => {
          const [cx, cy] = project(f.x, f.y);
          return (
            <g key={i}>
              {[0, 90, 180, 270].map((deg) => (
                <circle key={deg} cx={cx + 3 * Math.cos((deg * Math.PI) / 180)} cy={cy + 1.7 * Math.sin((deg * Math.PI) / 180)} r={2.4} fill={f.c} />
              ))}
              <circle cx={cx} cy={cy} r={1.7} fill="#e6bb62" />
            </g>
          );
        })}
      </g>
      <Fence side="back" />
    </g>
  );
}

// ───────── 움직이는 분위기 요소 ─────────

function Butterfly({ x, y, d, c }: { x: number; y: number; d: number; c: string }) {
  const [sx, sy] = project(x, y, 60);
  return (
    <g transform={`translate(${sx} ${sy})`}>
      <g className={styles.flit} style={{ animationDelay: `${-d}s`, animationDuration: `${7 + d}s` }}>
        <g className={styles.flap}>
          <ellipse cx={-4} cy={0} rx={4.5} ry={3} fill={c} />
          <ellipse cx={4} cy={0} rx={4.5} ry={3} fill={c} />
        </g>
        <rect x={-0.8} y={-3} width={1.6} height={6} rx={0.8} fill="#6b5a4a" />
      </g>
    </g>
  );
}

function Bird({ y, d, dur }: { y: number; d: number; dur: number }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <g className={styles.fly} style={{ animationDelay: `${-d}s`, animationDuration: `${dur}s` }}>
        <path className={styles.flap} d="M-9 0Q-4.5 -7 0 0Q4.5 -7 9 0" fill="none" stroke="#6b5a4a" strokeWidth={2.2} strokeLinecap="round" />
      </g>
    </g>
  );
}

export function Ambient() {
  return (
    <g pointerEvents="none">
      {/* 구름이 지나가며 드리우는 부드러운 그림자 */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} className={styles.drift} style={{ animationDelay: `${-i * 38}s` }}>
          <ellipse cx={STAGE_WIDTH * 0.1 + i * 90} cy={STAGE_HEIGHT * (0.12 + i * 0.1)} rx={300 + i * 40} ry={120 + i * 14} fill="rgba(70,95,60,0.1)" />
        </g>
      ))}
      <Bird y={STAGE_HEIGHT * 0.25} d={0} dur={46} />
      <Bird y={STAGE_HEIGHT * 0.3} d={3} dur={46} />
      <Bird y={STAGE_HEIGHT * 0.55} d={20} dur={58} />
      <Butterfly x={170} y={190} d={0} c="#f9c6d0" />
      <Butterfly x={760} y={210} d={2} c="#f3dc9c" />
      <Butterfly x={250} y={430} d={4} c="#cfe3f2" />
      <Butterfly x={620} y={470} d={1} c="#f9c6d0" />
    </g>
  );
}
