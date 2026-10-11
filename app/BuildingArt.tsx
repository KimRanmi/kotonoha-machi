import type { InteriorKind } from "./interiors";

// 마을 맵의 건물 그림 (지브리풍): 따뜻한 흙빛 팔레트, 손으로 그린 듯 살짝 일렁이는 가장자리와
// 종이 질감(SVG 필터), 널판/회벽/석재/기와 질감, 불 켜진 창, 덩굴과 꽃으로 사람 사는 느낌을 낸다.
// 이미지 파일 없이 SVG만 쓴다. 건물 영역(x/y/width/height)은 그대로이고, 그림은 그 영역을 꽉 채운다.
// 지붕·차양·그림자는 영역 밖으로 살짝 튀어나올 수 있지만(overflow: visible)
// 충돌/클릭 판정과는 무관한 장식이다. kind가 없는 건물(테마로 지은 건물)은 학습관 모양으로 그린다.

type ArtProps = { w: number; h: number; id: string };

const WOOD = "#d9a56b";
const WOOD_LINE = "#b57f4a";
const PLASTER = "#f4e6c6";
const PLASTER_SHADE = "#e3cba0";
const STONE = "#b9ad98";
const STONE_DARK = "#948873";
const GLOW = "#ffe08a";
const FRAME = "#6b4a2f";

function GroundShadow({ w, h }: { w: number; h: number }) {
  return <ellipse cx={w / 2 + 6} cy={h + 2} rx={w * 0.62} ry={11} fill="rgba(40,70,30,0.38)" filter="url(#gh-blur)" />;
}

// 벽 재질
function WoodWall({ w, h, top }: { w: number; h: number; top: number }) {
  const lines = [];
  for (let y = top + 9; y < h - 12; y += 9) lines.push(<path key={y} d={`M5 ${y}H${w - 5}`} stroke={WOOD_LINE} strokeWidth={1.4} opacity={0.6} />);
  return (
    <g>
      <rect x={3} y={top} width={w - 6} height={h - top} rx={7} fill={WOOD} />
      <rect x={3} y={top} width={(w - 6) * 0.3} height={h - top} rx={7} fill="#f0c590" opacity={0.45} />
      {lines}
    </g>
  );
}

function PlasterWall({ w, h, top, color = PLASTER, shade = PLASTER_SHADE }: { w: number; h: number; top: number; color?: string; shade?: string }) {
  return (
    <g>
      <rect x={3} y={top} width={w - 6} height={h - top} rx={7} fill={color} />
      <rect x={w * 0.62} y={top} width={w * 0.38 - 3} height={h - top} rx={7} fill={shade} opacity={0.55} />
      {[[0.2, 0.55], [0.45, 0.8], [0.7, 0.6], [0.3, 0.85]].map(([fx, fy], i) => (
        <circle key={i} cx={w * fx} cy={top + (h - top) * fy} r={1.6} fill={shade} opacity={0.8} />
      ))}
    </g>
  );
}

// 아래쪽 석재 기단
function StoneBase({ w, h }: { w: number; h: number }) {
  const out = [];
  const bh = 12;
  for (let x = 4, i = 0; x < w - 8; x += 15 + (i % 3) * 3, i++) {
    const sw = 14 + (i % 3) * 3;
    out.push(<rect key={x} x={x} y={h - bh + (i % 2) * 2} width={Math.min(sw, w - 5 - x)} height={bh - (i % 2) * 2} rx={4} fill={i % 2 ? STONE : "#c6bba6"} />);
  }
  return (
    <g>
      <rect x={3} y={h - bh} width={w - 6} height={bh} rx={5} fill={STONE_DARK} />
      {out}
    </g>
  );
}

