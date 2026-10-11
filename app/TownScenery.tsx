// 마을 맵의 바닥 장식 (지브리풍): 손으로 칠한 듯한 잔디 얼룩, 흙길과 자갈, 들꽃, 풍성한 나무·덤불·바위,
// 따뜻한 햇살 줄기. 전부 SVG 마크업이고 pointer-events: none 이라 클릭/충돌/배치 판정에 영향을 주지 않는다.
// 길은 눈에 보이는 그림일 뿐, 이동 충돌과는 무관하다(기존과 동일).

// 벚나무: 그림자 + 굵은 줄기와 뿌리 + 겹겹의 분홍 꽃 뭉치 + 햇빛 받는 밝은 부분. (x, y)는 왼쪽 위, 크기 64x80.
function SakuraTree({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} filter="url(#sc-paint)">
      <ellipse cx={36} cy={78} rx={28} ry={7} fill="rgba(40,70,30,0.38)" />
      <path d="M26 79Q30 74 30 66V46H35V66Q35 74 40 79Z" fill="#8a5e3a" />
      <path d="M30 70V48" stroke="#b5845a" strokeWidth={3} strokeLinecap="round" />
      <circle cx={19} cy={40} r={16} fill="#d98aa0" />
      <circle cx={47} cy={40} r={16} fill="#d98aa0" />
      <circle cx={33} cy={44} r={17} fill="#d98aa0" />
      <circle cx={19} cy={33} r={16} fill="#eba3b6" />
      <circle cx={47} cy={33} r={16} fill="#eba3b6" />
      <circle cx={33} cy={22} r={20} fill="#eba3b6" />
      <circle cx={27} cy={16} r={11} fill="#f8c9d4" />
      <circle cx={14} cy={29} r={6} fill="#fbd8e0" />
      <circle cx={45} cy={26} r={6} fill="#fbd8e0" />
      {[[30, 34], [40, 18], [20, 40], [48, 40], [12, 42], [36, 48], [24, 26]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.4} fill="#fff4f6" />
      ))}
    </g>
  );
}

// 활엽수: 짙은 초록 아래층 + 중간 + 햇빛 받는 연둣빛 윗층 + 빛 점. (x, y)는 왼쪽 위, 크기 64x80.
function LeafyTree({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} filter="url(#sc-paint)">
      <ellipse cx={36} cy={78} rx={28} ry={7} fill="rgba(40,70,30,0.4)" />
      <path d="M25 79Q30 74 30 66V44H36V66Q36 74 41 79Z" fill="#7d5535" />
      <path d="M30 70V46" stroke="#a87a50" strokeWidth={3} strokeLinecap="round" />
      <circle cx={18} cy={40} r={16} fill="#3f6f3a" />
      <circle cx={48} cy={40} r={16} fill="#3f6f3a" />
      <circle cx={33} cy={46} r={17} fill="#3f6f3a" />
      <circle cx={19} cy={32} r={16} fill="#5c8f45" />
      <circle cx={47} cy={32} r={16} fill="#5c8f45" />
      <circle cx={33} cy={21} r={20} fill="#5c8f45" />
      <circle cx={26} cy={16} r={12} fill="#8fbb57" />
      <circle cx={42} cy={24} r={8} fill="#8fbb57" />
      <circle cx={16} cy={30} r={7} fill="#8fbb57" />
      {[[22, 12], [34, 26], [46, 36], [14, 40], [30, 40]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={3.2} fill="#d3e48d" opacity={0.9} />
      ))}
    </g>
  );
}

// 덤불: 겹친 초록 뭉치 + 작은 꽃. (x, y)는 왼쪽 위, 크기 40x28.
function Bush({ x, y, flower = "#f4b6c4" }: { x: number; y: number; flower?: string }) {
  return (
    <g transform={`translate(${x} ${y})`} filter="url(#sc-paint)">
      <ellipse cx={21} cy={26} rx={19} ry={5} fill="rgba(40,70,30,0.35)" />
      <circle cx={11} cy={17} r={10} fill="#4f8040" />
      <circle cx={29} cy={17} r={10} fill="#4f8040" />
      <circle cx={20} cy={13} r={12} fill="#6c9f4c" />
      <circle cx={15} cy={9} r={5.5} fill="#9ccb62" />
      {[[10, 16], [24, 9], [31, 18], [19, 19]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.3} fill={i % 2 ? flower : "#fff4d6"} />
      ))}
    </g>
  );
}

