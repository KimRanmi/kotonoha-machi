import type { InteriorKind } from "./interiors";

// 마을 맵의 건물 그림 (동물의 숲 느낌): 검은/갈색 윤곽선 없이, 통통하고 둥근 모양을
// 같은 계열의 밝은 색·진한 색을 겹쳐서 표현한다. 이미지 파일 없이 SVG만 쓴다.
// 둥근 모서리는 "윤곽선 없이 같은 색 stroke + round join"으로 만든다.
// 건물 영역(x/y/width/height)은 그대로이고, 그림은 그 영역을 꽉 채운다. 지붕·차양·그림자는 영역 밖으로
// 살짝 튀어나올 수 있지만(overflow: visible) 충돌/클릭 판정과는 무관한 장식이다.
// kind가 없는 건물(테마로 지은 건물)은 학습관 모양으로 그린다.

type ArtProps = { w: number; h: number };

// 부드러운 바닥 그림자
function GroundShadow({ w, h }: ArtProps) {
  return <ellipse cx={w / 2 + 4} cy={h + 1} rx={w * 0.6} ry={11} fill="rgba(80,110,60,0.3)" filter="url(#ac-blur)" />;
}

// 벽: 파스텔 몸통 + 아래쪽 한 톤 진한 띠 + 왼쪽 위 하이라이트
function Wall({ w, h, top, color, shade }: ArtProps & { top: number; color: string; shade: string }) {
  return (
    <g>
      <rect x={3} y={top} width={w - 6} height={h - top} rx={15} fill={color} />
      <path d={`M3 ${h - 15}H${w - 3}V${h - 15}Q${w - 3} ${h} ${w - 18} ${h}H18Q3 ${h} 3 ${h - 15}Z`} fill={shade} />
      <rect x={8} y={top + 10} width={w * 0.22} height={5} rx={2.5} fill="#fff" opacity={0.55} />
    </g>
  );
}

// 지붕 아래 처마 그림자
function Eave({ w, y }: { w: number; y: number }) {
  return <rect x={6} y={y} width={w - 12} height={10} rx={5} fill="rgba(120,80,50,0.16)" />;
}

function Door({ w, h, dw, dh, color, frame = "#fff", knob = "#f6c75a" }: ArtProps & { dw: number; dh: number; color: string; frame?: string; knob?: string }) {
  const x = w / 2 - dw / 2;
  const y = h - 6 - dh;
  const r = dw / 2;
  return (
    <g>
      <rect x={x - 8} y={h - 6} width={dw + 16} height={6} rx={3} fill="#f1dcc0" />
      <path d={`M${x - 4} ${h - 6}V${y + r}A${r + 4} ${r + 4} 0 0 1 ${x + dw + 4} ${y + r}V${h - 6}Z`} fill={frame} />
      <path d={`M${x} ${h - 6}V${y + r}A${r} ${r} 0 0 1 ${x + dw} ${y + r}V${h - 6}Z`} fill={color} />
      <path d={`M${x + 4} ${h - 10}V${y + r}`} stroke="#fff" strokeOpacity={0.45} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={x + dw * 0.76} cy={h - 6 - dh * 0.4} r={2.4} fill={knob} />
    </g>
  );
}

// 둥근 사각 창 + 흰 창틀 + 작은 화단
function Win({ cx, cy, s = 22, flowers }: { cx: number; cy: number; s?: number; flowers?: string }) {
  const x = cx - s / 2;
  const y = cy - s / 2;
  return (
    <g>
      <rect x={x - 3} y={y - 3} width={s + 6} height={s + 6} rx={9} fill="#fff" />
      <rect x={x} y={y} width={s} height={s} rx={6} fill="#bfe3f2" />
      <path d={`M${cx} ${y}V${y + s}M${x} ${cy}H${x + s}`} stroke="#fff" strokeWidth={2} />
      <path d={`M${x + 4} ${y + 8}Q${x + 5} ${y + 4} ${x + 9} ${y + 3.5}`} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
      {flowers && (
        <g>
          <rect x={x - 4} y={y + s + 1} width={s + 8} height={7} rx={3.5} fill="#8fc27a" />
          {[0.15, 0.4, 0.65, 0.88].map((f, i) => (
            <circle key={i} cx={x - 4 + (s + 8) * f} cy={y + s + 1} r={2.6} fill={i % 2 ? flowers : "#fff"} />
          ))}
        </g>
      )}
    </g>
  );
}

