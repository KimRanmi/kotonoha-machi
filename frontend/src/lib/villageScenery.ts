import type { VillageBuilding } from '../api/village';
import { PLAYER_RADIUS, buildingAngle, toRotatedLocal } from './villageBuildings';

/** 가운데가 (x, z)인 직사각형. 길이나 건물 자리를 나타낸다. angle(라디안)은 three.js의 rotation.y처럼 돌린 각도다. */
export interface Rect {
  x: number;
  z: number;
  width: number;
  depth: number;
  angle: number;
}

export interface Plant {
  x: number;
  z: number;
  /** 모양/색을 고르는 번호. 나무는 0이면 둥근 나무, 1이면 소나무. */
  variant: number;
}

export const TREE_RADIUS = 0.6;

/** 땅 가장자리에서 이만큼 안쪽까지만 나무·꽃을 심는다. */
const PLANT_MARGIN = 2;
const ROAD_WIDTH = 2;
const DOOR_PATH_WIDTH = 1.4;

type Point = [x: number, z: number];

/**
 * 마을 길. 길마다 꺾이는 점을 순서대로 적는다. 광장(0, 0)을 지나는 동서 큰길에서 골목이 갈라져 나가고,
 * 건물(서버 데이터)은 이 길가에 놓여 있다. 길은 나무·꽃처럼 풍경이라 시트가 아니라 여기에 둔다.
 */
const VILLAGE_ROADS: Point[][] = [
  // 동서 큰길
  [
    [-34, 1],
    [-20, -1],
    [-6, 0],
    [6, 0],
    [20, 1.5],
    [34, 0],
  ],
  // 광장에서 절까지 올라가는 북쪽 길
  [
    [0, 0],
    [1, -12],
    [-3, -24],
    [-2.5, -32],
  ],
  // 남쪽 길
  [
    [14, 1],
    [16, 14],
    [12, 26],
    [14, 36],
  ],
  // 서쪽 골목
  [
    [-24, -0.5],
    [-27, 12],
    [-25, 24],
  ],
  // 북동쪽 골목
  [
    [26, 1],
    [28, -12],
    [24, -22],
  ],
];

/** 길을 곧은 토막(두 점)으로 나눈 목록. */
const ROAD_SEGMENTS: [Point, Point][] = VILLAGE_ROADS.flatMap((road) =>
  road.slice(1).map((point, index): [Point, Point] => [road[index], point]),
);

/** 두 점을 잇는 길 한 토막을 돌아간 직사각형으로 만든다. extra만큼 양 끝을 늘여 꺾이는 곳에 틈이 없게 한다. */
function segmentRect(from: Point, to: Point, width: number, extra: number): Rect {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  return {
    x: (from[0] + to[0]) / 2,
    z: (from[1] + to[1]) / 2,
    width,
    depth: Math.hypot(dx, dz) + extra,
    angle: Math.atan2(dx, dz), // 직사각형의 긴 쪽(z)이 길 방향을 향하게 돌린다
  };
}

