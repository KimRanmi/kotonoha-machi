// 마을 맵의 바닥 장식: 길(점선 테두리), 흩어진 꽃, 소품(벚나무·등롱).
// 전부 SVG 마크업이고 pointer-events: none 이라 클릭/충돌/배치 판정에 영향을 주지 않는다.
// 길은 눈에 보이는 그림일 뿐, 이동 충돌과는 무관하다(기존과 동일).

// 벚나무: 윤곽선 없이 겹친 동그란 꽃 뭉치(진한→연한 분홍) + 통통한 짧은 줄기. (x, y)는 왼쪽 위, 크기 64x80.
function SakuraTree({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={34} cy={77} rx={26} ry={7} fill="rgba(80,110,60,0.3)" filter="url(#sc-blur)" />
      <path d="M32 78 V48" stroke="#c99768" strokeWidth={11} strokeLinecap="round" />
      <path d="M29 76 V50" stroke="#e0b88a" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={19} cy={40} r={16} fill="#f2a6b8" />
      <circle cx={47} cy={40} r={16} fill="#f2a6b8" />
      <circle cx={33} cy={44} r={17} fill="#f2a6b8" />
      <circle cx={19} cy={33} r={16} fill="#f8bccb" />
      <circle cx={47} cy={33} r={16} fill="#f8bccb" />
      <circle cx={33} cy={22} r={20} fill="#f8bccb" />
      <circle cx={26} cy={17} r={10} fill="#fdd9e2" />
      <circle cx={44} cy={27} r={7} fill="#fdd9e2" />
      <circle cx={14} cy={30} r={6} fill="#fdd9e2" />
      {[
        [30, 34], [40, 18], [20, 40], [48, 40], [12, 42], [36, 48],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.6} fill="#fff" />
      ))}
      {[[10, 76], [52, 80], [44, 74]].map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={2.6} ry={1.6} fill="#fbd0da" />
      ))}
    </g>
  );
}

// 덤불: 둥근 초록 뭉치 + 작은 꽃. (x, y)는 왼쪽 위, 크기 40x28.
function Bush({ x, y, flower = "#f9c6d0" }: { x: number; y: number; flower?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={21} cy={26} rx={18} ry={4.5} fill="rgba(80,110,60,0.28)" filter="url(#sc-blur)" />
      <circle cx={11} cy={17} r={10} fill="#8fc27a" />
      <circle cx={29} cy={17} r={10} fill="#8fc27a" />
      <circle cx={20} cy={13} r={12} fill="#a6d48f" />
      <circle cx={15} cy={9} r={5} fill="#c4e6ae" />
      {[[10, 16], [24, 9], [31, 18], [19, 19]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.3} fill={i % 2 ? flower : "#fff"} />
      ))}
    </g>
  );
}

