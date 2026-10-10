import type { InteriorKind } from "./interiors";

// 마을 맵의 건물 그림. 이미지 파일 없이 SVG(그라데이션·그림자 포함)만으로 그리고,
// 장난감 블록처럼 보이도록 두께(밑판)·지붕 처마 그림자·창틀·문턱·바닥 그림자를 넣었다.
// 건물 영역(x/y/width/height)은 그대로이고, 그림은 그 영역을 꽉 채운다. 지붕·차양·그림자는 영역 밖으로
// 살짝 튀어나올 수 있지만(overflow: visible) 충돌/클릭 판정과는 무관한 장식이다.
// kind가 없는 건물(테마로 지은 건물)은 학습관 모양으로 그린다.

const EDGE = "#a8794c"; // 윤곽선(진한 나무색)
const SW = 2.5;

type ArtProps = { w: number; h: number };

function Defs() {
  const lin = (id: string, a: string, b: string) => (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  );
  return (
    <defs>
      {lin("bg-wall", "#fffbf2", "#f3dcbc")}
      {lin("bg-wallPink", "#fff0f3", "#f8cdd7")}
      {lin("bg-wood", "#f1cc9f", "#cb9560")}
      {lin("bg-tile", "#b3c4d6", "#6c849d")}
      {lin("bg-sky", "#d9f1fb", "#86c0da")}
      {lin("bg-pink", "#ffdbe2", "#ec97ad")}
      {lin("bg-awnP", "#fcd3dc", "#eb9db1")}
      {lin("bg-awnC", "#fffbf2", "#f1ddbf")}
      {lin("bg-door", "#d9a978", "#a2703f")}
      {lin("bg-doorSky", "#d2effc", "#7db9d6")}
      {lin("bg-doorWhite", "#ffffff", "#f6dfe5")}
      {lin("bg-matcha", "#c9e8bb", "#80b86d")}
      {lin("bg-glass", "#eaf8ff", "#98cde5")}
      {lin("bg-glassW", "#ffffff", "#e9dccb")}
      {lin("bg-plinth", "#e9cfa8", "#cfa97a")}
      <filter id="bg-blur" x="-20%" y="-50%" width="140%" height="200%">
        <feGaussianBlur stdDeviation="3.2" />
      </filter>
    </defs>
  );
}

// 바닥에 드리운 부드러운 그림자
function GroundShadow({ w, h }: ArtProps) {
  return (
    <ellipse cx={w / 2 + 5} cy={h + 3} rx={w * 0.6} ry={10} fill="rgba(70,45,30,0.32)" filter="url(#bg-blur)" />
  );
}

// 벽: 두께(밑판) + 그라데이션 + 오른쪽 음영 + 왼쪽 하이라이트 + 아래 석재 기단
function Wall({ w, h, top, grad = "bg-wall", edge = EDGE }: ArtProps & { top: number; grad?: string; edge?: string }) {
  const bh = h - top;
  return (
    <g>
      <rect x={-1} y={top + 5} width={w + 2} height={bh} rx={11} fill="#c79a6d" stroke={edge} strokeWidth={SW} />
      <rect x={2} y={top} width={w - 4} height={bh - 1} rx={10} fill={`url(#${grad})`} stroke={edge} strokeWidth={SW} />
      <path d={`M${w * 0.74} ${top + 1}H${w - 12}Q${w - 2} ${top + 1} ${w - 2} ${top + 11}V${h - 12}Q${w - 2} ${h - 2} ${w - 12} ${h - 2}H${w * 0.74}Z`} fill="rgba(120,80,50,0.13)" />
      <path d={`M7 ${top + 12}V${h - 14}`} stroke="#fff" strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round" />
      <rect x={6} y={h - 9} width={w - 12} height={7} rx={3} fill="url(#bg-plinth)" />
    </g>
  );
}

// 처마 아래 그림자 (지붕이 벽 위에 얹힌 느낌)
function Eave({ w, y }: { w: number; y: number }) {
  return <rect x={4} y={y} width={w - 8} height={9} rx={4} fill="rgba(90,55,35,0.22)" />;
}