// 둥글게 이은 지붕 기와(스캘럽) 무늬
function Scallops({ x0, x1, y, r, color, rows = 2 }: { x0: number; x1: number; y: number; r: number; color: string; rows?: number }) {
  const out = [];
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? r : 0;
    for (let x = x0 + off; x < x1; x += r * 2) {
      out.push(<circle key={`${row}-${x}`} cx={x} cy={y + row * r * 1.2} r={r} fill={color} />);
    }
  }
  return <g>{out}</g>;
}

function Cafe({ w, h }: ArtProps) {
  const bt = h * 0.4;
  const dw = Math.max(30, w * 0.26);
  const dh = h * 0.46;
  const doorTop = h - 6 - dh;
  const strip = dw / 3;
  const roof = `M-4 ${bt + 4} C-4 -2 ${w * 0.2} -4 ${w / 2} -4 C${w * 0.8} -4 ${w + 4} -2 ${w + 4} ${bt + 4}Z`;
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Wall w={w} h={h} top={bt} color="#fff4e4" shade="#f6dfc0" />
      <Eave w={w} y={bt + 5} />
      <Win cx={w * 0.83} cy={h * 0.67} s={20} flowers="#f48fb1" />
      <circle cx={w * 0.17} cy={h * 0.66} r={13} fill="#fff" />
      <circle cx={w * 0.17} cy={h * 0.66} r={10} fill="#c8e6b8" />
      <text x={w * 0.17} y={h * 0.66 + 5} textAnchor="middle" fontSize={13} fontWeight={900} fill="#4f7a3c">茶</text>
      <Door w={w} h={h} dw={dw} dh={dh} color="#e0b184" />
      {/* 노렌 */}
      <rect x={w / 2 - dw / 2 - 6} y={doorTop - 1} width={dw + 12} height={4} rx={2} fill="#c79463" />
      {[0, 1, 2].map((i) => {
        const x = w / 2 - dw / 2 + i * strip + 1;
        const bw = strip - 2;
        const bh = dh * 0.58;
        return (
          <g key={i}>
            <path d={`M${x} ${doorTop + 3}H${x + bw}V${doorTop + bh}L${x + bw / 2} ${doorTop + bh - 6}L${x} ${doorTop + bh}Z`} fill="#a9d49a" stroke="#a9d49a" strokeWidth={3} strokeLinejoin="round" />
            <path d={`M${x + 2} ${doorTop + 6}V${doorTop + bh - 8}`} stroke="#fff" strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
          </g>
        );
      })}
      {/* 둥근 지붕 */}
      <path d={roof} transform="translate(0 7)" fill="#c98f5a" stroke="#c98f5a" strokeWidth={10} strokeLinejoin="round" />
      <path d={roof} fill="#ecbd8a" stroke="#ecbd8a" strokeWidth={10} strokeLinejoin="round" />
      <Scallops x0={4} x1={w - 2} y={bt - 4} r={7.5} color="#e3ad77" rows={1} />
      <Scallops x0={14} x1={w - 10} y={bt * 0.55} r={7.5} color="#e3ad77" rows={1} />
      <ellipse cx={w * 0.3} cy={9} rx={w * 0.2} ry={4.5} fill="#fff" opacity={0.45} />
    </>
  );
}

