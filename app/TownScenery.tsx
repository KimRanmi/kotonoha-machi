// 마을 맵의 바닥 장식 (파스텔 미니어처): 납작한 단색 면으로 그린 잔디 얼룩, 두께가 있는 길, 꽃,
// 나무·덤불·바위·등롱. 전부 SVG 마크업이고 pointer-events: none 이라 클릭/충돌/배치 판정에 영향을 주지 않는다.
// 길은 눈에 보이는 그림일 뿐, 이동 충돌과는 무관하다(기존과 동일).

const SHADOW = "rgba(90,110,70,0.2)";

// 벚나무: 그림자 + 통통한 줄기 + 세 겹의 둥근 꽃 뭉치. (x, y)는 왼쪽 위, 크기 64x80.
function SakuraTree({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={38} cy={78} rx={26} ry={7} fill={SHADOW} />
      <rect x={29} y={46} width={9} height={33} rx={4} fill="#c9a47c" />
      <rect x={34} y={46} width={4} height={33} rx={2} fill="#b98f68" />
      <circle cx={21} cy={38} r={16} fill="#e3a3a6" />
      <circle cx={46} cy={38} r={16} fill="#e3a3a6" />
      <circle cx={33} cy={44} r={15} fill="#e3a3a6" />
      <circle cx={20} cy={32} r={16} fill="#ecb8b8" />
      <circle cx={46} cy={30} r={16} fill="#ecb8b8" />
      <circle cx={33} cy={20} r={19} fill="#ecb8b8" />
      <circle cx={27} cy={15} r={9} fill="#f3cdcd" />
      {[[30, 32], [42, 20], [18, 38], [48, 40], [36, 46]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={2.4} fill="#fffaf0" />)}
    </g>
  );
}

// 활엽수: 연두 계열 세 겹. (x, y)는 왼쪽 위, 크기 64x80.
function LeafyTree({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={38} cy={78} rx={26} ry={7} fill={SHADOW} />
      <rect x={29} y={46} width={9} height={33} rx={4} fill="#c9a47c" />
      <rect x={34} y={46} width={4} height={33} rx={2} fill="#b98f68" />
      <circle cx={21} cy={38} r={16} fill="#8fb685" />
      <circle cx={46} cy={38} r={16} fill="#8fb685" />
      <circle cx={33} cy={44} r={15} fill="#8fb685" />
      <circle cx={20} cy={32} r={16} fill="#a9ca97" />
      <circle cx={46} cy={30} r={16} fill="#a9ca97" />
      <circle cx={33} cy={20} r={19} fill="#a9ca97" />
      <circle cx={27} cy={15} r={9} fill="#c6dcb4" />
    </g>
  );
}

// 덤불: 둥근 초록 뭉치 + 작은 꽃. (x, y)는 왼쪽 위, 크기 40x28.
function Bush({ x, y, flower = "#ecb8b8" }: { x: number; y: number; flower?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={22} cy={26} rx={18} ry={4.5} fill={SHADOW} />
      <circle cx={11} cy={17} r={10} fill="#8fb685" />
      <circle cx={29} cy={17} r={10} fill="#8fb685" />
      <circle cx={20} cy={13} r={12} fill="#a9ca97" />
      <circle cx={15} cy={9} r={5} fill="#c6dcb4" />
      {[[10, 16], [24, 9], [31, 18], [19, 19]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={2.3} fill={i % 2 ? flower : "#fffaf0"} />)}
    </g>
  );
}

// 바위. (x, y)는 왼쪽 위, 크기 36x24.
function Rock({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={20} cy={22} rx={17} ry={4} fill={SHADOW} />
      <path d="M2 21Q1 9 11 5Q22 1 31 8Q36 14 34 21Z" fill="#cfc6b4" />
      <path d="M22 6Q32 8 34 21H24Q26 12 22 6Z" fill="#b3aa98" />
      <path d="M6 12Q10 6 17 5Q12 8 10 14Z" fill="#e4dccb" />
    </g>
  );
}

