// 마을에 배치되는 건물 데이터. 이동/충돌 로직(page.tsx)과 분리해두면 건물별 기능(담당
// 주민, 해금 조건, 설명 등)을 나중에 이 파일에서만 확장할 수 있다.
export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  // 이 건물에 담당 주민이 연결되어 대화가 가능한지 여부. true인 건물만 접근 시
  // 상호작용 힌트가 뜨고, 이 자리에서 기존 자유 대화(ChatPanel)를 시작할 수 있다.
  hasResident?: boolean;
}

// 건물 3개 모두 lib/villager.ts에 정의된 담당 주민과 1:1로 연결되어 대화가 가능하다.
// 건물 id는 담당 주민의 id(lib/villager.ts의 VILLAGERS 키)와 그대로 맞춰뒀다.
export const BUILDINGS: Building[] = [
  {
    id: "cafe",
    x: 110,
    y: 110,
    width: 130,
    height: 100,
    label: "카페",
    color: "#c97b4a",
    hasResident: true,
  },
  {
    id: "shop",
    x: 620,
    y: 150,
    width: 150,
    height: 110,
    label: "상점",
    color: "#5c7fae",
    hasResident: true,
  },
  {
    id: "hall",
    x: 360,
    y: 430,
    width: 170,
    height: 110,
    label: "마을회관",
    color: "#7a9d5c",
    hasResident: true,
  },
];