function Shop({ w, h }: ArtProps) {
  const bt = h * 0.3;
  const ah = h * 0.28;
  const n = 8;
  const total = w + 10;
  const sw = total / n;
  const dw = Math.max(28, w * 0.22);
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Wall w={w} h={h} top={bt} color="#fff4e4" shade="#f6dfc0" />
      <Win cx={w * 0.2} cy={h * 0.7} s={20} />
      <Win cx={w * 0.8} cy={h * 0.7} s={20} />
      <Door w={w} h={h} dw={dw} dh={h * 0.46} color="#a9dcf0" />
      {/* 차양 그림자 */}
      <rect x={-2} y={bt + ah - 2} width={w + 4} height={12} rx={6} fill="rgba(120,80,50,0.16)" />
      {/* 지붕띠 + 줄무늬 차양 + 물결 아랫단 */}
      <rect x={-5} y={bt - 14} width={total} height={18} rx={9} fill="#e98ca5" />
      <rect x={-1} y={bt - 12} width={w * 0.4} height={4} rx={2} fill="#fff" opacity={0.5} />
      {Array.from({ length: n }, (_, i) => {
        const x = -5 + i * sw;
        return (
          <path key={i} d={`M${x} ${bt}H${x + sw}V${bt + ah}A${sw / 2} ${sw / 2} 0 0 1 ${x} ${bt + ah}Z`} fill={i % 2 === 0 ? "#f9c6d0" : "#fffaf0"} />
        );
      })}
    </>
  );
}

function Hall({ w, h }: ArtProps) {
  const bt = h * 0.42;
  const dw = Math.max(34, w * 0.2);
  const roof = `M-10 ${bt + 4} Q${w * 0.1} ${bt - 2} ${w * 0.2} 8 H${w * 0.8} Q${w * 0.9} ${bt - 2} ${w + 10} ${bt + 4} Q${w / 2} ${bt + 14} -10 ${bt + 4}Z`;
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Wall w={w} h={h} top={bt} color="#fff4e4" shade="#f6dfc0" />
      <Eave w={w} y={bt + 6} />
      <Door w={w} h={h} dw={dw} dh={h * 0.44} color="#d9a877" />
      <Win cx={w * 0.2} cy={h * 0.7} s={20} />
      <Win cx={w * 0.8} cy={h * 0.7} s={20} />
      {/* 청회색 기와지붕 */}
      <path d={roof} transform="translate(0 7)" fill="#6f87a3" stroke="#6f87a3" strokeWidth={8} strokeLinejoin="round" />
      <path d={roof} fill="#9bb1c9" stroke="#9bb1c9" strokeWidth={8} strokeLinejoin="round" />
      <Scallops x0={w * 0.12} x1={w * 0.9} y={bt - 2} r={7} color="#8aa2bd" rows={1} />
      <Scallops x0={w * 0.26} x1={w * 0.78} y={bt * 0.55} r={7} color="#8aa2bd" rows={1} />
      <rect x={w * 0.2} y={6} width={w * 0.6} height={7} rx={3.5} fill="#7f97b2" />
      <ellipse cx={w * 0.38} cy={bt * 0.28} rx={w * 0.16} ry={4} fill="#fff" opacity={0.4} />
      {[0.2, 0.8].map((f, i) => (
        <g key={i}>
          <circle cx={w * f} cy={6} r={6.5} fill="#f1c58f" />
          <circle cx={w * f - 1.8} cy={4} r={2} fill="#fff" opacity={0.8} />
        </g>
      ))}
    </>
  );
}