function Door({ w, h, dw, dh, color = "#8a5a36" }: { w: number; h: number; dw: number; dh: number; color?: string }) {
  const x = w / 2 - dw / 2;
  const y = h - 11 - dh;
  const r = dw / 2;
  return (
    <g>
      <path d={`M${x - 4} ${h - 11}V${y + r}A${r + 4} ${r + 4} 0 0 1 ${x + dw + 4} ${y + r}V${h - 11}Z`} fill={FRAME} />
      <path d={`M${x} ${h - 11}V${y + r}A${r} ${r} 0 0 1 ${x + dw} ${y + r}V${h - 11}Z`} fill={color} />
      <path d={`M${x + dw / 2} ${y}V${h - 11}`} stroke="#6b4426" strokeWidth={1.3} opacity={0.7} />
      <path d={`M${x + 3} ${y + r}V${h - 14}`} stroke="#f0c590" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      <circle cx={x + dw * 0.78} cy={h - 11 - dh * 0.4} r={2.2} fill="#f3d27a" />
    </g>
  );
}

// 불 켜진 창
function Win({ cx, cy, s = 20, box }: { cx: number; cy: number; s?: number; box?: string }) {
  const x = cx - s / 2;
  const y = cy - s / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={s * 0.95} fill={GLOW} opacity={0.22} />
      <rect x={x - 3} y={y - 3} width={s + 6} height={s + 6} rx={5} fill={FRAME} />
      <rect x={x} y={y} width={s} height={s} rx={3} fill={GLOW} />
      <rect x={x} y={y + s * 0.55} width={s} height={s * 0.45} rx={3} fill="#f6b95a" opacity={0.6} />
      <path d={`M${cx} ${y}V${y + s}M${x} ${cy}H${x + s}`} stroke={FRAME} strokeWidth={2} />
      <path d={`M${x + 3} ${y + 7}L${x + 8} ${y + 2.5}`} stroke="#fff" strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
      {box && (
        <g>
          <rect x={x - 5} y={y + s + 2} width={s + 10} height={7} rx={3} fill="#8a5a36" />
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((f, i) => (
            <circle key={i} cx={x - 5 + (s + 10) * f} cy={y + s + 1} r={3.2} fill={i % 2 ? box : "#fff7e0"} />
          ))}
          <path d={`M${x - 3} ${y + s + 3}H${x + s + 3}`} stroke="#6f9a52" strokeWidth={3} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

// 벽을 타고 오르는 덩굴
function Ivy({ x, h, top }: { x: number; h: number; top: number }) {
  const leaves = [];
  for (let y = h - 14, i = 0; y > top + 6; y -= 8, i++) {
    leaves.push(<circle key={i} cx={x + Math.sin(i * 1.7) * 3.5} cy={y} r={3.4 + (i % 2)} fill={i % 3 ? "#6f9a52" : "#8fb866"} />);
  }
  return <g>{leaves}</g>;
}

// 기와지붕: 모양 위에 기와 줄무늬를 깔고 처마·이끼·하이라이트를 얹는다.
function TileRoof({ id, d, base, light, dark, w, top, bottom, rows = 4, moss }: { id: string; d: string; base: string; light: string; dark: string; w: number; top: number; bottom: number; rows?: number; moss?: boolean }) {
  const cid = `rc-${id}`;
  const r = 7;
  const arcs = [];
  for (let row = 0; row < rows; row++) {
    const y = top + ((bottom - top) * (row + 1)) / (rows + 0.4);
    const off = row % 2 ? r : 0;
    let p = "";
    for (let x = -12 + off; x < w + 14; x += r * 2) p += `M${x} ${y}q${r} ${r * 1.1} ${r * 2} 0`;
    arcs.push(<path key={row} d={p} fill="none" stroke={dark} strokeWidth={1.8} opacity={0.55} strokeLinecap="round" />);
  }
  return (
    <g>
      <clipPath id={cid}>
        <path d={d} />
      </clipPath>
      <path d={d} transform="translate(0 7)" fill={dark} />
      <path d={d} fill={base} />
      <g clipPath={`url(#${cid})`}>
        <rect x={-14} y={top - 4} width={w + 28} height={(bottom - top) * 0.34} fill={light} opacity={0.45} />
        {arcs}
        {moss && [[0.2, 0.72], [0.34, 0.8], [0.72, 0.7], [0.82, 0.78]].map(([fx, fy], i) => <circle key={i} cx={w * fx} cy={top + (bottom - top) * fy} r={4.5} fill="#7fa457" opacity={0.65} />)}
      </g>
      <path d={d} fill="none" stroke={dark} strokeWidth={1.6} opacity={0.5} strokeLinejoin="round" />
    </g>
  );
}

function Smoke({ x, y }: { x: number; y: number }) {
  return (
    <g fill="#fff" opacity={0.7}>
      <circle cx={x} cy={y - 6} r={5} />
      <circle cx={x + 5} cy={y - 15} r={6.5} opacity={0.75} />
      <circle cx={x + 3} cy={y - 26} r={8} opacity={0.55} />
    </g>
  );
}

function Cafe({ w, h, id }: ArtProps) {
  const bt = h * 0.4;
  const dw = Math.max(30, w * 0.26);
  const dh = h * 0.46;
  const doorTop = h - 11 - dh;
  const strip = dw / 3;
  const roof = `M-9 ${bt + 6} Q${w * 0.12} ${bt * 0.45} ${w * 0.32} -4 Q${w / 2} -10 ${w * 0.68} -4 Q${w * 0.88} ${bt * 0.45} ${w + 9} ${bt + 6} Q${w / 2} ${bt + 12} -9 ${bt + 6}Z`;
  return (
    <>
      <WoodWall w={w} h={h} top={bt} />
      <StoneBase w={w} h={h} />
      <Ivy x={w - 10} h={h} top={bt} />
      <Win cx={w * 0.8} cy={h * 0.66} s={18} box="#f08aa5" />
      {/* 찻집 간판 */}
      <path d={`M${w * 0.17} ${bt + 4}V${bt + 12}`} stroke={FRAME} strokeWidth={2} />
      <rect x={w * 0.17 - 12} y={bt + 12} width={24} height={22} rx={6} fill="#f6e7c8" stroke={FRAME} strokeWidth={2.2} />
      <text x={w * 0.17} y={bt + 28} textAnchor="middle" fontSize={15} fontWeight={900} fill="#5c7a3c">茶</text>
      <Door w={w} h={h} dw={dw} dh={dh} />
      <rect x={w / 2 - dw / 2 - 6} y={doorTop - 2} width={dw + 12} height={4} rx={2} fill={FRAME} />
      {[0, 1, 2].map((i) => {
        const x = w / 2 - dw / 2 + i * strip + 1;
        const bw = strip - 2;
        const bh = dh * 0.58;
        return <path key={i} d={`M${x} ${doorTop + 2}H${x + bw}V${doorTop + bh}L${x + bw / 2} ${doorTop + bh - 6}L${x} ${doorTop + bh}Z`} fill={i === 1 ? "#8fb866" : "#7da85a"} stroke="#5c7a3c" strokeWidth={1.2} strokeLinejoin="round" />;
      })}
      <rect x={w * 0.66} y={-12} width={13} height={bt * 0.7} rx={2} fill={STONE} />
      <Smoke x={w * 0.66 + 6} y={-12} />
      <TileRoof id={`${id}r`} d={roof} base="#c9694a" light="#e08d6b" dark="#9a4d35" w={w} top={-8} bottom={bt + 6} rows={4} moss />
    </>
  );
}

function Shop({ w, h, id }: ArtProps) {
  const bt = h * 0.28;
  const ah = h * 0.28;
  const n = 8;
  const total = w + 12;
  const sw = total / n;
  const dw = Math.max(28, w * 0.22);
  const roof = `M-8 ${bt} Q${w * 0.2} ${bt * 0.3} ${w / 2} -4 Q${w * 0.8} ${bt * 0.3} ${w + 8} ${bt} Q${w / 2} ${bt + 5} -8 ${bt}Z`;
  return (
    <>
      <PlasterWall w={w} h={h} top={bt} />
      <StoneBase w={w} h={h} />
      <Win cx={w * 0.2} cy={h * 0.7} s={22} />
      <Win cx={w * 0.8} cy={h * 0.7} s={22} />
      <Door w={w} h={h} dw={dw} dh={h * 0.46} color="#5f8f9e" />
      {/* 과일 상자 */}
      <rect x={w * 0.8 - 2} y={h - 24} width={24} height={13} rx={3} fill="#a97a4a" />
      {[0, 1, 2].map((i) => <circle key={i} cx={w * 0.8 + 5 + i * 7} cy={h - 25} r={4.2} fill={["#e8694f", "#f2b84b", "#8fb866"][i]} />)}
      <rect x={-3} y={bt + ah - 2} width={w + 6} height={11} rx={5} fill="rgba(60,40,25,0.2)" />
      {/* 줄무늬 차양 */}
      {Array.from({ length: n }, (_, i) => {
        const x = -6 + i * sw;
        return <path key={i} d={`M${x} ${bt}H${x + sw}V${bt + ah}A${sw / 2} ${sw / 2} 0 0 1 ${x} ${bt + ah}Z`} fill={i % 2 === 0 ? "#d9604c" : "#fbf0d8"} stroke="#a64a3a" strokeWidth={1} strokeOpacity={0.4} />;
      })}
      <TileRoof id={`${id}r`} d={roof} base="#b8573f" light="#d77d5e" dark="#8f3f2c" w={w} top={-4} bottom={bt} rows={2} />
    </>
  );
}

function Hall({ w, h, id }: ArtProps) {
  const bt = h * 0.42;
  const dw = Math.max(34, w * 0.2);
  const roof = `M-12 ${bt + 6} Q${w * 0.08} ${bt - 2} ${w * 0.22} 8 H${w * 0.78} Q${w * 0.92} ${bt - 2} ${w + 12} ${bt + 6} Q${w / 2} ${bt + 16} -12 ${bt + 6}Z`;
  return (
    <>
      <PlasterWall w={w} h={h} top={bt} />
      {/* 목조 뼈대 */}
      {[0.06, 0.34, 0.66, 0.94].map((f, i) => <path key={i} d={`M${w * f} ${bt + 4}V${h - 12}`} stroke="#8a5a36" strokeWidth={3} strokeLinecap="round" />)}
      <path d={`M5 ${bt + 5}H${w - 5}`} stroke="#8a5a36" strokeWidth={3} />
      <StoneBase w={w} h={h} />
      <Win cx={w * 0.2} cy={h * 0.7} s={20} box="#f2b84b" />
      <Win cx={w * 0.8} cy={h * 0.7} s={20} box="#f2b84b" />
      <Door w={w} h={h} dw={dw} dh={h * 0.44} />
      <TileRoof id={`${id}r`} d={roof} base="#6f918f" light="#9ec0b4" dark="#4f726f" w={w} top={6} bottom={bt + 6} rows={4} moss />
      {/* 시계 */}
      <circle cx={w / 2} cy={bt * 0.5} r={9} fill="#f6e7c8" stroke={FRAME} strokeWidth={2.2} />
      <path d={`M${w / 2} ${bt * 0.5 - 5}V${bt * 0.5}L${w / 2 + 4} ${bt * 0.5 + 2}`} stroke={FRAME} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {[0.22, 0.78].map((f, i) => <circle key={i} cx={w * f} cy={7} r={5} fill="#d4a45a" />)}
    </>
  );
}

function Learning({ w, h, id }: ArtProps) {
  const bt = h * 0.4;
  const dw = Math.max(28, w * 0.22);
  const dh = h * 0.4;
  const by = h - 11 - dh - 14;
  const roof = `M-9 ${bt + 6} Q${w * 0.25} ${bt * 0.55} ${w / 2} -8 Q${w * 0.75} ${bt * 0.55} ${w + 9} ${bt + 6} Q${w / 2} ${bt + 12} -9 ${bt + 6}Z`;
  return (
    <>
      <WoodWall w={w} h={h} top={bt} />
      <StoneBase w={w} h={h} />
      <Ivy x={10} h={h} top={bt} />
      <Win cx={w * 0.2} cy={h * 0.67} s={17} box="#f08aa5" />
      <Win cx={w * 0.8} cy={h * 0.67} s={17} />
      <Door w={w} h={h} dw={dw} dh={dh} />
      {/* 펼친 책 간판 */}
      <rect x={w / 2 - 20} y={by - 10} width={40} height={22} rx={7} fill="#f6e7c8" stroke={FRAME} strokeWidth={2} />
      <path d={`M${w / 2} ${by - 3} Q${w / 2 - 7} ${by - 7} ${w / 2 - 14} ${by - 4} V${by + 6} Q${w / 2 - 7} ${by + 3} ${w / 2} ${by + 8}Z M${w / 2} ${by - 3} Q${w / 2 + 7} ${by - 7} ${w / 2 + 14} ${by - 4} V${by + 6} Q${w / 2 + 7} ${by + 3} ${w / 2} ${by + 8}Z`} fill="#fff" stroke="#5f8f9e" strokeWidth={1.6} strokeLinejoin="round" />
      <TileRoof id={`${id}r`} d={roof} base="#5f9aa8" light="#8cc3c8" dark="#437580" w={w} top={-8} bottom={bt + 6} rows={4} moss />
    </>
  );
}

function Heart({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return (
    <g>
      <path d={`M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.2} ${cx - s * 0.6} ${cy - s * 1.2} ${cx} ${cy - s * 0.3} C${cx + s * 0.6} ${cy - s * 1.2} ${cx + s * 1.6} ${cy - s * 0.2} ${cx} ${cy + s * 0.9}Z`} fill="#e0525e" />
      <circle cx={cx - s * 0.6} cy={cy - s * 0.3} r={s * 0.22} fill="#fff" opacity={0.8} />
    </g>
  );
}

function Home({ w, h, id }: ArtProps) {
  const bt = h * 0.4;
  const dw = Math.max(28, w * 0.24);
  const dh = h * 0.44;
  const roof = `M-9 ${bt + 6} Q${w * 0.25} ${bt * 0.55} ${w / 2} -8 Q${w * 0.75} ${bt * 0.55} ${w + 9} ${bt + 6} Q${w / 2} ${bt + 12} -9 ${bt + 6}Z`;
  return (
    <>
      <PlasterWall w={w} h={h} top={bt} color="#f8dccb" shade="#e8b9a4" />
      <StoneBase w={w} h={h} />
      <rect x={w * 0.68} y={-8} width={14} height={bt * 0.75} rx={2} fill={STONE} />
      <Smoke x={w * 0.68 + 7} y={-8} />
      <Win cx={w * 0.2} cy={h * 0.67} s={17} box="#f08aa5" />
      <Win cx={w * 0.8} cy={h * 0.67} s={17} box="#f08aa5" />
      <Door w={w} h={h} dw={dw} dh={dh} color="#f6e7c8" />
      <Heart cx={w / 2} cy={h - 11 - dh * 0.48} s={7} />
      <TileRoof id={`${id}r`} d={roof} base="#c9675f" light="#e38d80" dark="#9a4440" w={w} top={-8} bottom={bt + 6} rows={4} />
    </>
  );
}

export function BuildingArt({ kind, w, h }: { kind?: InteriorKind; w: number; h: number }) {
  const Art = kind === "cafe" ? Cafe : kind === "shop" ? Shop : kind === "hall" ? Hall : kind === "home" ? Home : Learning;
  const id = `${kind ?? "learning"}-${w}-${h}`;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      overflow="visible"
      aria-hidden="true"
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      <defs>
        <filter id="gh-blur" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        {/* 손그림 느낌: 가장자리를 살짝 일렁이게 + 종이 질감을 입힌다 */}
        <filter id="gh-paint" x="-8%" y="-12%" width="116%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.2" result="wob" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="8" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.24  0 0 0 0 0.12  0 0 0 -0.9 0.55" result="grainTint" />
          <feComposite in="grainTint" in2="wob" operator="in" result="grainIn" />
          <feBlend in="grainIn" in2="wob" mode="multiply" />
        </filter>
      </defs>
      <GroundShadow w={w} h={h} />
      <g filter="url(#gh-paint)">
        <Art w={w} h={h} id={id} />
      </g>
    </svg>
  );
}
