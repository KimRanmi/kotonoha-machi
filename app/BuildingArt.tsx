import type { InteriorKind } from "./interiors";

// 마을 맵의 건물 그림. 이미지 파일 없이 SVG 마크업만으로 그리고, 색은 globals.css의 디자인 토큰을 쓴다.
// 건물 영역(x/y/width/height)은 그대로이고, 그림은 그 영역을 꽉 채운다. 지붕·차양은 영역 밖으로
// 살짝 튀어나올 수 있지만(overflow: visible) 충돌/클릭 판정과는 무관한 장식이다.
// kind가 없는 건물(테마로 지은 건물)은 학습관 모양으로 그린다.

const STROKE = "var(--wood-deep)";
const SW = 3;

type ArtProps = { w: number; h: number };

function Heart({ cx, cy, s, fill }: { cx: number; cy: number; s: number; fill: string }) {
  // 중심 (cx, cy), 폭 약 2*s 의 하트
  return (
    <path
      d={`M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.2} ${cx - s * 0.6} ${cy - s * 1.2} ${cx} ${cy - s * 0.3} C${cx + s * 0.6} ${cy - s * 1.2} ${cx + s * 1.6} ${cy - s * 0.2} ${cx} ${cy + s * 0.9}Z`}
      fill={fill}
    />
  );
}

function Body({ w, h, top, fill = "var(--cream-deep)", stroke = STROKE }: ArtProps & { top: number; fill?: string; stroke?: string }) {
  return (
    <rect x={3} y={top} width={w - 6} height={h - top - 2} rx={10} fill={fill} stroke={stroke} strokeWidth={SW} />
  );
}

// 아치형 문 (바닥 중앙)
function Door({ w, h, dw, dh, fill, stroke = STROKE }: ArtProps & { dw: number; dh: number; fill: string; stroke?: string }) {
  const x = w / 2 - dw / 2;
  const y = h - 2 - dh;
  const r = dw / 2;
  return (
    <path
      d={`M${x} ${h - 2} V${y + r} A${r} ${r} 0 0 1 ${x + dw} ${y + r} V${h - 2}Z`}
      fill={fill}
      stroke={stroke}
      strokeWidth={SW - 0.5}
      strokeLinejoin="round"
    />
  );
}

function RoundWindow({ cx, cy, r, fill = "var(--sky)" }: { cx: number; cy: number; r: number; fill?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={STROKE} strokeWidth={2.5} />
      <path d={`M${cx - r} ${cy}H${cx + r}M${cx} ${cy - r}V${cy + r}`} stroke={STROKE} strokeWidth={1.5} />
    </g>
  );
}

function Cafe({ w, h }: ArtProps) {
  const bt = h * 0.38;
  const dw = Math.max(30, w * 0.26);
  const dh = h * 0.5;
  const doorTop = h - 2 - dh;
  const strip = dw / 3;
  return (
    <>
      <Body w={w} h={h} top={bt} />
      {/* 둥근 나무색 지붕 */}
      <path
        d={`M-7 ${bt + 6} C-7 -6 ${w * 0.25} -4 ${w / 2} -4 C${w * 0.75} -4 ${w + 7} -6 ${w + 7} ${bt + 6}Z`}
        fill="var(--wood)"
        stroke={STROKE}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <path d={`M${w * 0.18} ${bt - 2} Q${w * 0.3} 8 ${w * 0.42} ${bt - 2}M${w * 0.58} ${bt - 2} Q${w * 0.7} 8 ${w * 0.82} ${bt - 2}`} fill="none" stroke={STROKE} strokeWidth={2} opacity={0.55} strokeLinecap="round" />
      <Door w={w} h={h} dw={dw} dh={dh} fill="#c9986a" />
      {/* 노렌: 말차색 천 3장 */}
      <path d={`M${w / 2 - dw / 2 - 5} ${doorTop + 2}H${w / 2 + dw / 2 + 5}`} stroke={STROKE} strokeWidth={3} strokeLinecap="round" />
      {[0, 1, 2].map((i) => {
        const x = w / 2 - dw / 2 + i * strip + 1;
        const bw = strip - 2;
        return (
          <path
            key={i}
            d={`M${x} ${doorTop + 3}H${x + bw}V${doorTop + dh * 0.55}L${x + bw / 2} ${doorTop + dh * 0.55 - 5}L${x} ${doorTop + dh * 0.55}Z`}
            fill="var(--matcha)"
            stroke="var(--matcha-deep)"
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        );
      })}
      {/* 茶 간판 + 둥근 창 */}
      <circle cx={w * 0.17} cy={h * 0.68} r={11} fill="var(--white)" stroke={STROKE} strokeWidth={2.5} />
      <text x={w * 0.17} y={h * 0.68 + 4.5} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--ink)">
        茶
      </text>
      <RoundWindow cx={w * 0.83} cy={h * 0.68} r={11} />
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
      <Body w={w} h={h} top={bt} />
      <Door w={w} h={h} dw={dw} dh={h * 0.46} fill="var(--sky)" />
      <circle cx={w / 2 + dw * 0.18} cy={h - 2 - h * 0.18} r={2} fill={STROKE} />
      <RoundWindow cx={w * 0.2} cy={h * 0.7} r={12} fill="var(--white)" />
      <RoundWindow cx={w * 0.8} cy={h * 0.7} r={12} fill="var(--white)" />
      {/* 분홍·크림 줄무늬 차양 + 물결 아랫단 */}
      <rect x={-6} y={bt - 12} width={total} height={12} rx={4} fill="var(--sakura-deep)" stroke={STROKE} strokeWidth={SW - 0.5} />
      {Array.from({ length: n }, (_, i) => {
        const x = -6 + i * sw;
        return (
          <path
            key={i}
            d={`M${x} ${bt - 1}H${x + sw}V${bt - 1 + ah}A${sw / 2} ${sw / 2} 0 0 1 ${x} ${bt - 1 + ah}Z`}
            fill={i % 2 === 0 ? "var(--sakura)" : "var(--cream)"}
            stroke={STROKE}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        );
      })}
    </>
  );
}