function Learning({ w, h }: ArtProps) {
  const bt = h * 0.4;
  const dw = Math.max(28, w * 0.22);
  const dh = h * 0.4;
  const by = h - 6 - dh - 14;
  const tri = `M2 ${bt + 4} L${w / 2} -2 L${w - 2} ${bt + 4}Z`;
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Wall w={w} h={h} top={bt} color="#fff4e4" shade="#f6dfc0" />
      <Eave w={w} y={bt + 5} />
      <Win cx={w * 0.17} cy={h * 0.67} s={18} />
      <Win cx={w * 0.83} cy={h * 0.67} s={18} />
      <Door w={w} h={h} dw={dw} dh={dh} color="#d9a877" />
      {/* 펼친 책 간판 */}
      <g>
        <rect x={w / 2 - 22} y={by - 9} width={44} height={22} rx={11} fill="#fff" />
        <path d={`M${w / 2} ${by - 3} Q${w / 2 - 8} ${by - 7} ${w / 2 - 15} ${by - 4} V${by + 6} Q${w / 2 - 8} ${by + 3} ${w / 2} ${by + 8}Z M${w / 2} ${by - 3} Q${w / 2 + 8} ${by - 7} ${w / 2 + 15} ${by - 4} V${by + 6} Q${w / 2 + 8} ${by + 3} ${w / 2} ${by + 8}Z`} fill="#bfe3f2" stroke="#bfe3f2" strokeWidth={1.5} strokeLinejoin="round" />
        <path d={`M${w / 2} ${by - 3}V${by + 8}`} stroke="#fff" strokeWidth={1.5} />
      </g>
      {/* 하늘색 지붕 */}
      <path d={tri} transform="translate(0 7)" fill="#79bcd8" stroke="#79bcd8" strokeWidth={16} strokeLinejoin="round" />
      <path d={tri} fill="#a8dcef" stroke="#a8dcef" strokeWidth={16} strokeLinejoin="round" />
      <Scallops x0={w * 0.3} x1={w * 0.72} y={bt - 8} r={6.5} color="#93cde5" rows={1} />
      <ellipse cx={w * 0.38} cy={bt * 0.5} rx={w * 0.13} ry={4} fill="#fff" opacity={0.5} transform={`rotate(-28 ${w * 0.38} ${bt * 0.5})`} />
    </>
  );
}

function Heart({ cx, cy, s, fill }: { cx: number; cy: number; s: number; fill: string }) {
  return (
    <g>
      <path d={`M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.2} ${cx - s * 0.6} ${cy - s * 1.2} ${cx} ${cy - s * 0.3} C${cx + s * 0.6} ${cy - s * 1.2} ${cx + s * 1.6} ${cy - s * 0.2} ${cx} ${cy + s * 0.9}Z`} fill={fill} />
      <circle cx={cx - s * 0.6} cy={cy - s * 0.3} r={s * 0.22} fill="#fff" opacity={0.8} />
    </g>
  );
}

function Home({ w, h }: ArtProps) {
  const bt = h * 0.4;
  const dw = Math.max(28, w * 0.24);
  const dh = h * 0.44;
  const tri = `M2 ${bt + 4} L${w / 2} -2 L${w - 2} ${bt + 4}Z`;
  return (
    <>
      <GroundShadow w={w} h={h} />
      <Wall w={w} h={h} top={bt} color="#ffe6ec" shade="#f9cbd6" />
      <Eave w={w} y={bt + 5} />
      <rect x={w * 0.68} y={-6} width={16} height={bt * 0.8} rx={5} fill="#f2a6b8" />
      <rect x={w * 0.68 - 2} y={-8} width={20} height={7} rx={3.5} fill="#e98ca5" />
      <Win cx={w * 0.18} cy={h * 0.67} s={18} flowers="#f48fb1" />
      <Win cx={w * 0.82} cy={h * 0.67} s={18} flowers="#f48fb1" />
      <Door w={w} h={h} dw={dw} dh={dh} color="#fff" frame="#f2a6b8" />
      <Heart cx={w / 2} cy={h - 6 - dh * 0.48} s={7} fill="#ec5f6f" />
      <path d={tri} transform="translate(0 7)" fill="#e98ca5" stroke="#e98ca5" strokeWidth={16} strokeLinejoin="round" />
      <path d={tri} fill="#f9c0cd" stroke="#f9c0cd" strokeWidth={16} strokeLinejoin="round" />
      <Scallops x0={w * 0.3} x1={w * 0.72} y={bt - 8} r={6.5} color="#f4abbc" rows={1} />
      <ellipse cx={w * 0.38} cy={bt * 0.5} rx={w * 0.13} ry={4} fill="#fff" opacity={0.55} transform={`rotate(-28 ${w * 0.38} ${bt * 0.5})`} />
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
      <defs>
        <filter id="ac-blur" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>
      <Art w={w} h={h} />
    </svg>
  );
}
