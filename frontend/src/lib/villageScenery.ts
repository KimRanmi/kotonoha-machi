import type { VillageBuilding } from '../api/village';
import { PLAYER_RADIUS } from './villageBuildings';

/** 가운데가 (x, z)인 직사각형. 길이나 건물 자리를 나타낼 때 쓴다. */
export interface Rect {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface Plant {
  x: number;
  z: number;
  /** 모양/색을 고르는 번호. 나무는 0이면 둥근 나무, 1이면 소나무. */
  variant: number;
}

export const TREE_RADIUS = 0.6;

/** 나무·꽃을 심을 수 있는 땅의 절반 크기(가장자리에서 조금 안쪽). */
const PLANT_LIMIT = 20;
const PATH_WIDTH = 1.6;

/** 중앙 광장과, 광장에서 각 건물 문 앞까지 이어지는 길. */
function createPaths(buildings: VillageBuilding[]): Rect[] {
  return [
    { x: 0, z: 0, width: 5, depth: 5 },
    ...buildings.flatMap((building) => {
      const doorZ = building.z + building.depth / 2; // 문은 +z 쪽 벽에 있다.
      return [
        { x: building.x, z: doorZ / 2, width: PATH_WIDTH, depth: Math.abs(doorZ) },
        { x: building.x / 2, z: 0, width: Math.abs(building.x), depth: PATH_WIDTH },
      ];
    }),
  ];
}

function isInsideRect(x: number, z: number, rect: Rect, margin: number): boolean {
  return (
    Math.abs(x - rect.x) < rect.width / 2 + margin && Math.abs(z - rect.z) < rect.depth / 2 + margin
  );
}

/** 식물을 심을 자리가 막혀 있는지 묻는 함수. margin은 건물·길에서 띄울 거리다. */
type IsOccupied = (x: number, z: number, margin: number) => boolean;

/** 건물이나 길 위라서 식물을 심으면 안 되는 곳인지 판단하는 함수를 만든다. */
function createIsOccupied(buildings: VillageBuilding[], paths: Rect[]): IsOccupied {
  return (x, z, margin) =>
    buildings.some((building) => isInsideRect(x, z, building, margin + 1)) ||
    paths.some((path) => isInsideRect(x, z, path, margin));
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

function scatterTrees(isOccupied: IsOccupied): Plant[] {
  const random = createRandom(7);
  const trees: Plant[] = [];
  for (let attempt = 0; attempt < 600 && trees.length < 18; attempt++) {
    const x = (random() * 2 - 1) * PLANT_LIMIT;
    const z = (random() * 2 - 1) * PLANT_LIMIT;
    const tooClose = trees.some((tree) => Math.hypot(tree.x - x, tree.z - z) < 4);
    // 건물 앞을 가리지 않도록 건물·길에서 넉넉히 떨어뜨린다.
    if (!isOccupied(x, z, 2) && !tooClose) {
      trees.push({ x, z, variant: random() < 0.6 ? 0 : 1 });
    }
  }
  return trees;
}

function scatterFlowers(trees: Plant[], isOccupied: IsOccupied): Plant[] {
  const random = createRandom(21);
  const flowers: Plant[] = [];
  // 꽃은 한 송이씩 흩뿌리지 않고 무리 지어 핀다.
  for (let cluster = 0; cluster < 21; cluster++) {
    const centerX = (random() * 2 - 1) * PLANT_LIMIT;
    const centerZ = (random() * 2 - 1) * PLANT_LIMIT;
    for (let i = 0; i < 10; i++) {
      const x = centerX + (random() * 2 - 1) * 1.8;
      const z = centerZ + (random() * 2 - 1) * 1.8;
      const nearTree = trees.some((tree) => Math.hypot(tree.x - x, tree.z - z) < TREE_RADIUS + 0.3);
      if (
        Math.abs(x) < PLANT_LIMIT &&
        Math.abs(z) < PLANT_LIMIT &&
        !isOccupied(x, z, 0.3) &&
        !nearTree
      ) {
        flowers.push({ x, z, variant: Math.floor(random() * 5) });
      }
    }
  }
  return flowers;
}

function scatterBushes(trees: Plant[], isOccupied: IsOccupied): Plant[] {
  const random = createRandom(99);
  const bushes: Plant[] = [];
  for (let attempt = 0; attempt < 300 && bushes.length < 24; attempt++) {
    const x = (random() * 2 - 1) * PLANT_LIMIT;
    const z = (random() * 2 - 1) * PLANT_LIMIT;
    const nearTree = trees.some((tree) => Math.hypot(tree.x - x, tree.z - z) < 1.5);
    if (!isOccupied(x, z, 0.8) && !nearTree) {
      bushes.push({ x, z, variant: 0 });
    }
  }
  return bushes;
}

/** 숲이 시작되는 거리. 캐릭터가 걸어 다니는 땅(±21) 바로 바깥부터 나무를 심는다. */
const FOREST_START = 22.5;
const FOREST_END = 52;
const FOREST_SPACING = 6.5;

/** 걸어 다닐 수 있는 땅 바깥을 둘러싼 숲. 캐릭터가 들어갈 수 없는 곳이라 충돌 판정은 없다. */
function scatterForest(): Plant[] {
  const random = createRandom(2024);
  const forest: Plant[] = [];
  for (let gx = -FOREST_END; gx <= FOREST_END; gx += FOREST_SPACING) {
    for (let gz = -FOREST_END; gz <= FOREST_END; gz += FOREST_SPACING) {
      // 격자에서 조금씩 흔들어 심어야 줄 맞춰 선 것처럼 보이지 않는다.
      const x = gx + (random() * 2 - 1) * 1.6;
      const z = gz + (random() * 2 - 1) * 1.6;
      if (Math.max(Math.abs(x), Math.abs(z)) > FOREST_START) {
        forest.push({ x, z, variant: random() < 0.5 ? 0 : 1 });
      }
    }
  }
  return forest;
}

/** 걸어 다닐 수 있는 땅 바깥의 숲. 건물과 상관없이 늘 같은 자리다. */
export const VILLAGE_FOREST = scatterForest();

/** 건물 목록에서 계산하는 마을 배치. 건물이 바뀌면 길·나무·꽃·덤불도 새로 계산해야 한다. */
export interface VillageLayout {
  paths: Rect[];
  trees: Plant[];
  flowers: Plant[];
  bushes: Plant[];
}

/** 서버에서 받은 건물 목록으로 길과 식물 배치를 계산한다. 같은 건물이면 항상 같은 배치가 나온다. */
export function createVillageLayout(buildings: VillageBuilding[]): VillageLayout {
  const paths = createPaths(buildings);
  const isOccupied = createIsOccupied(buildings, paths);
  const trees = scatterTrees(isOccupied);
  return {
    paths,
    trees,
    flowers: scatterFlowers(trees, isOccupied),
    bushes: scatterBushes(trees, isOccupied),
  };
}

/** 캐릭터(원)가 (x, z)에 서 있을 때 어느 나무 줄기와든 겹치는지 검사한다. 꽃과 덤불은 지나다닐 수 있다. */
export function collidesWithTrees(trees: Plant[], x: number, z: number): boolean {
  return trees.some((tree) => Math.hypot(x - tree.x, z - tree.z) < PLAYER_RADIUS + TREE_RADIUS);
}
