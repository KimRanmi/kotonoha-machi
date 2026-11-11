import type { VillageBuilding } from '../api/village';

export const PLAYER_RADIUS = 0.26;

/** 벽 위에 얹는 뾰족 지붕의 높이. */
export const ROOF_HEIGHT = 1.6;

/** 건물이 향한 방향을 라디안으로 바꾼다. three.js에서 건물 묶음의 rotation.y에 그대로 쓴다. */
export function buildingAngle(building: VillageBuilding): number {
  return (building.rotation * Math.PI) / 180;
}

/**
 * 월드 좌표 (x, z)를 중심이 (centerX, centerZ)이고 `angle`(라디안, rotation.y)만큼 돌아간 물체 기준 좌표로 바꾼다.
 * 돌아간 직사각형도 이 좌표에서는 축에 맞는 직사각형이 되어 비교가 쉽다.
 */
export function toRotatedLocal(
  centerX: number,
  centerZ: number,
  angle: number,
  x: number,
  z: number,
): { x: number; z: number } {
  const dx = x - centerX;
  const dz = z - centerZ;
  return {
    x: dx * Math.cos(angle) - dz * Math.sin(angle),
    z: dx * Math.sin(angle) + dz * Math.cos(angle),
  };
}

/** 월드 좌표 (x, z)를 건물 기준, 건물을 돌리기 전(문이 +z) 좌표로 바꾼다. */
function toBuildingLocal(
  building: VillageBuilding,
  x: number,
  z: number,
): { x: number; z: number } {
  return toRotatedLocal(building.x, building.z, buildingAngle(building), x, z);
}

/** 캐릭터(원)가 (x, z)에 서 있을 때 어느 건물(돌아간 사각형)과든 겹치는지 검사한다. */
export function collidesWithBuildings(buildings: VillageBuilding[], x: number, z: number): boolean {
  return buildings.some((building) => {
    // 캐릭터를 건물 기준 좌표로 옮기면 건물은 축에 맞는 사각형이 된다.
    const local = toBuildingLocal(building, x, z);
    // 건물 사각형에서 캐릭터 중심에 가장 가까운 점을 구해, 그 거리가 반지름보다 짧으면 겹친 것이다.
    const nearestX = Math.max(-building.width / 2, Math.min(local.x, building.width / 2));
    const nearestZ = Math.max(-building.depth / 2, Math.min(local.z, building.depth / 2));
    return Math.hypot(local.x - nearestX, local.z - nearestZ) < PLAYER_RADIUS;
  });
}

/** 문 너비. 3D 문 모양과 문 앞 판정이 같은 값을 쓴다. */
export const DOOR_WIDTH = 1.1;
const DOOR_REACH = 0.3; // 벽에 닿은 캐릭터 중심에서 이만큼 안쪽이면 문 앞으로 본다

/**
 * 캐릭터가 (x, z)에서 건물 문 앞(문은 +z 벽 가운데)에 서 있으면 그 건물을 돌려준다.
 * 문 폭 안쪽에서 벽에 붙어 있을 때만 참이라, 건물 옆을 지나가는 것으로는 해당되지 않는다.
 */
export function findDoorAt(
  buildings: VillageBuilding[],
  x: number,
  z: number,
): VillageBuilding | undefined {
  return buildings.find((building) => {
    const local = toBuildingLocal(building, x, z);
    const wallZ = building.depth / 2;
    // local.z >= wallZ가 없으면 건물 뒤편의 같은 자리에서도 문 앞으로 잘못 판정된다.
    return (
      Math.abs(local.x) <= DOOR_WIDTH / 2 &&
      local.z >= wallZ &&
      local.z <= wallZ + PLAYER_RADIUS + DOOR_REACH
    );
  });
}