// 등롱: 그림자 + 기둥 + 붉은 종이 등. (x, y)는 왼쪽 위, 크기 24x54.
function Lantern({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={14} cy={53} rx={10} ry={3.2} fill={SHADOW} />
      <rect x={10.5} y={30} width={3} height={22} rx={1.5} fill="#c09c72" />
      <rect x={6} y={2} width={12} height={4} rx={2} fill="#b98f68" />
      <ellipse cx={12} cy={17} rx={10} ry={12} fill="#e68576" />
      <ellipse cx={15} cy={18} rx={6} ry={11} fill="#d6705f" />
      <ellipse cx={8.5} cy={12} rx={2.2} ry={4} fill="#fff" opacity={0.5} />
      <rect x={6} y={28} width={12} height={4} rx={2} fill="#b98f68" />
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

const FLOWER_COLORS = ["#fffaf0", "#ecb8b8", "#f3dc9c"];

export default function TownScenery({ width, height }: { width: number; height: number }) {
  const hy1 = height / 2 - 30;
  const hy2 = height / 2 + 30;
  const vx1 = width / 2 - 30;
  const vx2 = width / 2 + 30;
  const e = 14; // 맵 바깥으로 빼서 가장자리에 테두리가 생기지 않게 한다
  const road =
    `M${-e} ${hy1}H${vx1}V${-e}H${vx2}V${hy1}H${width + e}V${hy2}H${vx2}V${height + e}H${vx1}V${hy2}H${-e}Z`;
  const offRoad = (x: number, y: number, m: number) =>
    !((y > hy1 - m && y < hy2 + m) || (x > vx1 - m && x < vx2 + m));

  const rnd = seeded(20240611);
  // 잔디의 연한/진한 얼룩 (납작한 둥근 면)
  const patches = Array.from({ length: 18 }, () => ({
    x: rnd() * width,
    y: rnd() * height,
    rx: 40 + rnd() * 60,
    light: rnd() > 0.5,
  }));
  const flowers: { x: number; y: number; c: string }[] = [];
  while (flowers.length < 56) {
    const x = 10 + rnd() * (width - 20);
    const y = 12 + rnd() * (height - 20);
    const c = FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)];
    if (offRoad(x, y, 12)) flowers.push({ x, y, c });
  }
  const tufts: { x: number; y: number }[] = [];
  while (tufts.length < 40) {
    const x = 10 + rnd() * (width - 20);
    const y = 14 + rnd() * (height - 20);
    if (offRoad(x, y, 12)) tufts.push({ x, y });
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      {patches.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.rx * 0.55} fill={p.light ? "#cfe3b6" : "#b5d09b"} opacity={0.55} />
      ))}
      {/* 길: 두께(아래 옆면) → 본체 → 안쪽 점선 */}
      <path d={road} transform="translate(0 6)" fill="#dcc5a0" stroke="#dcc5a0" strokeWidth={10} strokeLinejoin="round" />
      <path d={road} fill="var(--road)" stroke="var(--road)" strokeWidth={10} strokeLinejoin="round" />
      <path
        d={`M${-e} ${hy1 + 9}H${vx1 + 9}V${-e}H${vx2 - 9}V${hy1 + 9}H${width + e}V${hy2 - 9}H${vx2 - 9}V${height + e}H${vx1 + 9}V${hy2 - 9}H${-e}Z`}
        fill="none"
        stroke="#e3d1ae"
        strokeWidth={2.5}
        strokeDasharray="8 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {tufts.map((t, i) => (
        <path key={i} d={`M${t.x - 4} ${t.y}l2 -6M${t.x} ${t.y}v-8M${t.x + 4} ${t.y}l-2 -6`} stroke="#98b884" strokeWidth={2} strokeLinecap="round" fill="none" />
      ))}
      {flowers.map((f, i) => (
        <g key={i}>
          {[0, 90, 180, 270].map((deg) => (
            <circle key={deg} cx={f.x + 2.4 * Math.cos((deg * Math.PI) / 180)} cy={f.y + 2.4 * Math.sin((deg * Math.PI) / 180)} r={2.1} fill={f.c} />
          ))}
          <circle cx={f.x} cy={f.y} r={1.5} fill="#e6bb62" />
        </g>
      ))}

      {/* 소품: 건물·길과 겹치지 않는 빈 곳 */}
      <SakuraTree x={28} y={26} />
      <LeafyTree x={300} y={22} />
      <SakuraTree x={560} y={26} />
      <LeafyTree x={850} y={44} />
      <SakuraTree x={170} y={400} />
      <LeafyTree x={50} y={500} />
      <LeafyTree x={600} y={470} />
      <SakuraTree x={850} y={500} />
      <Bush x={22} y={232} />
      <Bush x={878} y={236} flower="#f3dc9c" />
      <Bush x={300} y={480} />
      <Bush x={552} y={566} flower="#f3dc9c" />
      <Bush x={700} y={78} />
      <Bush x={120} y={546} />
      <Rock x={380} y={218} />
      <Rock x={900} y={400} />
      <Rock x={370} y={596} />
      <Lantern x={421} y={246} />
      <Lantern x={515} y={246} />
      <Lantern x={421} y={354} />
      <Lantern x={515} y={354} />
      <Lantern x={250} y={238} />
      <Lantern x={690} y={366} />
    </svg>
  );
}
