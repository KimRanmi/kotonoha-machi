/** 마을에 서 있는 건물 하나. 위치(x, z)는 건물 중심, width는 x 방향, depth는 z 방향 길이다. */
export interface VillageBuilding {
  id: string;
  label: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  /** 아직 테마 학습으로 열리지 않은 건물인지 여부. 해금 처리는 다음 단계에서 붙인다. */
  locked: boolean;
}

export const PLAYER_RADIUS = 0.5;

/** 벽 위에 얹는 뾰족 지붕의 높이. */
export const ROOF_HEIGHT = 1.6;

export const VILLAGE_BUILDINGS: VillageBuilding[] = [
  {
    id: 'cafe',
    label: '카페',
    x: -8,
    z: -4,
    width: 5,
    depth: 4,
    height: 2.5,
    color: '#C97B4A',
    locked: false,
  },
  {
    id: 'shop',
    label: '상점',
    x: 2,
    z: -10,
    width: 5,
    depth: 4,
    height: 2.5,
    color: '#8FA7C4',
    locked: true,
  },
  {
    id: 'hall',
    label: '마을회관',
    x: 10,
    z: 2,
    width: 6,
    depth: 4,
    height: 3,
    color: '#9A8FB0',
    locked: true,
  },
];

/** 캐릭터(원)가 (x, z)에 서 있을 때 어느 건물(사각형)과든 겹치는지 검사한다. */
export function collidesWithBuildings(x: number, z: number): boolean {
  return VILLAGE_BUILDINGS.some((building) => {
    // 건물 사각형에서 캐릭터 중심에 가장 가까운 점을 구해, 그 거리가 반지름보다 짧으면 겹친 것이다.
    const nearestX = Math.max(
      building.x - building.width / 2,
      Math.min(x, building.x + building.width / 2),
    );
    const nearestZ = Math.max(
      building.z - building.depth / 2,
      Math.min(z, building.z + building.depth / 2),
    );
    return Math.hypot(x - nearestX, z - nearestZ) < PLAYER_RADIUS;
  });
}