function Door({ w, h, dw, dh, grad, frame = "#8a5b34" }: ArtProps & { dw: number; dh: number; grad: string; frame?: string }) {
  const x = w / 2 - dw / 2;
  const y = h - 9 - dh;
  const r = dw / 2;
  return (
    <g>
      <rect x={x - 6} y={h - 9} width={dw + 12} height={7} rx={3} fill="#d9bd94" stroke={EDGE} strokeWidth={1.5} />
      <path d={`M${x - 3} ${h - 9}V${y + r}A${r + 3} ${r + 3} 0 0 1 ${x + dw + 3} ${y + r}V${h - 9}Z`} fill={frame} />
      <path d={`M${x} ${h - 9}V${y + r}A${r} ${r} 0 0 1 ${x + dw} ${y + r}V${h - 9}Z`} fill={`url(#${grad})`} />
      <path d={`M${x + 4} ${h - 12}V${y + r}`} stroke="#fff" strokeOpacity={0.45} strokeWidth={2} strokeLinecap="round" />
      <circle cx={x + dw * 0.76} cy={h - 9 - dh * 0.42} r={2} fill="#fff3c4" stroke={frame} strokeWidth={1} />
    </g>
  );
}

function Win({ cx, cy, r, glass = "bg-glass" }: { cx: number; cy: number; r: number; glass?: string }) {
  return (
    <g>
      <rect x={cx - r - 3} y={cy + r - 1} width={2 * r + 6} height={5} rx={2.5} fill="#c9a074" stroke={EDGE} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={r + 2.5} fill="#e0b98a" stroke={EDGE} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${glass})`} />
      <path d={`M${cx - r} ${cy}H${cx + r}M${cx} ${cy - r}V${cy + r}`} stroke="#c9a074" strokeWidth={1.4} />
      <path d={`M${cx - r * 0.6} ${cy - r * 0.2}Q${cx - r * 0.4} ${cy - r * 0.65} ${cx} ${cy - r * 0.7}`} fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.9} />
    </g>
  );
}

function Cafe({ w, h }: ArtProps) {
  const bt = h * 0.38;
  const dw = Math.max(30, w * 0.26);
  const dh = h * 0.46;
  const doorTop = h - 9 - dh;
  const strip = dw / 3;
  const roof = `M-8 ${bt + 6} C-8 -8 ${w * 0.25} -5 ${w / 2} -5 C${w * 0.75} -5 ${w + 8} -8 ${w + 8} ${bt + 6}Z`;
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Wall w={w} h={h} top={bt} />
      <Eave w={w} y={bt + 4} />
      <Win cx={w * 0.83} cy={h * 0.66} r={10} />
      <circle cx={w * 0.17} cy={h * 0.66} r={13} fill="#fff" stroke={EDGE} strokeWidth={2} />
      <circle cx={w * 0.17} cy={h * 0.66} r={9.5} fill="none" stroke="#e8cfa8" strokeWidth={1.5} />
      <text x={w * 0.17} y={h * 0.66 + 5} textAnchor="middle" fontSize={13} fontWeight={900} fill="#5a4034">茶</text>
      <Door w={w} h={h} dw={dw} dh={dh} grad="bg-door" />
      {/* 노렌 */}
      <path d={`M${w / 2 - dw / 2 - 7} ${doorTop + 1}H${w / 2 + dw / 2 + 7}`} stroke="#7a4f2d" strokeWidth={3.5} strokeLinecap="round" />
      {[0, 1, 2].map((i) => {
        const x = w / 2 - dw / 2 + i * strip + 1.2;
        const bw = strip - 2.4;
        const bh = dh * 0.56;
        return (
          <g key={i}>
            <path d={`M${x} ${doorTop + 3}H${x + bw}V${doorTop + bh}L${x + bw / 2} ${doorTop + bh - 6}L${x} ${doorTop + bh}Z`} fill="url(#bg-matcha)" stroke="#5f9a4e" strokeWidth={1.4} strokeLinejoin="round" />
            <path d={`M${x + 2} ${doorTop + 5}V${doorTop + bh - 6}`} stroke="#fff" strokeOpacity={0.5} strokeWidth={1.5} strokeLinecap="round" />
          </g>
        );
      })}
      {/* 둥근 지붕: 두께 → 본체 → 기와 무늬 → 하이라이트 */}
      <path d={roof} transform="translate(0 6)" fill="#b57e4e" stroke={EDGE} strokeWidth={SW} strokeLinejoin="round" />
      <path d={roof} fill="url(#bg-wood)" stroke={EDGE} strokeWidth={SW} strokeLinejoin="round" />
      {[0.22, 0.4, 0.58, 0.76].map((f, i) => (
        <path key={i} d={`M${w * f - 14} ${bt + 2}Q${w * f} ${bt - 12 - (i % 2) * 2} ${w * f + 14} ${bt + 2}`} fill="none" stroke="#a8794c" strokeOpacity={0.55} strokeWidth={1.8} strokeLinecap="round" />
      ))}
      <path d={`M${w * 0.2} 10Q${w * 0.5} -2 ${w * 0.8} 10`} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" />
    </>
  );
}

function Shop({ w, h }: ArtProps) {
  const bt = h * 0.3;
  const ah = h * 0.26;
  const n = 8;
  const total = w + 12;
  const sw = total / n;
  const dw = Math.max(28, w * 0.22);
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Wall w={w} h={h} top={bt} />
      <Win cx={w * 0.2} cy={h * 0.7} r={11} glass="bg-glassW" />
      <Win cx={w * 0.8} cy={h * 0.7} r={11} glass="bg-glassW" />
      <Door w={w} h={h} dw={dw} dh={h * 0.46} grad="bg-doorSky" frame="#4f8aa6" />
      {/* 차양 그림자(벽 위) */}
      <path d={`M-6 ${bt + ah - 2}H${w + 6}V${bt + ah + 10}H-6Z`} fill="rgba(90,55,35,0.2)" />
      {/* 줄무늬 차양 + 물결 아랫단 (두께 → 면) */}
      <rect x={-7} y={bt - 12} width={total + 2} height={14} rx={5} fill="#d97f98" stroke={EDGE} strokeWidth={SW} />
      <path d={`M-6 ${bt - 11}H${w + 6}`} stroke="#fff" strokeOpacity={0.5} strokeWidth={2.5} strokeLinecap="round" />
      {Array.from({ length: n }, (_, i) => {
        const x = -6 + i * sw;
        return (
          <g key={i}>
            <path d={`M${x} ${bt}H${x + sw}V${bt + ah}A${sw / 2} ${sw / 2} 0 0 1 ${x} ${bt + ah}Z`} fill={`url(#${i % 2 === 0 ? "bg-awnP" : "bg-awnC"})`} stroke={EDGE} strokeWidth={1.8} strokeLinejoin="round" />
          </g>
        );
      })}
    </>
  );
}