function Hall({ w, h }: ArtProps) {
  const bt = h * 0.4;
  const dw = Math.max(34, w * 0.2);
  return (
    <>
      <Body w={w} h={h} top={bt} />
      <Door w={w} h={h} dw={dw} dh={h * 0.46} fill="#c9986a" />
      <rect x={w * 0.14} y={h * 0.58} width={w * 0.16} height={h * 0.2} rx={5} fill="var(--sky)" stroke={STROKE} strokeWidth={2.5} />
      <rect x={w * 0.7} y={h * 0.58} width={w * 0.16} height={h * 0.2} rx={5} fill="var(--sky)" stroke={STROKE} strokeWidth={2.5} />
      {/* 청회색 기와지붕: 처마 끝이 살짝 올라가고, 용마루 양 끝에 장식 */}
      <path
        d={`M-14 ${bt + 4} Q${w * 0.1} ${bt - 2} ${w * 0.2} 6 H${w * 0.8} Q${w * 0.9} ${bt - 2} ${w + 14} ${bt + 4} Q${w / 2} ${bt + 14} -14 ${bt + 4}Z`}
        fill="var(--tile)"
        stroke="var(--tile-deep)"
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <path
        d={[0.3, 0.4, 0.5, 0.6, 0.7].map((f) => `M${w * f} 8V${bt + 4}`).join("")}
        stroke="var(--tile-deep)"
        strokeWidth={1.5}
        opacity={0.55}
      />
      <circle cx={w * 0.2} cy={5} r={5} fill="var(--wood)" stroke={STROKE} strokeWidth={2} />
      <circle cx={w * 0.8} cy={5} r={5} fill="var(--wood)" stroke={STROKE} strokeWidth={2} />
    </>
  );
}

function Learning({ w, h }: ArtProps) {
  const bt = h * 0.38;
  const dw = Math.max(28, w * 0.22);
  const dh = h * 0.42;
  const by = h - 2 - dh - 12; // 문 위 간판 중심
  return (
    <>
      <Body w={w} h={h} top={bt} />
      {/* 하늘색 지붕 */}
      <path
        d={`M-8 ${bt + 6} L${w / 2} -6 L${w + 8} ${bt + 6}Z`}
        fill="var(--sky)"
        stroke="var(--sky-deep)"
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Door w={w} h={h} dw={dw} dh={dh} fill="#c9986a" />
      {/* 문 위 펼친 책 간판 */}
      <path
        d={`M${w / 2} ${by - 4} Q${w / 2 - 9} ${by - 9} ${w / 2 - 17} ${by - 6} V${by + 6} Q${w / 2 - 9} ${by + 3} ${w / 2} ${by + 8}Z M${w / 2} ${by - 4} Q${w / 2 + 9} ${by - 9} ${w / 2 + 17} ${by - 6} V${by + 6} Q${w / 2 + 9} ${by + 3} ${w / 2} ${by + 8}Z`}
        fill="var(--white)"
        stroke={STROKE}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <RoundWindow cx={w * 0.17} cy={h * 0.68} r={10} />
      <RoundWindow cx={w * 0.83} cy={h * 0.68} r={10} />
    </>
  );
}

function Home({ w, h }: ArtProps) {
  const bt = h * 0.38;
  const dw = Math.max(28, w * 0.24);
  const dh = h * 0.46;
  return (
    <>
      <Body w={w} h={h} top={bt} fill="#fde8ec" stroke="var(--sakura-deep)" />
      {/* 연한 분홍 지붕 + 굴뚝 */}
      <rect x={w * 0.7} y={-2} width={14} height={bt * 0.7} rx={3} fill="var(--sakura-deep)" />
      <path
        d={`M-8 ${bt + 6} L${w / 2} -6 L${w + 8} ${bt + 6}Z`}
        fill="var(--sakura)"
        stroke="var(--sakura-deep)"
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Door w={w} h={h} dw={dw} dh={dh} fill="var(--white)" stroke="var(--sakura-deep)" />
      <Heart cx={w / 2} cy={h - 2 - dh * 0.5} s={7} fill="var(--lantern)" />
      <RoundWindow cx={w * 0.18} cy={h * 0.68} r={10} fill="var(--white)" />
      <RoundWindow cx={w * 0.82} cy={h * 0.68} r={10} fill="var(--white)" />
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
