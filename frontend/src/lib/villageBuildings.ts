/** 마을에 서 있는 건물 하나. 위치(x, z)는 건물 중심, width는 x 방향, depth는 z 방향 길이다. */
export interface VillageBuilding {
  id: string;
  /** 간판에 일본어로 적히는 이름. */
  label: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

export const PLAYER_RADIUS = 0.26;

/** 벽 위에 얹는 뾰족 지붕의 높이. */
export const ROOF_HEIGHT = 1.6;

export const VILLAGE_BUILDINGS: VillageBuilding[] = [
  {
    id: 'cafe',
    label: 'カフェ',
    x: -8,
    z: -4,
    width: 5,
    depth: 4,
    height: 2.5,
    color: '#C97B4A',
  },
  {
    id: 'shop',
    label: 'お店',
    x: 2,
    z: -10,
    width: 5,
    depth: 4,
    height: 2.5,
    color: '#8FA7C4',
  },
  {
    id: 'home',
    label: 'わが家',
    x: 10,
    z: -4,
    width: 4,
    depth: 4,
    height: 2.2,
    color: '#E8C07D',
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

const DOOR_HALF_WIDTH = 0.55; // 문 너비(1.1)의 절반
const DOOR_REACH = 0.3; // 벽에 닿은 캐릭터 중심에서 이만큼 안쪽이면 문 앞으로 본다

/**
 * 캐릭터가 (x, z)에서 건물 문 앞(문은 +z 벽 가운데)에 닿아 있으면 그 건물을 돌려준다.
 * 문 폭 안쪽에서 벽에 붙어 있을 때만 참이라, 건물 옆을 스쳐 지나가는 것으로는 들어가지지 않는다.
 */
export function findDoorAt(x: number, z: number): VillageBuilding | undefined {
  return VILLAGE_BUILDINGS.find((building) => {
    const wallZ = building.z + building.depth / 2;
    return (
      Math.abs(x - building.x) <= DOOR_HALF_WIDTH &&
      z >= wallZ &&
      z <= wallZ + PLAYER_RADIUS + DOOR_REACH
    );
  });
}