function Hall({ w, h }: ArtProps) {
  const bt = h * 0.4;
  const dw = Math.max(34, w * 0.2);
  const roof = `M-14 ${bt + 4} Q${w * 0.1} ${bt - 2} ${w * 0.2} 6 H${w * 0.8} Q${w * 0.9} ${bt - 2} ${w + 14} ${bt + 4} Q${w / 2} ${bt + 15} -14 ${bt + 4}Z`;
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Wall w={w} h={h} top={bt} />
      <Eave w={w} y={bt + 6} />
      <Door w={w} h={h} dw={dw} dh={h * 0.44} grad="bg-door" />
      {[0.16, 0.72].map((f, i) => (
        <g key={i}>
          <rect x={w * f - 2} y={h * 0.58 - 2} width={w * 0.16 + 4} height={h * 0.2 + 4} rx={6} fill="#e0b98a" stroke={EDGE} strokeWidth={1.5} />
          <rect x={w * f + 1} y={h * 0.58 + 1} width={w * 0.16 - 2} height={h * 0.2 - 2} rx={4} fill="url(#bg-glass)" />
          <path d={`M${w * f + w * 0.08} ${h * 0.58 + 1}V${h * 0.78 - 1}M${w * f + 1} ${h * 0.68}H${w * f + w * 0.16 - 1}`} stroke="#c9a074" strokeWidth={1.4} />
        </g>
      ))}
      {/* 기와지붕: 두께 → 면 → 기와 줄 → 하이라이트 */}
      <path d={roof} transform="translate(0 6)" fill="#51667d" stroke="#46596e" strokeWidth={SW} strokeLinejoin="round" />
      <path d={roof} fill="url(#bg-tile)" stroke="#51667d" strokeWidth={SW} strokeLinejoin="round" />
      <path d={[0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76].map((f) => `M${w * f} 9V${bt + 5}`).join("")} stroke="#51667d" strokeWidth={1.4} opacity={0.5} />
      <path d={`M${w * 0.22} 12H${w * 0.78}`} stroke="#fff" strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${w * 0.2} 6H${w * 0.8}`} stroke="#46596e" strokeWidth={3} strokeLinecap="round" />
      {[0.2, 0.8].map((f, i) => (
        <g key={i}>
          <circle cx={w * f} cy={5} r={5.5} fill="url(#bg-wood)" stroke={EDGE} strokeWidth={1.8} />
          <circle cx={w * f - 1.5} cy={3.5} r={1.6} fill="#fff" opacity={0.8} />
        </g>
      ))}
    </>
  );
}

function Learning({ w, h }: ArtProps) {
  const bt = h * 0.38;
  const dw = Math.max(28, w * 0.22);
  const dh = h * 0.4;
  const by = h - 9 - dh - 13;
  const roof = `M-9 ${bt + 6} L${w / 2} -8 L${w + 9} ${bt + 6}Z`;
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Wall w={w} h={h} top={bt} />
      <Eave w={w} y={bt + 5} />
      <Win cx={w * 0.17} cy={h * 0.66} r={9} />
      <Win cx={w * 0.83} cy={h * 0.66} r={9} />
      <Door w={w} h={h} dw={dw} dh={dh} grad="bg-door" />
      {/* 펼친 책 간판 */}
      <g>
        <path d={`M${w / 2 - 20} ${by + 9}H${w / 2 + 20}`} stroke="#7a4f2d" strokeWidth={3} strokeLinecap="round" />
        <path d={`M${w / 2} ${by - 4} Q${w / 2 - 9} ${by - 9} ${w / 2 - 18} ${by - 6} V${by + 6} Q${w / 2 - 9} ${by + 3} ${w / 2} ${by + 8}Z M${w / 2} ${by - 4} Q${w / 2 + 9} ${by - 9} ${w / 2 + 18} ${by - 6} V${by + 6} Q${w / 2 + 9} ${by + 3} ${w / 2} ${by + 8}Z`} fill="#fff" stroke={EDGE} strokeWidth={1.8} strokeLinejoin="round" />
        <path d={`M${w / 2 - 14} ${by - 1}Q${w / 2 - 8} ${by - 3} ${w / 2 - 3} ${by}M${w / 2 + 3} ${by}Q${w / 2 + 8} ${by - 3} ${w / 2 + 14} ${by - 1}`} fill="none" stroke="#8cc4dc" strokeWidth={1.4} />
      </g>
      {/* 하늘색 지붕 */}
      <path d={roof} transform="translate(0 6)" fill="#5f9bb8" stroke="#4f86a1" strokeWidth={SW} strokeLinejoin="round" />
      <path d={roof} fill="url(#bg-sky)" stroke="#5f9bb8" strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M${w / 2} -6L${w + 7} ${bt + 4}H${w / 2}Z`} fill="rgba(60,110,140,0.18)" />
      <path d={`M${w * 0.28} ${bt * 0.55}L${w / 2 - 2} 2`} stroke="#fff" strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" />
    </>
  );
}

