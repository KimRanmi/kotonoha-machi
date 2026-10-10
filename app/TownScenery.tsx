// 마을 맵의 바닥 장식: 길(점선 테두리), 흩어진 꽃, 소품(벚나무·등롱).
// 전부 SVG 마크업이고 pointer-events: none 이라 클릭/충돌/배치 판정에 영향을 주지 않는다.
// 길은 눈에 보이는 그림일 뿐, 이동 충돌과는 무관하다(기존과 동일).

// 벚나무: 분홍 동그란 꽃 뭉치 + 흰 꽃잎 점. (x, y)는 왼쪽 위, 크기 64x80.
function SakuraTree({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M28 78 L30 50 Q31 42 26 36 M30 52 Q36 44 40 38" fill="none" stroke="#a9744a" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={32} cy={78} rx={14} ry={3.5} fill="rgba(90,64,52,0.16)" />
      <circle cx={20} cy={30} r={17} fill="var(--sakura)" />
      <circle cx={44} cy={30} r={17} fill="var(--sakura)" />
      <circle cx={32} cy={18} r={18} fill="var(--sakura)" />
      <circle cx={32} cy={36} r={15} fill="#fbd5dd" />
      <circle cx={25} cy={14} r={9} fill="#fde0e6" opacity={0.8} />
      {[
        [14, 28], [26, 40], [38, 33], [50, 26], [30, 12], [20, 18], [42, 15], [34, 26],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.2} fill="var(--white)" />
      ))}
    </g>
  );
}

// 등롱: 붉은 종이 등을 기둥 위에 단 모양. (x, y)는 왼쪽 위, 크기 24x54.
function Lantern({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={12} cy={52} rx={9} ry={2.5} fill="rgba(90,64,52,0.16)" />
      <rect x={10.5} y={30} width={3} height={22} rx={1.5} fill="#8a5a3a" />
      <rect x={6} y={50} width={12} height={3} rx={1.5} fill="#8a5a3a" />
      <rect x={6} y={2} width={12} height={4} rx={2} fill="#6a4630" />
      <ellipse cx={12} cy={17} rx={10} ry={12} fill="var(--lantern)" stroke="#a63a2c" strokeWidth={2} />
      <path d="M3 13Q12 17 21 13M2.5 18Q12 22 21.5 18M4 23Q12 27 20 23" fill="none" stroke="#a63a2c" strokeWidth={1.2} opacity={0.7} />
      <rect x={6} y={28} width={12} height={4} rx={2} fill="#6a4630" />
      <circle cx={12} cy={17} r={3.5} fill="#ffd9a0" opacity={0.75} />
    </g>
  );
}

// 시드 고정 난수 — 서버/클라이언트 렌더 결과가 같아야 하이드레이션이 어긋나지 않는다.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const FLOWER_COLORS = ["var(--white)", "var(--sakura)", "var(--yellow-soft)"];

export default function TownScenery({ width, height }: { width: number; height: number }) {
  const hy1 = height / 2 - 30;
  const hy2 = height / 2 + 30;
  const vx1 = width / 2 - 30;
  const vx2 = width / 2 + 30;
  const e = 12; // 맵 바깥으로 빼서 가장자리에 점선이 생기지 않게 한다
  const road =
    `M${-e} ${hy1}H${vx1}V${-e}H${vx2}V${hy1}H${width + e}V${hy2}H${vx2}V${height + e}H${vx1}V${hy2}H${-e}Z`;

  // 꽃은 길 위에는 심지 않는다.
  const rnd = seeded(20240611);
  const flowers: { x: number; y: number; c: string }[] = [];
  while (flowers.length < 90) {
    const x = 10 + rnd() * (width - 20);
    const y = 10 + rnd() * (height - 20);
    const c = FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)];
    const onRoad = (y > hy1 - 8 && y < hy2 + 8) || (x > vx1 - 8 && x < vx2 + 8);
    if (!onRoad) flowers.push({ x: Math.round(x), y: Math.round(y), c });
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      <path
        d={road}
        fill="var(--road)"
        stroke="var(--line)"
        strokeWidth={3}
        strokeDasharray="8 6"
        strokeLinejoin="round"
      />
      {flowers.map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r={3.2} fill={f.c} />
          <circle cx={f.x} cy={f.y} r={1.1} fill="#f2b84b" />
        </g>
      ))}

      {/* 소품: 건물·길과 겹치지 않는 빈 곳 */}
      <SakuraTree x={28} y={26} />
      <SakuraTree x={300} y={22} />
      <SakuraTree x={560} y={26} />
      <SakuraTree x={850} y={44} />
      <SakuraTree x={170} y={400} />
      <SakuraTree x={50} y={500} />
      <SakuraTree x={600} y={470} />
      <SakuraTree x={850} y={500} />
      <Lantern x={ 421} y={246} />
      <Lantern x={515} y={246} />
      <Lantern x={421} y={354} />
      <Lantern x={515} y={354} />
      <Lantern x={250} y={238} />
      <Lantern x={690} y={366} />
    </svg>
  );
}
