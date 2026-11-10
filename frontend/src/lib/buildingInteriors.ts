import { PLAYER_RADIUS } from './villageBuildings';

/**
 * 건물 내부(방) 데이터. 방은 모든 건물이 같은 크기다. 카메라가 (+x, +z) 쪽에서 내려다보므로 벽은
 * 뒤쪽과 왼쪽 두 면만 세우고, 현관 매트는 화면 맨 아래 모서리(앞·오른쪽 꼭짓점) 안쪽에 있다.
 *
 * 좌표계가 둘이다. 가구 배치는 "배치 좌표"(가로 10 × 세로 10.5, 가구는 뒤쪽 8칸에 두고 앞쪽은 현관 앞 빈 바닥)로 적고, 화면에 그릴 때와
 * 캐릭터가 걸을 때는 여기에 ROOM_SCALE을 곱한 "월드 좌표"를 쓴다. 그래서 배율 하나만 바꾸면 방 크기,
 * 가구 크기, 가구 사이 간격이 함께 커지거나 작아진다.
 */
export const ROOM_SCALE = 1.3;

/** 배치 좌표로 본 방의 범위. 가구 목록과 방 모양(lib/buildingInterior3d.ts)이 이 좌표를 쓴다. */
export const ROOM_LAYOUT = { minX: -5, maxX: 5, minZ: -4, maxZ: 6.5 };

/** 월드 좌표로 본 방의 범위. 캐릭터가 걸어다닐 수 있는 범위다. */
export const ROOM = {
  minX: ROOM_LAYOUT.minX * ROOM_SCALE,
  maxX: ROOM_LAYOUT.maxX * ROOM_SCALE,
  minZ: ROOM_LAYOUT.minZ * ROOM_SCALE,
  maxZ: ROOM_LAYOUT.maxZ * ROOM_SCALE,
};

const BACK = ROOM_LAYOUT.minZ; // 뒷벽의 z(배치 좌표)
const LEFT = ROOM_LAYOUT.minX; // 왼쪽 벽의 x(배치 좌표)

/**
 * 현관 매트(배치 좌표). 방의 앞·오른쪽 꼭짓점(화면에서 가장 아래쪽 모서리) 안쪽 바닥에, 모서리를
 * 가로지르는 방향(화면 가로)으로 깔린다. length는 매트의 긴 쪽, depth는 짧은 쪽이다.
 * 방 안쪽을 향한 방향은 (-x, -z)다.
 */
export const ROOM_MAT = {
  x: ROOM_LAYOUT.maxX - 0.8,
  z: ROOM_LAYOUT.maxZ - 0.8,
  length: 2.4,
  depth: 0.7,
  angle: (3 * Math.PI) / 4, // 매트 긴 쪽이 (+x, -z) 방향(화면 가로)이 되도록 돌린 각도
};
const INWARD = Math.SQRT1_2; // 방 안쪽 방향 (-x, -z)의 한 성분(단위 벡터)

/** 방에 들어왔을 때 캐릭터가 서는 자리(월드 좌표, 현관 매트 바로 안쪽). 방 안쪽을 본다. */
export const ROOM_ENTRANCE = {
  x: (ROOM_MAT.x - INWARD * (ROOM_MAT.depth / 2 + 0.9)) * ROOM_SCALE,
  z: (ROOM_MAT.z - INWARD * (ROOM_MAT.depth / 2 + 0.9)) * ROOM_SCALE,
};

/** 가구 종류. 모양은 lib/buildingInterior3d.ts가 종류별로 만든다. */
export type FurnitureKind =
  | 'counter'
  | 'roundTable'
  | 'lowTable'
  | 'stool'
  | 'cushion'
  | 'shelf'
  | 'rack'
  | 'fridge'
  | 'showcase'
  | 'oven'
  | 'stove'
  | 'grill'
  | 'plant'
  | 'flowerBucket'
  | 'bed'
  | 'sofa'
  | 'tv'
  | 'desk'
  | 'lantern'
  | 'motorcycle'
  | 'tires'
  | 'statue'
  | 'offeringBox'
  | 'incense'
  | 'barrel'
  | 'rug'
  | 'blackboard'
  | 'window'
  | 'menuBoard'
  | 'scroll';

