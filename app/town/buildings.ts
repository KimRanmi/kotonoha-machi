// 마을에 배치되는 건물 데이터. 이동/충돌 로직(page.tsx)과 분리해두면 건물별 기능(담당
// 주민, 해금 조건, 설명 등 - 아직 이번 범위 밖)을 나중에 이 파일에서만 확장할 수 있다.
export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
}

// placeholder 건물 3개. 아직 아무 기능도 없다 — 충돌 처리를 위한 사각형 영역만 갖는다.
export const BUILDINGS: Building[] = [
  { id: "house", x: 110, y: 110, width: 130, height: 100, label: "집", color: "#c97b4a" },
  { id: "shop", x: 620, y: 150, width: 150, height: 110, label: "상점", color: "#5c7fae" },
  { id: "hall", x: 360, y: 430, width: 170, height: 110, label: "마을회관", color: "#7a9d5c" },
];
