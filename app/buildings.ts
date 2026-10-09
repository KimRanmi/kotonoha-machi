import { THEME_RESIDENTS } from "@/lib/villager";
import type { InteriorKind } from "./interiors";

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
  // 담당 주민 id(lib/villager.ts의 VILLAGERS 키). 없으면 건물 id가 곧 주민 id다.
  // 테마로 지은 건물은 id가 건물마다 유일하므로 이 값으로 테마 주민과 연결한다.
  residentId?: string;
  // 내부 방 템플릿 종류(app/interiors.ts). 없으면(테마로 지은 건물) 공통 학습관 템플릿을 쓴다.
  kind?: InteriorKind;
}

// 테마 학습 완료 후 사용자가 마을 맵에 직접 배치한 건물. 정적 BUILDINGS와 달리 x/y가
// 고정돼있지 않고, 배치 시점에 사용자가 클릭한 자리로 정해진다.
export interface PlacedBuilding extends Building {
  themeTitle: string;
  placedAt: number;
}

// 새로 배치되는 건물의 기본 크기와, 라벨 아래 깔아줄 색상 팔레트(정적 건물 색과 겹치지
// 않게 순환시켜 구분되게 한다).
export const NEW_BUILDING_SIZE = { width: 120, height: 100 };
const NEW_BUILDING_COLORS = ["#a0522d", "#6a5acd", "#c9a227", "#3f8f8f", "#b5566b"];

export function nextBuildingColor(existingPlacedCount: number): string {
  return NEW_BUILDING_COLORS[existingPlacedCount % NEW_BUILDING_COLORS.length];
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
    kind: "cafe",
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
    kind: "shop",
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
    kind: "hall",
    color: "#7a9d5c",
    hasResident: true,
  },
];

// 테마 건물에 그 테마의 주민을 연결한다(해당 테마 주민이 없으면 그대로 둔다).
export function withThemeResident(b: PlacedBuilding): PlacedBuilding {
  const residentId = THEME_RESIDENTS[b.themeTitle];
  if (!residentId || b.residentId) return b;
  return { ...b, hasResident: true, residentId };
}