// 등롱: 그림자 + 기둥 + 빛나는 붉은 종이 등. (x, y)는 왼쪽 위, 크기 24x54.
function Lantern({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={14} cy={53} rx={11} ry={3.5} fill="rgba(70,45,30,0.3)" filter="url(#sc-blur)" />
      <circle cx={12} cy={17} r={19} fill="url(#sc-glow)" />
      <rect x={10.5} y={30} width={3} height={22} rx={1.5} fill="#7a4f2d" />
      <rect x={6} y={50} width={12} height={3.5} rx={1.75} fill="#7a4f2d" />
      <rect x={6} y={2} width={12} height={4.5} rx={2.2} fill="#5c3b26" />
      <ellipse cx={12} cy={17} rx={10} ry={12} fill="url(#sc-paper)" />
      <path d="M3 13Q12 17 21 13M2.5 18Q12 22 21.5 18M4 23Q12 27 20 23" fill="none" stroke="#a63a2c" strokeWidth={1.2} opacity={0.6} />
      <ellipse cx={8.5} cy={12} rx={2.2} ry={4} fill="#fff" opacity={0.4} />
      <rect x={6} y={28} width={12} height={4.5} rx={2.2} fill="#5c3b26" />
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

  const m = 8; // 점선이 길 가장자리에서 들어오는 거리
  const inner =
    `M${-e} ${hy1 + m}H${vx1 + m}V${-e}H${vx2 - m}V${hy1 + m}H${width + e}V${hy2 - m}H${vx2 - m}V${height + e}H${vx1 + m}V${hy2 - m}H${-e}Z`;

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

  const patches = Array.from({ length: 16 }, () => ({
    x: rnd() * width,
    y: rnd() * height,
    rx: 40 + rnd() * 60,
    dark: rnd() > 0.55,
  }));
  const tufts: { x: number; y: number }[] = [];
  while (tufts.length < 46) {
    const x = 10 + rnd() * (width - 20);
    const y = 14 + rnd() * (height - 20);
    const onRoad = (y > hy1 - 10 && y < hy2 + 10) || (x > vx1 - 10 && x < vx2 + 10);
    if (!onRoad) tufts.push({ x, y });
  }
  // 길 위의 자갈
  const pebbles = Array.from({ length: 26 }, () => {
    const horizontal = rnd() > 0.5;
    return horizontal
      ? { x: rnd() * width, y: hy1 + 8 + rnd() * 44 }
      : { x: vx1 + 8 + rnd() * 44, y: rnd() * height };
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      <defs>
        <radialGradient id="sc-blossom" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fde3ea" />
          <stop offset="1" stopColor="#f4b3c3" />
        </radialGradient>
        <radialGradient id="sc-glow">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-paper" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f26a58" />
          <stop offset="0.5" stopColor="#ff8a73" />
          <stop offset="1" stopColor="#d44434" />
        </linearGradient>
        <radialGradient id="sc-patch">
          <stop offset="0" stopColor="#e6f6d8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#e6f6d8" stopOpacity="0" />
        </radialGradient>
        <filter id="sc-blur" x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="2.8" />
        </filter>
      </defs>
      {/* 잔디의 밝은/어두운 얼룩 */}
      {patches.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.rx * 0.55} fill={p.dark ? "rgba(120,170,100,0.22)" : "url(#sc-patch)"} />
      ))}
      {/* 길: 둥근 모서리의 흙길 (테두리 → 본체 → 안쪽 점선) */}
      <path d={road} fill="#ecd5ab" stroke="#ecd5ab" strokeWidth={14} strokeLinejoin="round" />
      <path d={road} fill="var(--road)" stroke="var(--road)" strokeWidth={6} strokeLinejoin="round" />
      <path d={inner} fill="none" stroke="#e3c796" strokeWidth={2.5} strokeDasharray="8 7" strokeLinecap="round" strokeLinejoin="round" />
      {tufts.map((t, i) => (
        <path key={i} d={`M${t.x - 4} ${t.y}l2 -6M${t.x} ${t.y}v-8M${t.x + 4} ${t.y}l-2 -6`} stroke="#b4d896" strokeWidth={2} strokeLinecap="round" fill="none" />
      ))}
      {pebbles.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={3 + (i % 3)} ry={1.8 + (i % 2)} fill="#e6cfa6" stroke="#d6bb8e" strokeWidth={0.8} />
      ))}
      {flowers.map((f, i) => (
        <g key={i}>
          {[0, 72, 144, 216, 288].map((deg) => (
            <circle key={deg} cx={f.x + 2.6 * Math.cos((deg * Math.PI) / 180)} cy={f.y + 2.6 * Math.sin((deg * Math.PI) / 180)} r={2.1} fill={f.c} stroke="rgba(120,90,70,0.25)" strokeWidth={0.5} />
          ))}
          <circle cx={f.x} cy={f.y} r={1.6} fill="#f2b84b" />
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
      <Bush x={22} y={232} />
      <Bush x={878} y={236} flower="#fff3b8" />
      <Bush x={300} y={480} />
      <Bush x={552} y={566} flower="#fff3b8" />
      <Bush x={700} y={78} />
      <Bush x={120} y={546} />
      <Lantern x={ 421} y={246} />
      <Lantern x={515} y={246} />
      <Lantern x={421} y={354} />
      <Lantern x={515} y={354} />
      <Lantern x={250} y={238} />
      <Lantern x={690} y={366} />
    </svg>
  );
}