// 이끼 낀 바위. (x, y)는 왼쪽 위, 크기 36x24.
function Rock({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} filter="url(#sc-paint)">
      <ellipse cx={19} cy={22} rx={17} ry={4} fill="rgba(40,70,30,0.35)" />
      <path d="M2 21Q1 9 11 5Q22 1 31 8Q36 14 34 21Z" fill="#a39a88" />
      <path d="M6 12Q10 6 18 5Q12 8 10 15Z" fill="#c9c1ae" />
      <path d="M20 6Q29 6 33 14Q27 10 20 10Z" fill="#7fa457" />
    </g>
  );
}

// 등롱: 그림자 + 기둥 + 빛나는 붉은 종이 등. (x, y)는 왼쪽 위, 크기 24x54.
function Lantern({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={14} cy={53} rx={11} ry={3.5} fill="rgba(40,70,30,0.4)" filter="url(#sc-blur)" />
      <circle cx={12} cy={17} r={22} fill="url(#sc-glow)" />
      <g filter="url(#sc-paint)">
        <rect x={10.5} y={30} width={3} height={22} rx={1.5} fill="#6b4426" />
        <rect x={6} y={50} width={12} height={3.5} rx={1.75} fill="#6b4426" />
        <rect x={6} y={2} width={12} height={4.5} rx={2.2} fill="#4f3220" />
        <ellipse cx={12} cy={17} rx={10} ry={12} fill="url(#sc-paper)" />
        <path d="M3 13Q12 17 21 13M2.5 18Q12 22 21.5 18M4 23Q12 27 20 23" fill="none" stroke="#a63a2c" strokeWidth={1.2} opacity={0.55} />
        <ellipse cx={8.5} cy={12} rx={2.2} ry={4} fill="#fff" opacity={0.35} />
        <rect x={6} y={28} width={12} height={4.5} rx={2.2} fill="#4f3220" />
      </g>
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

const FLOWER_COLORS = ["#fff7e0", "#f4a9bb", "#ffd966", "#a9c8f0"];

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
  const patches = Array.from({ length: 26 }, () => ({
    x: rnd() * width,
    y: rnd() * height,
    rx: 36 + rnd() * 70,
    kind: rnd() > 0.5 ? "dark" : "light",
  }));
  const dapples = Array.from({ length: 14 }, () => ({ x: rnd() * width, y: rnd() * height, rx: 18 + rnd() * 30 }));
  const tufts: { x: number; y: number; s: number }[] = [];
  while (tufts.length < 130) {
    const x = 6 + rnd() * (width - 12);
    const y = 12 + rnd() * (height - 14);
    // 길 가장자리에도 풀이 삐져나오게 여유를 작게 둔다
    if (offRoad(x, y, 2)) tufts.push({ x, y, s: 0.7 + rnd() * 0.8 });
  }
  const flowers: { x: number; y: number; c: string }[] = [];
  while (flowers.length < 70) {
    const x = 10 + rnd() * (width - 20);
    const y = 12 + rnd() * (height - 20);
    const c = FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)];
    if (offRoad(x, y, 10)) flowers.push({ x, y, c });
  }
  const pebbles = Array.from({ length: 30 }, () => {
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
        <radialGradient id="sc-glow">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-paper" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e2553f" />
          <stop offset="0.5" stopColor="#f58a62" />
          <stop offset="1" stopColor="#c43d2f" />
        </linearGradient>
        <linearGradient id="sc-ray" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3b0" stopOpacity="0.42" />
          <stop offset="1" stopColor="#fff3b0" stopOpacity="0" />
        </linearGradient>
        <filter id="sc-blur" x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        {/* 얼룩/길의 가장자리를 불규칙하게 */}
        <filter id="sc-warp" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="16" />
        </filter>
        {/* 소품: 손그림 일렁임 + 종이 질감 */}
        <filter id="sc-paint" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="2" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="3" result="o" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="6" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.3  0 0 0 0 0.1  0 0 0 -0.9 0.55" result="gt" />
          <feComposite in="gt" in2="o" operator="in" result="gi" />
          <feBlend in="gi" in2="o" mode="multiply" />
        </filter>
      </defs>

      {/* 잔디: 밝고 어두운 붓 얼룩 */}
      <g filter="url(#sc-warp)">
        {patches.map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.rx * 0.6} fill={p.kind === "dark" ? "rgba(88,140,60,0.28)" : "rgba(226,240,150,0.4)"} />
        ))}
      </g>

      {/* 흙길: 가장자리(풀과 맞닿는 어두운 선) → 본체 → 햇빛 받는 부분 */}
      <g filter="url(#sc-warp)">
        <path d={road} fill="#c9a96f" stroke="#c9a96f" strokeWidth={16} strokeLinejoin="round" />
        <path d={road} fill="var(--road)" stroke="var(--road)" strokeWidth={8} strokeLinejoin="round" />
      </g>
      <path d={`M${-e} ${hy1 + 12}H${width + e}`} stroke="#f2dcae" strokeWidth={14} opacity={0.5} strokeLinecap="round" />
      <path d={`M${vx1 + 14} ${-e}V${height + e}`} stroke="#f2dcae" strokeWidth={12} opacity={0.45} strokeLinecap="round" />
      {pebbles.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={3 + (i % 3)} ry={2 + (i % 2)} fill={i % 2 ? "#b9ad98" : "#d6c9a8"} />
      ))}

      {/* 풀 포기 */}
      {tufts.map((t, i) => (
        <path
          key={i}
          d={`M${t.x - 5 * t.s} ${t.y}Q${t.x - 4 * t.s} ${t.y - 6 * t.s} ${t.x - 6 * t.s} ${t.y - 10 * t.s}M${t.x} ${t.y}Q${t.x} ${t.y - 8 * t.s} ${t.x + 1 * t.s} ${t.y - 13 * t.s}M${t.x + 5 * t.s} ${t.y}Q${t.x + 4 * t.s} ${t.y - 6 * t.s} ${t.x + 7 * t.s} ${t.y - 10 * t.s}`}
          stroke={i % 3 ? "#6c9f4c" : "#8fbb57"}
          strokeWidth={1.8}
          strokeLinecap="round"
          fill="none"
        />
      ))}

      {/* 들꽃: 줄기 + 꽃잎 */}
      {flowers.map((f, i) => (
        <g key={i}>
          <path d={`M${f.x} ${f.y + 7}V${f.y}`} stroke="#5c8f45" strokeWidth={1.4} strokeLinecap="round" />
          {[0, 72, 144, 216, 288].map((deg) => (
            <circle key={deg} cx={f.x + 2.5 * Math.cos((deg * Math.PI) / 180)} cy={f.y + 2.5 * Math.sin((deg * Math.PI) / 180)} r={2} fill={f.c} />
          ))}
          <circle cx={f.x} cy={f.y} r={1.4} fill={f.c === "#ffd966" ? "#d98a2b" : "#f2b84b"} />
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
      <Bush x={878} y={236} flower="#ffd966" />
      <Bush x={300} y={480} />
      <Bush x={552} y={566} flower="#ffd966" />
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

      {/* 나뭇잎 사이로 비치는 빛 */}
      {dapples.map((d, i) => (
        <ellipse key={i} cx={d.x} cy={d.y} rx={d.rx} ry={d.rx * 0.5} fill="rgba(255,240,170,0.16)" />
      ))}
      <polygon points={`0,0 180,0 ${width * 0.55},${height} ${width * 0.3},${height}`} fill="url(#sc-ray)" opacity={0.55} />
      <polygon points={`260,0 360,0 ${width * 0.8},${height} ${width * 0.62},${height}`} fill="url(#sc-ray)" opacity={0.4} />
    </svg>
  );
}