function Heart({ cx, cy, s, fill }: { cx: number; cy: number; s: number; fill: string }) {
  return (
    <g>
      <path d={`M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.2} ${cx - s * 0.6} ${cy - s * 1.2} ${cx} ${cy - s * 0.3} C${cx + s * 0.6} ${cy - s * 1.2} ${cx + s * 1.6} ${cy - s * 0.2} ${cx} ${cy + s * 0.9}Z`} fill={fill} stroke="#b3342a" strokeWidth={1} />
      <circle cx={cx - s * 0.6} cy={cy - s * 0.3} r={s * 0.22} fill="#fff" opacity={0.75} />
    </g>
  );
}

function Home({ w, h }: ArtProps) {
  const bt = h * 0.38;
  const dw = Math.max(28, w * 0.24);
  const dh = h * 0.44;
  const roof = `M-9 ${bt + 6} L${w / 2} -8 L${w + 9} ${bt + 6}Z`;
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Wall w={w} h={h} top={bt} grad="bg-wallPink" edge="#d27a93" />
      <Eave w={w} y={bt + 5} />
      <rect x={w * 0.7} y={-4} width={15} height={bt * 0.8} rx={3} fill="url(#bg-pink)" stroke="#d27a93" strokeWidth={2} />
      <Win cx={w * 0.18} cy={h * 0.66} r={9} glass="bg-glassW" />
      <Win cx={w * 0.82} cy={h * 0.66} r={9} glass="bg-glassW" />
      <Door w={w} h={h} dw={dw} dh={dh} grad="bg-doorWhite" frame="#d27a93" />
      <Heart cx={w / 2} cy={h - 9 - dh * 0.5} s={7} fill="#e5503f" />
      <path d={roof} transform="translate(0 6)" fill="#d27a93" stroke="#c4627d" strokeWidth={SW} strokeLinejoin="round" />
      <path d={roof} fill="url(#bg-pink)" stroke="#d27a93" strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M${w / 2} -6L${w + 7} ${bt + 4}H${w / 2}Z`} fill="rgba(170,70,100,0.15)" />
      <path d={`M${w * 0.28} ${bt * 0.55}L${w / 2 - 2} 2`} stroke="#fff" strokeOpacity={0.65} strokeWidth={3} strokeLinecap="round" />
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
      <Defs />
      <Art w={w} h={h} />
    </svg>
  );
}
