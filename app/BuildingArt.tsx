import type { Building } from "./buildings";
import { ISO_K, ISO_SCALE as S, project, pts, type P2 } from "./iso";
import styles from "./town.module.css";

// 마을 맵의 건물 그림 (아이소메트릭 파스텔 미니어처). 윤곽선 없이 면 색(밝은 면/어두운 면)만 쓰고,
// 월드 좌표의 건물 영역(x, y, width, height)을 그대로 밑면으로 삼아 위로 쌓아 올린 블록 + 박공지붕으로 그린다.
// 충돌/클릭 판정은 월드 좌표의 건물 영역으로만 하고, 이 그림은 눈에 보이는 장식이다. 이미지 파일은 쓰지 않는다.
// kind가 없는 건물(테마로 지은 건물)은 학습관 모양으로 그린다.

type Tone = { wl: string; wr: string; roofF: string; roofS: string; door: string };

const TONES: Record<string, Tone> = {
  cafe: { wl: "#f9eedb", wr: "#e5d0b4", roofF: "#e2a3a3", roofS: "#cd8886", door: "#93b99a" },
  shop: { wl: "#f9eedb", wr: "#e5d0b4", roofF: "#9ec0c6", roofS: "#84aab0", door: "#9ec0c6" },
  hall: { wl: "#f9eedb", wr: "#e5d0b4", roofF: "#b9aec9", roofS: "#a79bb8", door: "#c09c72" },
  learning: { wl: "#f9eedb", wr: "#e5d0b4", roofF: "#a9c6cb", roofS: "#8fb5bd", door: "#c09c72" },
  home: { wl: "#f8e2e0", wr: "#ecc3c4", roofF: "#ecb8b8", roofS: "#dc9ea0", door: "#fffaf0" },
};
const WIN = "#c2dce0";
const WIN_R = "#a9ced6";
const SILL = "#fffaf0";

// 벽 높이 / 지붕 높이
export function buildingHeights(kind?: string) {
  const wall = (kind === "hall" ? 40 : kind === "shop" ? 38 : 40) * S;
  return { wall, roof: (kind === "hall" ? 28 : 24) * S };
}

// 앞쪽(왼쪽) 벽면 위의 글자/도형을 벽면에 맞춰 기울이는 변환 (가로 = 월드 x축 방향)
const faceL = (x: number, y: number, z: number) => {
  const [e, f] = project(x, y, z);
  return `matrix(${ISO_K} ${ISO_K / 2} 0 ${S} ${e} ${f})`;
};