/** 방에 놓인 가구 하나. */
export interface InteriorItem {
  kind: FurnitureKind;
  /** 가구 중심의 위치(배치 좌표). 벽걸이(칠판·창문 등)는 벽면 좌표(BACK 또는 LEFT)를 준다. */
  x: number;
  z: number;
  /** 90도 단위 회전 횟수. 0이면 앞면이 +z(현관 쪽), 1이면 +x(왼쪽 벽에 붙일 때)를 본다. */
  turns?: number;
  /** 가구의 대표 색(쿠션·꽃·이불·선반 물건 등). 없으면 종류별 기본색. */
  color?: string;
}

export interface BuildingInterior {
  floorColor: string;
  wallColor: string;
  /** 이 건물에 속한 주민이 서 있는 자리(배치 좌표). 주민이 없는 건물에서는 쓰이지 않는다. */
  residentSpot: { x: number; z: number };
  items: InteriorItem[];
}

/**
 * 가구가 바닥에서 차지하는 크기 [x 길이, z 길이](turns가 0일 때). null이면 밟고 지나갈 수 있다
 * (러그·방석·벽걸이).
 */
const FOOTPRINTS: Record<FurnitureKind, [number, number] | null> = {
  counter: [3.1, 0.8],
  roundTable: [1, 1],
  lowTable: [1.2, 1.2],
  stool: [0.45, 0.45],
  cushion: null,
  shelf: [1.6, 0.5],
  rack: [1.6, 0.6],
  fridge: [1.6, 0.6],
  showcase: [1.8, 0.7],
  oven: [1.4, 0.8],
  stove: [1.6, 0.7],
  grill: [2, 0.8],
  plant: [0.5, 0.5],
  flowerBucket: [0.45, 0.45],
  bed: [1.2, 2.2],
  sofa: [1.8, 0.8],
  tv: [1.2, 0.4],
  desk: [0.8, 1],
  lantern: [0.4, 0.4],
  motorcycle: [1.9, 0.5],
  tires: [0.6, 0.6],
  statue: [1.2, 1],
  offeringBox: [1.2, 0.6],
  incense: [0.5, 0.5],
  barrel: [0.65, 0.65],
  rug: null,
  blackboard: null,
  window: null,
  menuBoard: null,
  scroll: null,
};

/** 탁자 하나와 그 양옆(x 방향) 의자 둘. */
function tableWithStools(x: number, z: number): InteriorItem[] {
  return [
    { kind: 'roundTable', x, z },
    { kind: 'stool', x: x - 0.85, z },
    { kind: 'stool', x: x + 0.85, z },
  ];
}

/** 낮은 상과 그 둘레 방석 넷. */
function lowTableWithCushions(x: number, z: number, color: string): InteriorItem[] {
  return [
    { kind: 'lowTable', x, z },
    { kind: 'cushion', x: x - 1, z, color },
    { kind: 'cushion', x: x + 1, z, color },
    { kind: 'cushion', x, z: z - 1, color },
    { kind: 'cushion', x, z: z + 1, color },
  ];
}

