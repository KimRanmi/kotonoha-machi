import type { InteriorKind } from "./interiors";

// 마을 맵의 건물 그림 (파스텔 미니어처): 윤곽선 없이 면 색만 쓰는 납작한 디자인에,
// "옆면 + 지붕 옆면"을 비스듬히 붙여서 작은 블록 모형처럼 보이게 한다. 이미지 파일 없이 SVG만 쓴다.
// 건물 영역(x/y/width/height)은 그대로이고, 그림은 그 영역 안에 앞면+옆면이 들어가게 그린다.
// 지붕·차양·그림자는 영역 밖으로 살짝 튀어나올 수 있지만(overflow: visible)
// 충돌/클릭 판정과는 무관한 장식이다. kind가 없는 건물(테마로 지은 건물)은 학습관 모양으로 그린다.
// 방향 규칙: 건물 깊이는 오른쪽 위(+S, -DY)로 이어진다.

type ArtProps = { w: number; h: number };

const S = 16; // 옆면 폭
const DY = 8; // 옆면이 올라가는 높이

type Tone = {
  front: string; // 앞벽
  side: string; // 옆벽
  roofF: string; // 지붕 앞면
  roofS: string; // 지붕 옆면(박공)
  door: string;
};

const WIN = "#c2dce0";
const WIN_SIDE = "#a9ced6";
const SILL = "#fffaf0";

function GroundShadow({ w, h }: ArtProps) {
  return <ellipse cx={w / 2 + 8} cy={h + 1} rx={w * 0.58} ry={9} fill="rgba(90,110,70,0.2)" />;
}

// 옆면 위의 점: t(0~1)는 앞→뒤 깊이, z는 바닥에서의 높이
const sidePt = (fw: number, h: number, t: number, z: number): [number, number] => [fw + S * t, h - z - DY * t];
const pts = (a: [number, number][]) => a.map((p) => p.join(",")).join(" ");

// 벽(앞면 + 옆면) + 바닥 띠
function Block({ w, h, bt, tone }: ArtProps & { bt: number; tone: Tone }) {
  const fw = w - S; // 앞면 폭
  return (
    <g>
      <rect x={2} y={bt} width={fw - 2} height={h - bt} rx={4} fill={tone.front} />
      <polygon points={pts([[fw, bt], [w, bt - DY], [w, h - DY], [fw, h]])} fill={tone.side} />
      <rect x={2} y={h - 7} width={fw - 2} height={7} rx={3} fill="#000" opacity={0.05} />
      <rect x={6} y={bt + 5} width={fw * 0.28} height={4} rx={2} fill="#fff" opacity={0.55} />
    </g>
  );
}

// 앞면의 문 (아치)
function Door({ cx, h, dw, dh, color }: { cx: number; h: number; dw: number; dh: number; color: string }) {
  const x = cx - dw / 2;
  const y = h - dh;
  const r = dw / 2;
  return (
    <g>
      <path d={`M${x - 3} ${h}V${y + r}A${r + 3} ${r + 3} 0 0 1 ${x + dw + 3} ${y + r}V${h}Z`} fill={SILL} />
      <path d={`M${x} ${h}V${y + r}A${r} ${r} 0 0 1 ${x + dw} ${y + r}V${h}Z`} fill={color} />
      <circle cx={x + dw * 0.76} cy={h - dh * 0.42} r={2} fill={SILL} />
    </g>
  );
}

// 앞면 창
function FrontWin({ cx, cy, s = 18, flower }: { cx: number; cy: number; s?: number; flower?: string }) {
  const x = cx - s / 2;
  const y = cy - s / 2;
  return (
    <g>
      <rect x={x - 3} y={y - 3} width={s + 6} height={s + 6} rx={6} fill={SILL} />
      <rect x={x} y={y} width={s} height={s} rx={4} fill={WIN} />
      <path d={`M${cx} ${y}V${y + s}M${x} ${cy}H${x + s}`} stroke={SILL} strokeWidth={2} />
      {flower && (
        <g>
          <rect x={x - 3} y={y + s + 1} width={s + 6} height={5} rx={2.5} fill="#9cc08a" />
          {[0.2, 0.5, 0.8].map((f, i) => <circle key={i} cx={x - 3 + (s + 6) * f} cy={y + s + 1} r={2.6} fill={i === 1 ? "#fffaf0" : flower} />)}
        </g>
      )}
    </g>
  );
}

// 옆면 창 (비스듬한 평행사변형)
function SideWin({ w, h, z0, z1 }: { w: number; h: number; z0: number; z1: number }) {
  const fw = w - S;
  return <polygon points={pts([sidePt(fw, h, 0.28, z0), sidePt(fw, h, 0.72, z0), sidePt(fw, h, 0.72, z1), sidePt(fw, h, 0.28, z1)])} fill={WIN_SIDE} />;
}