/** 점 (x, z)에서 가장 가까운 길 위의 점. */
function nearestRoadPoint(x: number, z: number): Point {
  let nearest: Point = [0, 0];
  let nearestDistance = Infinity;
  for (const [from, to] of ROAD_SEGMENTS) {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    // 토막 위에서 점과 가장 가까운 자리(0이면 from, 1이면 to).
    const ratio = Math.max(
      0,
      Math.min(1, ((x - from[0]) * dx + (z - from[1]) * dz) / (dx * dx + dz * dz)),
    );
    const point: Point = [from[0] + dx * ratio, from[1] + dz * ratio];
    const distance = Math.hypot(x - point[0], z - point[1]);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/** 중앙 광장, 마을 길, 그리고 각 건물 문에서 가장 가까운 길까지 잇는 짧은 길. */
function createPaths(buildings: VillageBuilding[]): Rect[] {
  return [
    { x: 0, z: 0, width: 5, depth: 5, angle: 0 },
    ...ROAD_SEGMENTS.map(([from, to]) => segmentRect(from, to, ROAD_WIDTH, ROAD_WIDTH)),
    ...buildings.map((building) => {
      const angle = buildingAngle(building);
      // 문은 건물이 향한 쪽 벽 가운데에 있다.
      const door: Point = [
        building.x + (Math.sin(angle) * building.depth) / 2,
        building.z + (Math.cos(angle) * building.depth) / 2,
      ];
      return segmentRect(door, nearestRoadPoint(door[0], door[1]), DOOR_PATH_WIDTH, 0);
    }),
  ];
}

/**
 * 마을 길 위에 고르게 퍼진 자리 `count`개를 돌려준다. 길을 전부 이은 길이를 똑같이 나눈 지점이고,
 * 길 한가운데를 막지 않게 가장자리 쪽으로 번갈아 비켜 놓는다. 길 위에 주민을 세울 때 쓴다.
 */
export function spotsAlongRoads(count: number): { x: number; z: number }[] {
  const lengths = ROAD_SEGMENTS.map(([from, to]) => Math.hypot(to[0] - from[0], to[1] - from[1]));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  return Array.from({ length: count }, (_, index) => {
    let remaining = ((index + 0.5) / count) * total;
    let segment = 0;
    while (segment < lengths.length - 1 && remaining > lengths[segment]) {
      remaining -= lengths[segment];
      segment++;
    }
    const [from, to] = ROAD_SEGMENTS[segment];
    const dx = (to[0] - from[0]) / lengths[segment];
    const dz = (to[1] - from[1]) / lengths[segment];
    const side = (index % 2 === 0 ? 1 : -1) * (ROAD_WIDTH / 2 - 0.4);
    return {
      x: from[0] + dx * remaining - dz * side,
      z: from[1] + dz * remaining + dx * side,
    };
  });
}

function isInsideRect(x: number, z: number, rect: Rect, margin: number): boolean {
  // 점을 사각형 기준 좌표로 돌려 놓고 비교한다.
  const local = toRotatedLocal(rect.x, rect.z, rect.angle, x, z);
  return Math.abs(local.x) < rect.width / 2 + margin && Math.abs(local.z) < rect.depth / 2 + margin;
}

/** 식물을 심을 자리가 막혀 있는지 묻는 함수. margin은 건물·길에서 띄울 거리다. */
type IsOccupied = (x: number, z: number, margin: number) => boolean;

/** 건물이나 길 위라서 식물을 심으면 안 되는 곳인지 판단하는 함수를 만든다. */
function createIsOccupied(buildings: VillageBuilding[], paths: Rect[]): IsOccupied {
  return (x, z, margin) =>
    buildings.some((building) =>
      isInsideRect(x, z, { ...building, angle: buildingAngle(building) }, margin + 1),
    ) || paths.some((path) => isInsideRect(x, z, path, margin));
}

/** 같은 시드면 항상 같은 숫자열을 주는 난수. 새로 고쳐도 마을이 똑같이 나오게 한다. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scatterTrees(isOccupied: IsOccupied, plantLimit: number): Plant[] {
  const random = createRandom(7);
  const trees: Plant[] = [];
  for (let attempt = 0; attempt < 3000 && trees.length < 70; attempt++) {
    const x = (random() * 2 - 1) * plantLimit;
    const z = (random() * 2 - 1) * plantLimit;
    const tooClose = trees.some((tree) => Math.hypot(tree.x - x, tree.z - z) < 4);
    // 건물 앞을 가리지 않도록 건물·길에서 넉넉히 떨어뜨린다.
    if (!isOccupied(x, z, 2) && !tooClose) {
      trees.push({ x, z, variant: random() < 0.6 ? 0 : 1 });
    }
  }
  return trees;
}

function scatterFlowers(trees: Plant[], isOccupied: IsOccupied, plantLimit: number): Plant[] {
  const random = createRandom(21);
  const flowers: Plant[] = [];
  // 꽃은 한 송이씩 흩뿌리지 않고 무리 지어 핀다.
  for (let cluster = 0; cluster < 80; cluster++) {
    const centerX = (random() * 2 - 1) * plantLimit;
    const centerZ = (random() * 2 - 1) * plantLimit;
    for (let i = 0; i < 10; i++) {
      const x = centerX + (random() * 2 - 1) * 1.8;
      const z = centerZ + (random() * 2 - 1) * 1.8;
      const nearTree = trees.some((tree) => Math.hypot(tree.x - x, tree.z - z) < TREE_RADIUS + 0.3);
      if (
        Math.abs(x) < plantLimit &&
        Math.abs(z) < plantLimit &&
        !isOccupied(x, z, 0.3) &&
        !nearTree
      ) {
        flowers.push({ x, z, variant: Math.floor(random() * 5) });
      }
    }
  }
  return flowers;
}

function scatterBushes(trees: Plant[], isOccupied: IsOccupied, plantLimit: number): Plant[] {
  const random = createRandom(99);
  const bushes: Plant[] = [];
  for (let attempt = 0; attempt < 1200 && bushes.length < 90; attempt++) {
    const x = (random() * 2 - 1) * plantLimit;
    const z = (random() * 2 - 1) * plantLimit;
    const nearTree = trees.some((tree) => Math.hypot(tree.x - x, tree.z - z) < 1.5);
    if (!isOccupied(x, z, 0.8) && !nearTree) {
      bushes.push({ x, z, variant: 0 });
    }
  }
  return bushes;
}

/** 숲은 걸어 다니는 땅 가장자리에서 이만큼 바깥부터 시작하고, 거기서 이만큼 더 바깥까지 이어진다. */
const FOREST_GAP = 1.5;
const FOREST_WIDTH = 40;
const FOREST_SPACING = 6.5;

/** 걸어 다닐 수 있는 땅 바깥을 둘러싼 숲. 캐릭터가 들어갈 수 없는 곳이라 충돌 판정은 없다. */
function scatterForest(mapHalfSize: number): Plant[] {
  const forestStart = mapHalfSize + FOREST_GAP;
  const forestEnd = forestStart + FOREST_WIDTH;
  const random = createRandom(2024);
  const forest: Plant[] = [];
  for (let gx = -forestEnd; gx <= forestEnd; gx += FOREST_SPACING) {
    for (let gz = -forestEnd; gz <= forestEnd; gz += FOREST_SPACING) {
      // 격자에서 조금씩 흔들어 심어야 줄 맞춰 선 것처럼 보이지 않는다.
      const x = gx + (random() * 2 - 1) * 1.6;
      const z = gz + (random() * 2 - 1) * 1.6;
      if (Math.max(Math.abs(x), Math.abs(z)) > forestStart) {
        forest.push({ x, z, variant: random() < 0.5 ? 0 : 1 });
      }
    }
  }
  return forest;
}

/** 건물 목록에서 계산하는 마을 배치. 건물이 바뀌면 길·나무·꽃·덤불도 새로 계산해야 한다. */
export interface VillageLayout {
  paths: Rect[];
  trees: Plant[];
  flowers: Plant[];
  bushes: Plant[];
  /** 걸어 다닐 수 있는 땅 바깥의 숲. 건물과 상관없이 땅 크기만으로 정해진다. */
  forest: Plant[];
}

/**
 * 서버에서 받은 건물 목록과 땅 크기(절반, `mapHalfSize`)로 길과 식물 배치를 계산한다.
 * 같은 입력이면 항상 같은 배치가 나온다.
 */
export function createVillageLayout(
  buildings: VillageBuilding[],
  mapHalfSize: number,
): VillageLayout {
  const plantLimit = mapHalfSize - PLANT_MARGIN;
  const paths = createPaths(buildings);
  const isOccupied = createIsOccupied(buildings, paths);
  const trees = scatterTrees(isOccupied, plantLimit);
  return {
    paths,
    trees,
    flowers: scatterFlowers(trees, isOccupied, plantLimit),
    bushes: scatterBushes(trees, isOccupied, plantLimit),
    forest: scatterForest(mapHalfSize),
  };
}

/** 캐릭터(원)가 (x, z)에 서 있을 때 어느 나무 줄기와든 겹치는지 검사한다. 꽃과 덤불은 지나다닐 수 있다. */
export function collidesWithTrees(trees: Plant[], x: number, z: number): boolean {
  return trees.some((tree) => Math.hypot(x - tree.x, z - tree.z) < PLAYER_RADIUS + TREE_RADIUS);
}