/** 건물 id별 내부. 계산대 뒤 주민 자리는 계산대 중심에서 z로 0.85 뒤다. */
const BUILDING_INTERIORS: Record<string, BuildingInterior> = {
  // 꽃집: 벽을 따라 늘어선 꽃 양동이와 가운데 꽃 진열.
  flower: {
    floorColor: '#e9dcc3',
    wallColor: '#fbe4ea',
    residentSpot: { x: 2.4, z: -3.05 },
    items: [
      { kind: 'counter', x: 2.4, z: -2.2, color: '#d9a9b6' },
      { kind: 'shelf', x: -2.6, z: -3.7, color: '#6dbb62' },
      { kind: 'window', x: -0.3, z: BACK },
      { kind: 'flowerBucket', x: -4.5, z: -2.6, color: '#f4a3b8' },
      { kind: 'flowerBucket', x: -4.5, z: -1.7, color: '#fff3a8' },
      { kind: 'flowerBucket', x: -4.5, z: -0.8, color: '#b9a4f0' },
      { kind: 'flowerBucket', x: -4.5, z: 0.1, color: '#f7b267' },
      { kind: 'flowerBucket', x: -4.5, z: 1, color: '#ffffff' },
      { kind: 'flowerBucket', x: -4.5, z: 1.9, color: '#e4572e' },
      { kind: 'flowerBucket', x: -2.3, z: 0.4, color: '#e4572e' },
      { kind: 'flowerBucket', x: -1.7, z: 0.4, color: '#fff3a8' },
      { kind: 'flowerBucket', x: -2.3, z: 1, color: '#b9a4f0' },
      { kind: 'flowerBucket', x: -1.7, z: 1, color: '#f4a3b8' },
      { kind: 'plant', x: 4.4, z: -3.4 },
      { kind: 'plant', x: 4.4, z: 1.2 },
      { kind: 'plant', x: 4.4, z: 2.2 },
      // 앞쪽: 꽃 진열 탁자와 화분.
      { kind: 'roundTable', x: -2, z: 5.2 },
      { kind: 'flowerBucket', x: -2.7, z: 5.2, color: '#f4a3b8' },
      { kind: 'flowerBucket', x: -1.3, z: 5.2, color: '#fff3a8' },
      { kind: 'flowerBucket', x: -2, z: 4.5, color: '#b9a4f0' },
      { kind: 'flowerBucket', x: -2, z: 5.9, color: '#f7b267' },
      { kind: 'shelf', x: -4.7, z: 5.2, turns: 1, color: '#6dbb62' },
      { kind: 'plant', x: 0.2, z: 6 },
      { kind: 'plant', x: 1.2, z: 4.8 },
    ],
  },
  // 빵집: 빵 진열대와 오븐.
  bakery: {
    floorColor: '#e8d2a6',
    wallColor: '#fff3d6',
    residentSpot: { x: -0.4, z: -2.85 },
    items: [
      { kind: 'showcase', x: -1.4, z: -2, color: '#c98a4b' },
      { kind: 'showcase', x: 0.6, z: -2, color: '#e3b56a' },
      { kind: 'oven', x: 3.6, z: -3.5 },
      { kind: 'menuBoard', x: -2.6, z: BACK, color: '#7a4a2a' },
      { kind: 'shelf', x: -4.7, z: -1.2, turns: 1, color: '#c98a4b' },
      { kind: 'shelf', x: -4.7, z: 0.6, turns: 1, color: '#a8672e' },
      ...tableWithStools(3.1, 1.2),
      { kind: 'plant', x: -4.4, z: 3.2 },
      // 앞쪽: 손님 탁자와 화분.
      ...tableWithStools(-2.9, 4.9),
      ...tableWithStools(-0.6, 5.9),
      { kind: 'shelf', x: -4.7, z: 5.4, turns: 1, color: '#c98a4b' },
      { kind: 'plant', x: 1.2, z: 5.2 },
    ],
  },
  // 찻집: 다다미 바닥에 낮은 상과 방석, 족자.
  tea_house: {
    floorColor: '#b9c48a',
    wallColor: '#efe6cf',
    residentSpot: { x: 2.6, z: -3.05 },
    items: [
      { kind: 'counter', x: 2.6, z: -2.2, color: '#6b4a32' },
      { kind: 'shelf', x: -2.8, z: -3.7, color: '#5f8f5a' },
      { kind: 'scroll', x: -0.4, z: BACK },
      { kind: 'lantern', x: -4.5, z: -3.4, color: '#f5e6b8' },
      ...lowTableWithCushions(-2, 0.3, '#7b4a8a'),
      ...lowTableWithCushions(2.8, 1.4, '#b0483a'),
      { kind: 'plant', x: -4.4, z: 3.2 },
      // 앞쪽: 낮은 상 하나 더, 등롱과 족자.
      ...lowTableWithCushions(-2.6, 5, '#4a6fa5'),
      ...lowTableWithCushions(0.2, 5.1, '#7b4a8a'),
      { kind: 'lantern', x: -4.5, z: 4.4, color: '#f5e6b8' },
      { kind: 'lantern', x: -4.5, z: 6, color: '#f5e6b8' },
      { kind: 'scroll', x: LEFT, z: 5.2, turns: 1 },
    ],
  },
  // 카페: 바 카운터와 손님 탁자.
  cafe: {
    floorColor: '#c9a37a',
    wallColor: '#f7ead7',
    residentSpot: { x: -2, z: -3.05 },
    items: [
      { kind: 'counter', x: -2, z: -2.2, color: '#7a4a2a' },
      { kind: 'stool', x: -3.1, z: -1.4 },
      { kind: 'stool', x: -0.9, z: -1.4 },
      { kind: 'menuBoard', x: -2, z: BACK, color: '#4a2f1e' },
      { kind: 'shelf', x: 1.4, z: -3.7, color: '#f5f0e0' },
      { kind: 'window', x: 3.6, z: BACK },
      ...tableWithStools(2.6, -0.6),
      ...tableWithStools(2.6, 1.9),
      ...tableWithStools(-3, 1.9),
      { kind: 'plant', x: 4.4, z: -3.4 },
      { kind: 'plant', x: -4.5, z: 0.2 },
      // 앞쪽: 손님 탁자와 창문, 화분.
      ...tableWithStools(-2.6, 5),
      ...tableWithStools(0, 5.7),
      { kind: 'window', x: LEFT, z: 5.2, turns: 1 },
      { kind: 'plant', x: -4.5, z: 5.8 },
      { kind: 'plant', x: 1.4, z: 4.6 },
    ],
  },
  // 편의점: 음료 냉장고와 상품 진열대.
  convenience: {
    floorColor: '#e6ebef',
    wallColor: '#ffffff',
    residentSpot: { x: 3.2, z: -3.05 },
    items: [
      { kind: 'fridge', x: -3.9, z: -3.65 },
      { kind: 'fridge', x: -2.2, z: -3.65 },
      { kind: 'fridge', x: -0.5, z: -3.65 },
      { kind: 'counter', x: 3.2, z: -2.2, color: '#8fb8d8' },
      { kind: 'rack', x: -3, z: -1 },
      { kind: 'rack', x: -3, z: 0.8 },
      { kind: 'rack', x: -3, z: 2.6 },
      { kind: 'rack', x: 3, z: 1.2 },
      { kind: 'rack', x: 3, z: 3 },
      // 앞쪽: 진열대 더 놓고 벽에 냉장고.
      { kind: 'fridge', x: -4.7, z: 5.4, turns: 1 },
      { kind: 'rack', x: -3, z: 4.4 },
      { kind: 'rack', x: -3, z: 6 },
      { kind: 'rack', x: -0.8, z: 5.2 },
    ],
  },
  // 라면집: 긴 카운터 좌석과 주방.
  ramen: {
    floorColor: '#8c6a4f',
    wallColor: '#f3dfc4',
    residentSpot: { x: -1, z: -2.6 },
    items: [
      { kind: 'counter', x: -2.5, z: -1.6, color: '#b0483a' },
      { kind: 'counter', x: 0.5, z: -1.6, color: '#b0483a' },
      { kind: 'stool', x: -3.6, z: -0.8, color: '#c8473d' },
      { kind: 'stool', x: -2.6, z: -0.8, color: '#c8473d' },
      { kind: 'stool', x: 0.6, z: -0.8, color: '#c8473d' },
      { kind: 'stool', x: 1.6, z: -0.8, color: '#c8473d' },
      { kind: 'stove', x: -2.9, z: -3.55 },
      { kind: 'stove', x: 0.9, z: -3.55 },
      { kind: 'menuBoard', x: 3.6, z: BACK, color: '#b0483a' },
      { kind: 'lantern', x: 4.5, z: -3.3 },
      ...tableWithStools(3.2, 1.4),
      { kind: 'lantern', x: -4.5, z: 3.4 },
      // 앞쪽: 손님 탁자와 등.
      ...tableWithStools(-2.6, 5.2),
      ...tableWithStools(0, 5.2),
      { kind: 'lantern', x: -4.5, z: 4.6 },
      { kind: 'lantern', x: 1.6, z: 6.2 },
    ],
  },
  // 내 집: 침대, 소파와 TV, 책장.
  home: {
    floorColor: '#d9b98a',
    wallColor: '#f6efe3',
    residentSpot: { x: 0, z: 0 },
    items: [
      { kind: 'bed', x: -4.2, z: -2.7, color: '#8fb8d8' },
      { kind: 'window', x: -2.2, z: BACK },
      { kind: 'tv', x: 1, z: -3.7 },
      { kind: 'rug', x: 1, z: -1.9, color: '#d9776b' },
      { kind: 'sofa', x: 1, z: -0.5, turns: 2, color: '#7fa37a' },
      { kind: 'shelf', x: 3.8, z: -3.7 },
      { kind: 'lowTable', x: -3.6, z: 1.6 },
      { kind: 'cushion', x: -2.6, z: 1.6, color: '#e8c07d' },
      { kind: 'scroll', x: LEFT, z: 1.6, turns: 1 },
      { kind: 'plant', x: 4.4, z: 0.6 },
      { kind: 'plant', x: -4.5, z: 3.4 },
      // 앞쪽: 작업 책상, 러그, 책장.
      { kind: 'shelf', x: -4.7, z: 5, turns: 1 },
      { kind: 'desk', x: -3.2, z: 5.4 },
      { kind: 'stool', x: -3.2, z: 6.1 },
      { kind: 'rug', x: -0.6, z: 5.2, color: '#8fb8d8' },
      { kind: 'plant', x: 1.2, z: 6 },
      { kind: 'plant', x: -4.5, z: 6.1 },
    ],
  },
  // 학교: 칠판과 줄지어 놓인 책걸상.
  school: {
    floorColor: '#d8c49a',
    wallColor: '#eef3e6',
    residentSpot: { x: 0, z: -2.9 },
    items: [
      { kind: 'blackboard', x: 0, z: BACK },
      { kind: 'window', x: LEFT, z: -1.4, turns: 1 },
      { kind: 'window', x: LEFT, z: 1.4, turns: 1 },
      { kind: 'desk', x: -3.2, z: -0.4 },
      { kind: 'desk', x: -1.7, z: -0.4 },
      { kind: 'desk', x: 1.7, z: -0.4 },
      { kind: 'desk', x: 3.2, z: -0.4 },
      { kind: 'desk', x: -3.2, z: 1.5 },
      { kind: 'desk', x: -1.7, z: 1.5 },
      { kind: 'desk', x: 1.7, z: 1.5 },
      { kind: 'desk', x: 3.2, z: 1.5 },
      { kind: 'shelf', x: 3.8, z: -3.7 },
      { kind: 'plant', x: -4.4, z: -3.4 },
      // 앞쪽: 책걸상 줄을 더 늘리고 창문과 화분.
      { kind: 'desk', x: -3.2, z: 3.4 },
      { kind: 'desk', x: -1.7, z: 3.4 },
      { kind: 'desk', x: -0.2, z: 3.4 },
      { kind: 'desk', x: -3.2, z: 5.3 },
      { kind: 'desk', x: -1.7, z: 5.3 },
      { kind: 'desk', x: -0.2, z: 5.3 },
      { kind: 'desk', x: 1.3, z: 5.3 },
      { kind: 'window', x: LEFT, z: 4.2, turns: 1 },
      { kind: 'plant', x: -4.4, z: 6 },
    ],
  },
  // 도서관: 벽을 채운 책장과 읽는 자리.
  library: {
    floorColor: '#b08d64',
    wallColor: '#efe4d0',
    residentSpot: { x: 3.3, z: -3.05 },
    items: [
      { kind: 'shelf', x: -3.9, z: -3.7 },
      { kind: 'shelf', x: -2.2, z: -3.7 },
      { kind: 'shelf', x: -0.5, z: -3.7 },
      { kind: 'shelf', x: -4.7, z: -1.6, turns: 1 },
      { kind: 'shelf', x: -4.7, z: 0.2, turns: 1 },
      { kind: 'shelf', x: -4.7, z: 2, turns: 1 },
      { kind: 'counter', x: 3.3, z: -2.2, color: '#9c8468' },
      { kind: 'rug', x: -1.6, z: 0.6, color: '#7a8f6a' },
      ...tableWithStools(-1.6, 0.6),
      ...tableWithStools(2.8, 1.6),
      { kind: 'plant', x: 4.4, z: 3.2 },
      // 앞쪽: 책장을 이어 놓고 읽는 자리를 더한다.
      { kind: 'shelf', x: -4.7, z: 3.6, turns: 1 },
      { kind: 'shelf', x: -4.7, z: 5.2, turns: 1 },
      { kind: 'rug', x: -2.4, z: 5, color: '#8a6f9a' },
      ...tableWithStools(-2.4, 5),
      ...tableWithStools(0.4, 5.8),
      { kind: 'plant', x: 1.4, z: 4.8 },
    ],
  },
  // 오토바이 가게: 전시된 오토바이, 공구 선반, 타이어.
  bike_shop: {
    floorColor: '#9aa0a6',
    wallColor: '#dfe3e6',
    residentSpot: { x: 1.6, z: -3.05 },
    items: [
      { kind: 'counter', x: 1.6, z: -2.2, color: '#5d6570' },
      { kind: 'shelf', x: -3.4, z: -3.7, color: '#8a8f96' },
      { kind: 'menuBoard', x: -1.2, z: BACK, color: '#c8473d' },
      { kind: 'tires', x: 4.3, z: -3.4 },
      { kind: 'tires', x: 4.3, z: -2.6 },
      { kind: 'motorcycle', x: -2.8, z: -1, color: '#c8473d' },
      { kind: 'motorcycle', x: -2.8, z: 0.6, color: '#3b6fb5' },
      { kind: 'motorcycle', x: -2.8, z: 2.2, color: '#f0b94a' },
      { kind: 'motorcycle', x: 3.2, z: 1.6, turns: 1, color: '#2f2f2f' },
      // 앞쪽: 전시 오토바이를 더 세우고 타이어와 공구 선반.
      { kind: 'motorcycle', x: -2.8, z: 3.8, color: '#7a4ab5' },
      { kind: 'motorcycle', x: -2.8, z: 5.4, color: '#4aa3a2' },
      { kind: 'tires', x: -4.5, z: 4.6 },
      { kind: 'tires', x: -4.5, z: 5.4 },
      { kind: 'tires', x: -4.5, z: 6.2 },
      { kind: 'shelf', x: -0.2, z: 5.8, color: '#8a8f96' },
      { kind: 'motorcycle', x: 0.2, z: 4.5, turns: 1, color: '#c8473d' },
    ],
  },
  // 절: 불상과 향로, 새전함.
  temple: {
    floorColor: '#7a5a3e',
    wallColor: '#e9dcc0',
    residentSpot: { x: 2.8, z: -1.4 },
    items: [
      { kind: 'statue', x: 0, z: -3.3 },
      { kind: 'lantern', x: -1.5, z: -3.4, color: '#f5e6b8' },
      { kind: 'lantern', x: 1.5, z: -3.4, color: '#f5e6b8' },
      { kind: 'incense', x: 0, z: -2.1 },
      { kind: 'offeringBox', x: 0, z: -1 },
      { kind: 'scroll', x: -3.2, z: BACK },
      { kind: 'scroll', x: 3.2, z: BACK },
      { kind: 'cushion', x: -0.9, z: 0.4, color: '#7b4a8a' },
      { kind: 'cushion', x: 0.9, z: 0.4, color: '#7b4a8a' },
      { kind: 'cushion', x: -0.9, z: 1.4, color: '#7b4a8a' },
      { kind: 'cushion', x: 0.9, z: 1.4, color: '#7b4a8a' },
      { kind: 'plant', x: -4.4, z: -3.4 },
      // 앞쪽: 참배 방석을 늘리고 등롱, 족자, 화분.
      { kind: 'cushion', x: -0.9, z: 2.4, color: '#7b4a8a' },
      { kind: 'cushion', x: 0.9, z: 2.4, color: '#7b4a8a' },
      { kind: 'cushion', x: -0.9, z: 3.4, color: '#7b4a8a' },
      { kind: 'cushion', x: 0.9, z: 3.4, color: '#7b4a8a' },
      { kind: 'lantern', x: -2.6, z: 5.4, color: '#f5e6b8' },
      { kind: 'lantern', x: -0.2, z: 5.4, color: '#f5e6b8' },
      { kind: 'scroll', x: LEFT, z: 5.2, turns: 1 },
      { kind: 'plant', x: -4.4, z: 4.4 },
      { kind: 'plant', x: -4.4, z: 6 },
    ],
  },
  // 타코야끼 가게: 철판과 붉은 등, 서서 먹는 탁자.
  takoyaki: {
    floorColor: '#d7b98e',
    wallColor: '#fff0d2',
    residentSpot: { x: 0, z: -2.85 },
    items: [
      { kind: 'grill', x: 0, z: -2 },
      { kind: 'lantern', x: -1.6, z: -2 },
      { kind: 'lantern', x: 1.6, z: -2 },
      { kind: 'menuBoard', x: 0, z: BACK, color: '#b0483a' },
      { kind: 'shelf', x: -3.6, z: -3.7, color: '#e3a65c' },
      { kind: 'barrel', x: 4.3, z: -3.4 },
      ...tableWithStools(-3, 1.2),
      ...tableWithStools(3, 1.2),
      // 앞쪽: 서서 먹는 탁자를 더 놓고 술통 대신 통, 등.
      ...tableWithStools(-3, 3.6),
      ...tableWithStools(-2.9, 5.6),
      { kind: 'barrel', x: -4.5, z: 4.4 },
      { kind: 'barrel', x: -4.5, z: 5.2 },
      { kind: 'lantern', x: 0, z: 6 },
      { kind: 'lantern', x: 1.4, z: 6 },
    ],
  },
  // 술집: 카운터 좌석, 술병 선반과 술통, 좌식 자리.
  izakaya: {
    floorColor: '#5e4635',
    wallColor: '#e7d3b3',
    residentSpot: { x: -1, z: -2.85 },
    items: [
      { kind: 'counter', x: -2.5, z: -2, color: '#3d2a1c' },
      { kind: 'counter', x: 0.5, z: -2, color: '#3d2a1c' },
      { kind: 'stool', x: -3.6, z: -1.2 },
      { kind: 'stool', x: -2.6, z: -1.2 },
      { kind: 'stool', x: 0.6, z: -1.2 },
      { kind: 'stool', x: 1.6, z: -1.2 },
      { kind: 'shelf', x: -1, z: -3.7, color: '#4f7a4a' },
      { kind: 'barrel', x: 4.3, z: -3.4 },
      { kind: 'barrel', x: 3.5, z: -3.4 },
      { kind: 'lantern', x: 4.5, z: -2.5 },
      ...lowTableWithCushions(3, 1.2, '#b0483a'),
      ...lowTableWithCushions(-3, 1.8, '#b0483a'),
      // 앞쪽: 좌식 자리를 더 놓고 술통과 등.
      ...lowTableWithCushions(-3, 5, '#b0483a'),
      ...lowTableWithCushions(0, 5.2, '#4f7a4a'),
      { kind: 'barrel', x: -4.6, z: 6.2 },
      { kind: 'lantern', x: 1.6, z: 6.2 },
    ],
  },
};