// 박공지붕: 앞 경사면(평행사변형) + 오른쪽 박공 삼각형 + 용마루 하이라이트 + 처마 그림자
function Roof({ w, bt, rh, tone, over = 6 }: { w: number; bt: number; rh: number; tone: Tone; over?: number }) {
  const fw = w - S;
  const L: [number, number] = [-over, bt];
  const R: [number, number] = [fw + over, bt];
  const RR: [number, number] = [fw + over + S / 2, bt - DY / 2 - rh];
  const LL: [number, number] = [-over + S / 2, bt - DY / 2 - rh];
  const B: [number, number] = [fw + over + S, bt - DY];
  return (
    <g>
      <polygon points={pts([[-over + 2, bt + 6], [fw + over - 2, bt + 6], [fw + over - 2, bt + 1], [-over + 2, bt + 1]])} fill="#000" opacity={0.08} />
      <polygon points={pts([R, B, RR])} fill={tone.roofS} />
      <polygon points={pts([L, R, RR, LL])} fill={tone.roofF} />
      <polygon points={pts([LL, RR, [RR[0], RR[1] + 5], [LL[0], LL[1] + 5]])} fill="#fff" opacity={0.4} />
      <polygon points={pts([L, R, [R[0], R[1] - 4], [L[0], L[1] - 4]])} fill="#000" opacity={0.06} />
    </g>
  );
}

function Cafe({ w, h }: ArtProps) {
  const t: Tone = { front: "#f7ebd8", side: "#e5d0b4", roofF: "#e2a3a3", roofS: "#cd8886", door: "#93b99a" };
  const bt = h * 0.42;
  const fw = w - S;
  const dw = Math.max(26, fw * 0.24);
  const dh = h * 0.44;
  const strip = dw / 3;
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Block w={w} h={h} bt={bt} tone={t} />
      <FrontWin cx={fw * 0.82} cy={h * 0.68} flower="#e6a6a9" />
      <circle cx={fw * 0.17} cy={h * 0.66} r={12} fill={SILL} />
      <circle cx={fw * 0.17} cy={h * 0.66} r={9} fill="#c4dcb4" />
      <text x={fw * 0.17} y={h * 0.66 + 4.5} textAnchor="middle" fontSize={12} fontWeight={900} fill="#4f6f3c">茶</text>
      <Door cx={fw / 2} h={h} dw={dw} dh={dh} color={t.door} />
      <rect x={fw / 2 - dw / 2 - 5} y={h - dh - 2} width={dw + 10} height={4} rx={2} fill="#c09c72" />
      {[0, 1, 2].map((i) => {
        const x = fw / 2 - dw / 2 + i * strip + 1;
        const bw = strip - 2;
        const bh = dh * 0.5;
        return <path key={i} d={`M${x} ${h - dh + 2}H${x + bw}V${h - dh + bh}L${x + bw / 2} ${h - dh + bh - 5}L${x} ${h - dh + bh}Z`} fill="#9cc08a" />;
      })}
      <SideWin w={w} h={h} z0={h * 0.3} z1={h * 0.52} />
      <Roof w={w} bt={bt} rh={22} tone={t} />
    </>
  );
}

function Shop({ w, h }: ArtProps) {
  const t: Tone = { front: "#f7ebd8", side: "#e5d0b4", roofF: "#9ec0c6", roofS: "#84aab0", door: "#9ec0c6" };
  const bt = h * 0.32;
  const fw = w - S;
  const ah = h * 0.24;
  const n = 7;
  const sw = (fw + 8) / n;
  const dw = Math.max(26, fw * 0.2);
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Block w={w} h={h} bt={bt} tone={t} />
      <FrontWin cx={fw * 0.2} cy={h * 0.7} s={20} />
      <FrontWin cx={fw * 0.8} cy={h * 0.7} s={20} />
      <Door cx={fw / 2} h={h} dw={dw} dh={h * 0.44} color={t.door} />
      <SideWin w={w} h={h} z0={h * 0.3} z1={h * 0.52} />
      <rect x={-2} y={bt + ah - 1} width={fw + 4} height={9} rx={4} fill="#000" opacity={0.07} />
      {Array.from({ length: n }, (_, i) => {
        const x = -4 + i * sw;
        return <path key={i} d={`M${x} ${bt}H${x + sw}V${bt + ah}A${sw / 2} ${sw / 2} 0 0 1 ${x} ${bt + ah}Z`} fill={i % 2 === 0 ? "#ecb8b8" : "#fffaf0"} />;
      })}
      <Roof w={w} bt={bt} rh={14} tone={t} over={5} />
    </>
  );
}