export function BuildingArt({ b }: { b: Building }) {
  const kind = b.kind ?? "learning";
  const t = TONES[kind] ?? TONES.learning;
  const { x, y, width: W, height: D } = b;
  const { wall: H, roof: RH } = buildingHeights(b.kind);
  const P = (px: number, py: number, pz: number): P2 => project(px, py, pz);
  const quad = (a: P2, c: P2, d: P2, e: P2, fill: string, key?: string | number) => (
    <polygon key={key} points={pts([a, c, d, e])} fill={fill} />
  );
  // 앞(왼쪽) 벽면 y = y + D 위의 사각형: x 범위 [u0,u1](0~1 비율), 높이 [z0,z1]
  const front = (u0: number, u1: number, z0: number, z1: number, fill: string, key?: string | number) =>
    quad(P(x + W * u0, y + D, z0), P(x + W * u1, y + D, z0), P(x + W * u1, y + D, z1), P(x + W * u0, y + D, z1), fill, key);
  // 오른쪽 벽면 x = x + W 위의 사각형
  const right = (v0: number, v1: number, z0: number, z1: number, fill: string) =>
    quad(P(x + W, y + D * v0, z0), P(x + W, y + D * v1, z0), P(x + W, y + D * v1, z1), P(x + W, y + D * v0, z1), fill);

  const o = 9; // 처마 돌출
  const ym = y + D / 2;
  const doorU0 = 0.42;
  const doorU1 = 0.58;
  const doorH = H * 0.62;

  return (
    <g>
      <ellipse cx={P(x + W / 2 + 10, y + D / 2 + 10, 0)[0]} cy={P(x + W / 2 + 10, y + D / 2 + 10, 0)[1]} rx={(W + D) * ISO_K * 0.46} ry={(W + D) * ISO_K * 0.22} fill="rgba(90,110,70,0.13)" />
      {quad(P(x, y + D, 0), P(x + W, y + D, 0), P(x + W, y + D, H), P(x, y + D, H), t.wl)}
      {quad(P(x + W, y, 0), P(x + W, y + D, 0), P(x + W, y + D, H), P(x + W, y, H), t.wr)}
      {front(0.02, 0.98, 0, 7 * S, "rgba(0,0,0,0.05)")}
      {front(0.03, 0.4, H - 10 * S, H - 7 * S, "#fff")}

      {/* 문 + 창 */}
      {front(doorU0 - 0.025, doorU1 + 0.025, 0, doorH + 3, SILL)}
      {front(doorU0, doorU1, 0, doorH, t.door)}
      {front(doorU1 - 0.035, doorU1 - 0.015, doorH * 0.45, doorH * 0.5, SILL)}
      {[0.1, 0.72].map((u, i) => (
        <g key={i}>
          {front(u - 0.015, u + 0.215, H * 0.3, H * 0.73, SILL)}
          {front(u, u + 0.2, H * 0.34, H * 0.69, WIN)}
          {front(u + 0.095, u + 0.105, H * 0.34, H * 0.69, SILL)}
        </g>
      ))}
      {right(0.32, 0.68, H * 0.32, H * 0.7, WIN_R)}

      {/* 종류별 장식: 앞벽 위 */}
      {kind === "cafe" && (
        <g>
          {[0, 1, 2].map((i) => front(doorU0 + i * 0.053 + 0.004, doorU0 + (i + 1) * 0.053 - 0.004, doorH * 0.4, doorH + 1, "#9cc08a", i))}
          <g transform={faceL(x + W * 0.17, y + D, H * 0.82)}>
            <circle cx={0} cy={0} r={10} fill={SILL} />
            <circle cx={0} cy={0} r={7.5} fill="#c4dcb4" />
            <text x={0} y={4} textAnchor="middle" fontSize={11} fontWeight={900} fill="#4f6f3c">茶</text>
          </g>
        </g>
      )}
      {kind === "hall" && (
        <g transform={faceL(x + W / 2, y + D, H * 0.86)}>
          <circle cx={0} cy={0} r={8} fill={SILL} />
          <path d="M0 -5V0L3.5 2" stroke="#8a7a6e" strokeWidth={1.6} fill="none" strokeLinecap="round" />
        </g>
      )}
      {kind === "learning" && (
        <g transform={faceL(x + W / 2, y + D, doorH + 16)}>
          <rect x={-14} y={-8} width={28} height={16} rx={6} fill={SILL} />
          <path d="M0 -3Q-5 -6 -10 -4V4Q-5 2 0 5Z M0 -3Q5 -6 10 -4V4Q5 2 0 5Z" fill="#a9c6cb" />
        </g>
      )}
      {kind === "home" && (
        <g transform={faceL(x + W / 2, y + D, doorH * 0.5)}>
          <path d="M0 6C-10 -2 -4 -9 0 -3C4 -9 10 -2 0 6Z" fill="#e08a90" />
        </g>
      )}
      {kind === "shop" &&
        Array.from({ length: 8 }, (_, i) => {
          const u0 = 0.02 + (i * 0.96) / 8;
          const u1 = 0.02 + ((i + 1) * 0.96) / 8;
          const zT = H * 0.8;
          const zB = H * 0.62;
          return quad(P(x + W * u0, y + D, zT), P(x + W * u1, y + D, zT), P(x + W * u1, y + D + 9, zB), P(x + W * u0, y + D + 9, zB), i % 2 ? "#fffaf0" : "#ecb8b8", i);
        })}

      {/* 박공지붕: 앞 경사면 + 오른쪽 박공 + 용마루 하이라이트 */}
      {quad(P(x - o, y + D + o, H - 1), P(x + W + o, y + D + o, H - 1), P(x + W + o, ym, H + RH), P(x - o, ym, H + RH), t.roofF)}
      {quad(P(x - o, y + D + o, H - 1), P(x + W + o, y + D + o, H - 1), P(x + W + o, y + D + o, H + 3), P(x - o, y + D + o, H + 3), "rgba(0,0,0,0.07)")}
      <polygon points={pts([P(x + W + o, y - o, H - 1), P(x + W + o, y + D + o, H - 1), P(x + W + o, ym, H + RH)])} fill={t.roofS} />
      {quad(P(x - o, ym + 3, H + RH - 3), P(x + W + o, ym + 3, H + RH - 3), P(x + W + o, ym, H + RH), P(x - o, ym, H + RH), "rgba(255,255,255,0.45)")}
      {(kind === "home" || kind === "cafe") && (() => {
        const home = kind === "home";
        const cx = x + W * (home ? 0.66 : 0.22);
        const cy = ym - 8;
        const sz = 12;
        const zb = H + RH * 0.5;
        const zt = H + RH + 14 * S;
        const [tx, ty] = project(cx + sz / 2, cy + sz / 2, zt);
        return (
          <g>
            {quad(P(cx, cy + sz, zb), P(cx + sz, cy + sz, zb), P(cx + sz, cy + sz, zt), P(cx, cy + sz, zt), home ? "#ecc3c4" : "#d9cdb8")}
            {quad(P(cx + sz, cy, zb), P(cx + sz, cy + sz, zb), P(cx + sz, cy + sz, zt), P(cx + sz, cy, zt), home ? "#dc9ea0" : "#bfb29b")}
            {quad(P(cx, cy, zt), P(cx + sz, cy, zt), P(cx + sz, cy + sz, zt), P(cx, cy + sz, zt), home ? "#f4d0d2" : "#e9dfcb")}
            {[0, 1, 2].map((i) => (
              <circle key={i} className={styles.smoke} style={{ animationDelay: `${i * 1.3}s` }} cx={tx} cy={ty - 4} r={5 + i} fill="#fffaf0" />
            ))}
          </g>
        );
      })()}
    </g>
  );
}