/** 위 목록에 없는 건물(시트에 새로 추가한 건물)은 이 빈 방으로 그린다. */
const DEFAULT_INTERIOR: BuildingInterior = {
  floorColor: '#d9c7a3',
  wallColor: '#f3ece0',
  residentSpot: { x: 0, z: -2.5 },
  items: [
    { kind: 'window', x: 0, z: BACK },
    { kind: 'plant', x: -4.4, z: -3.4 },
    { kind: 'window', x: LEFT, z: 5.2, turns: 1 },
    { kind: 'rug', x: -1.5, z: 4.6, color: '#d9776b' },
    { kind: 'plant', x: -4.4, z: 5.6 },
    { kind: 'plant', x: 1, z: 5.8 },
  ],
};

export function getBuildingInterior(buildingId: string): BuildingInterior {
  return BUILDING_INTERIORS[buildingId] ?? DEFAULT_INTERIOR;
}

/** 캐릭터(원)가 월드 좌표 (worldX, worldZ)에 서 있을 때 어느 가구(사각형)와든 겹치는지 검사한다. */
export function collidesWithFurniture(
  items: InteriorItem[],
  worldX: number,
  worldZ: number,
): boolean {
  // 가구가 배치 좌표로 적혀 있으므로 캐릭터 위치와 반지름을 배치 좌표로 바꿔서 비교한다.
  const x = worldX / ROOM_SCALE;
  const z = worldZ / ROOM_SCALE;
  const radius = PLAYER_RADIUS / ROOM_SCALE;
  return items.some((item) => {
    const footprint = FOOTPRINTS[item.kind];
    if (!footprint) {
      return false;
    }
    // 90도 홀수 번 돌린 가구는 가로와 세로가 바뀐다.
    const turned = (item.turns ?? 0) % 2 === 1;
    const halfWidth = (turned ? footprint[1] : footprint[0]) / 2;
    const halfDepth = (turned ? footprint[0] : footprint[1]) / 2;
    const nearestX = Math.max(item.x - halfWidth, Math.min(x, item.x + halfWidth));
    const nearestZ = Math.max(item.z - halfDepth, Math.min(z, item.z + halfDepth));
    return Math.hypot(x - nearestX, z - nearestZ) < radius;
  });
}

const EXIT_DEPTH = ROOM_MAT.depth / 2 + 0.6; // 매트 중심에서 방 안쪽으로 이 거리까지가 매트 위(배치 좌표)

/** 캐릭터가 현관 매트(방의 맨 아래 모서리 안쪽) 위에 서 있는지. 여기서 밖으로 나갈 수 있다. */
export function isAtRoomExit(x: number, z: number): boolean {
  // 월드 좌표를 배치 좌표로 바꾼 뒤, 매트 중심 기준으로 안쪽 방향·가로 방향 거리를 잰다.
  const dx = x / ROOM_SCALE - ROOM_MAT.x;
  const dz = z / ROOM_SCALE - ROOM_MAT.z;
  const inward = -(dx + dz) * INWARD;
  const across = (dx - dz) * INWARD;
  return Math.abs(across) <= ROOM_MAT.length / 2 && Math.abs(inward) <= EXIT_DEPTH;
}