function Hall({ w, h }: ArtProps) {
  const t: Tone = { front: "#f7ebd8", side: "#e5d0b4", roofF: "#b9aec9", roofS: "#a79bb8", door: "#c09c72" };
  const bt = h * 0.42;
  const fw = w - S;
  const dw = Math.max(30, fw * 0.2);
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Block w={w} h={h} bt={bt} tone={t} />
      <FrontWin cx={fw * 0.2} cy={h * 0.7} s={20} />
      <FrontWin cx={fw * 0.8} cy={h * 0.7} s={20} />
      <Door cx={fw / 2} h={h} dw={dw} dh={h * 0.42} color={t.door} />
      <SideWin w={w} h={h} z0={h * 0.3} z1={h * 0.52} />
      <Roof w={w} bt={bt} rh={24} tone={t} over={8} />
      <circle cx={fw / 2 + 4} cy={bt - 11} r={8} fill={SILL} />
      <path d={`M${fw / 2 + 4} ${bt - 16}V${bt - 11}L${fw / 2 + 8} ${bt - 9}`} stroke="#8a7a6e" strokeWidth={1.8} fill="none" strokeLinecap="round" />
    </>
  );
}

function Learning({ w, h }: ArtProps) {
  const t: Tone = { front: "#f7ebd8", side: "#e5d0b4", roofF: "#a9c6cb", roofS: "#8fb5bd", door: "#c09c72" };
  const bt = h * 0.42;
  const fw = w - S;
  const dw = Math.max(26, fw * 0.22);
  const dh = h * 0.4;
  const by = h - dh - 12;
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Block w={w} h={h} bt={bt} tone={t} />
      <FrontWin cx={fw * 0.2} cy={h * 0.68} s={16} flower="#e6a6a9" />
      <FrontWin cx={fw * 0.8} cy={h * 0.68} s={16} />
      <Door cx={fw / 2} h={h} dw={dw} dh={dh} color={t.door} />
      <rect x={fw / 2 - 18} y={by - 9} width={36} height={19} rx={9} fill={SILL} />
      <path d={`M${fw / 2} ${by - 3}Q${fw / 2 - 7} ${by - 6} ${fw / 2 - 13} ${by - 4}V${by + 5}Q${fw / 2 - 7} ${by + 3} ${fw / 2} ${by + 7}Z M${fw / 2} ${by - 3}Q${fw / 2 + 7} ${by - 6} ${fw / 2 + 13} ${by - 4}V${by + 5}Q${fw / 2 + 7} ${by + 3} ${fw / 2} ${by + 7}Z`} fill="#a9c6cb" />
      <SideWin w={w} h={h} z0={h * 0.3} z1={h * 0.52} />
      <Roof w={w} bt={bt} rh={20} tone={t} />
    </>
  );
}

function Heart({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return <path d={`M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.2} ${cx - s * 0.6} ${cy - s * 1.2} ${cx} ${cy - s * 0.3} C${cx + s * 0.6} ${cy - s * 1.2} ${cx + s * 1.6} ${cy - s * 0.2} ${cx} ${cy + s * 0.9}Z`} fill="#e08a90" />;
}

function Home({ w, h }: ArtProps) {
  const t: Tone = { front: "#f8e2e0", side: "#ecc3c4", roofF: "#ecb8b8", roofS: "#dc9ea0", door: "#fffaf0" };
  const bt = h * 0.42;
  const fw = w - S;
  const dw = Math.max(26, fw * 0.24);
  const dh = h * 0.42;
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Block w={w} h={h} bt={bt} tone={t} />
      <FrontWin cx={fw * 0.2} cy={h * 0.68} s={16} flower="#e08a90" />
      <FrontWin cx={fw * 0.8} cy={h * 0.68} s={16} flower="#e08a90" />
      <Door cx={fw / 2} h={h} dw={dw} dh={dh} color={t.door} />
      <Heart cx={fw / 2} cy={h - dh * 0.48} s={6.5} />
      <SideWin w={w} h={h} z0={h * 0.3} z1={h * 0.52} />
      <rect x={fw * 0.62} y={bt - 30} width={13} height={22} rx={3} fill="#dc9ea0" />
      <Roof w={w} bt={bt} rh={20} tone={t} />
    </>
  );
}

export function BuildingArt({ kind, w, h }: { kind?: InteriorKind } & ArtProps) {
  const Art = kind === "cafe" ? Cafe : kind === "shop" ? Shop : kind === "hall" ? Hall : kind === "home" ? Home : Learning;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      overflow="visible"
      aria-hidden="true"
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      <Art w={w} h={h} />
    </svg>
  );
}
