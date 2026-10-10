// 주민 얼굴 아이콘: 점 눈 + 볼 터치 + 작은 입만 있는 단순한 SVG.
// 주민마다 color(바탕색)만 다르게 줄 수 있다. color를 안 주면 villagerId로 파스텔 색을 고른다.
// (캐릭터 시스템은 다음 단계 — 여기서는 대화창 헤더·주민 목록용 작은 아이콘만 다룬다.)

const FACE_COLORS: Record<string, string> = {
  cafe: "#f9c6d0", // 벚꽃
  shop: "#bfe3f2", // 하늘
  hall: "#cfe8c4", // 연한 말차
};
const FALLBACK_COLORS = ["#f9c6d0", "#bfe3f2", "#cfe8c4", "#fff3b8", "#e6d4f2"];

export function faceColorFor(villagerId: string): string {
  if (FACE_COLORS[villagerId]) return FACE_COLORS[villagerId];
  let h = 0;
  for (const ch of villagerId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

export default function VillagerFace({
  villagerId,
  color,
  size = 44,
}: {
  villagerId?: string;
  color?: string;
  size?: number;
}) {
  const fill = color ?? faceColorFor(villagerId ?? "");
  return (
    <svg
      className="villagerFace"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" fill={fill} stroke="#b98a5a" strokeWidth="2.5" />
      {/* 앞머리 한 가닥 */}
      <path d="M19 5.5c2.5 3.5 7.5 3.5 10 0" fill="none" stroke="#b98a5a" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16.5" cy="25" r="2.6" fill="#5a4034" />
      <circle cx="31.5" cy="25" r="2.6" fill="#5a4034" />
      <ellipse cx="11.5" cy="31" rx="4" ry="2.6" fill="#f08fa4" opacity="0.65" />
      <ellipse cx="36.5" cy="31" rx="4" ry="2.6" fill="#f08fa4" opacity="0.65" />
      <path d="M21 31.5c1.8 2 4.2 2 6 0" fill="none" stroke="#5a4034" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
