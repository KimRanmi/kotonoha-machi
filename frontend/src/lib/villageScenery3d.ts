import * as THREE from 'three';
import { ROOF_HEIGHT, VILLAGE_BUILDINGS, type VillageBuilding } from './villageBuildings';
import {
  TREE_RADIUS,
  VILLAGE_BUSHES,
  VILLAGE_FLOWERS,
  VILLAGE_FOREST,
  VILLAGE_PATHS,
  VILLAGE_TREES,
} from './villageScenery';

const FLOWER_COLORS = ['#f4a3b8', '#fff3a8', '#ffffff', '#b9a4f0', '#f7b267'];

export interface VillageWorld {
  group: THREE.Group;
  dispose: () => void;
}

/** 건물, 길, 나무, 꽃, 덤불로 이루어진 마을 풍경을 만든다. 호출한 쪽이 dispose()로 정리한다. */
export function createVillageWorld(): VillageWorld {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // 같은 모양/색은 하나씩만 만들어 여러 물체가 나눠 쓴다(정리할 때도 한 번만 지우면 된다).
  const geometry = <T extends THREE.BufferGeometry>(created: T): T => {
    geometries.push(created);
    return created;
  };
  const material = (color: string, flatShading = false): THREE.MeshLambertMaterial => {
    const created = new THREE.MeshLambertMaterial({ color, flatShading });
    materials.push(created);
    return created;
  };
  const place = (mesh: THREE.Mesh, x: number, y: number, z: number, parent: THREE.Object3D) => {
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // 길
  const pathMaterial = material('#e8d5a8');
  for (const path of VILLAGE_PATHS) {
    const mesh = new THREE.Mesh(
      geometry(new THREE.BoxGeometry(path.width, 0.04, path.depth)),
      pathMaterial,
    );
    place(mesh, path.x, 0.02, path.z, group);
  }

  // 건물: 벽 상자 + 뾰족 지붕 + 문 + 창문. 문과 창문은 카메라가 보는 +z, +x 벽에 단다.
  const doorMaterial = material('#6b4a32');
  const windowMaterial = material('#cfe8ff');
  const windowGeometry = geometry(new THREE.BoxGeometry(0.8, 0.8, 0.1));
  const doorGeometry = geometry(new THREE.BoxGeometry(1.1, 1.8, 0.1));
  const roofGeometry = geometry(new THREE.ConeGeometry(1, ROOF_HEIGHT, 4));
  for (const building of VILLAGE_BUILDINGS) {
    group.add(createBuilding(building));
  }

  function createBuilding(building: VillageBuilding): THREE.Group {
    const house = new THREE.Group();
    house.position.set(building.x, 0, building.z);

    const wallMaterial = material(building.color);
    const roofMaterial = material(
      `#${new THREE.Color(building.color).multiplyScalar(0.6).getHexString()}`,
    );
    place(
      new THREE.Mesh(
        geometry(new THREE.BoxGeometry(building.width, building.height, building.depth)),
        wallMaterial,
      ),
      0,
      building.height / 2,
      0,
      house,
    );

    // 원뿔(꼭짓점 4개)을 45도 돌려 사각 지붕 모양으로 맞춘다. 반지름 = 반변 × √2.
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(
      (building.width / 2 + 0.4) * Math.SQRT2,
      1,
      (building.depth / 2 + 0.4) * Math.SQRT2,
    );
    place(roof, 0, building.height + ROOF_HEIGHT / 2, 0, house);

    const front = building.depth / 2 + 0.03;
    const side = building.width / 2 + 0.03;
    place(new THREE.Mesh(doorGeometry, doorMaterial), 0, 0.9, front, house);
    for (const offset of [-building.width * 0.3, building.width * 0.3]) {
      place(new THREE.Mesh(windowGeometry, windowMaterial), offset, 1.5, front, house);
    }
    const sideWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    sideWindow.rotation.y = Math.PI / 2;
    place(sideWindow, side, 1.5, 0, house);
    return house;
  }

  // 나무: 줄기 + 잎. variant 0은 둥근 나무, 1은 소나무.
  const trunkGeometry = geometry(new THREE.CylinderGeometry(0.22, 0.3, 1.2, 8));
  const trunkMaterial = material('#8a5a3c');
  const roundLeafGeometry = geometry(new THREE.IcosahedronGeometry(1.3, 0));
  const roundLeafMaterial = material('#5fae5a', true);
  const pineLowGeometry = geometry(new THREE.ConeGeometry(1.2, 1.8, 7));
  const pineHighGeometry = geometry(new THREE.ConeGeometry(0.9, 1.6, 7));
  const pineMaterial = material('#3f8f55', true);
  for (const tree of VILLAGE_TREES) {
    const holder = new THREE.Group();
    holder.position.set(tree.x, 0, tree.z);
    holder.rotation.y = (tree.x * 7 + tree.z * 3) % (Math.PI * 2); // 나무마다 조금씩 다른 방향
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.scale.setScalar(TREE_RADIUS / 0.3);
    place(trunk, 0, 0.6, 0, holder);
    if (tree.variant === 0) {
      place(new THREE.Mesh(roundLeafGeometry, roundLeafMaterial), 0, 2.3, 0, holder);
    } else {
      place(new THREE.Mesh(pineLowGeometry, pineMaterial), 0, 2, 0, holder);
      place(new THREE.Mesh(pineHighGeometry, pineMaterial), 0, 3.1, 0, holder);
    }
    group.add(holder);
  }

  // 숲: 수백 그루라서 나무를 하나씩 만들지 않고, 같은 부품(줄기·잎)을 한 번에 여러 개 그리는
  // InstancedMesh로 만든다. 위에서 만든 나무 모양·재질을 그대로 나눠 쓴다.
  const roundTrees = VILLAGE_FOREST.filter((tree) => tree.variant === 0);
  const pineTrees = VILLAGE_FOREST.filter((tree) => tree.variant === 1);
  const instancedMeshes: THREE.InstancedMesh[] = [];
  const matrix = new THREE.Matrix4();
  const addInstances = (
    part: THREE.BufferGeometry,
    partMaterial: THREE.Material,
    trees: typeof VILLAGE_FOREST,
    height: number,
    scale: number,
  ) => {
    const instanced = new THREE.InstancedMesh(part, partMaterial, trees.length);
    trees.forEach((tree, index) => {
      matrix.makeScale(scale, scale, scale).setPosition(tree.x, height * scale, tree.z);
      instanced.setMatrixAt(index, matrix);
    });
    instancedMeshes.push(instanced);
    group.add(instanced);
  };
  addInstances(trunkGeometry, trunkMaterial, VILLAGE_FOREST, 0.6, 1.4);
  addInstances(roundLeafGeometry, roundLeafMaterial, roundTrees, 2.3, 1.4);
  addInstances(pineLowGeometry, pineMaterial, pineTrees, 2, 1.4);
  addInstances(pineHighGeometry, pineMaterial, pineTrees, 3.1, 1.4);

  // 덤불
  const bushGeometry = geometry(new THREE.IcosahedronGeometry(0.6, 0));
  const bushMaterial = material('#6dbb62', true);
  for (const bush of VILLAGE_BUSHES) {
    const mesh = new THREE.Mesh(bushGeometry, bushMaterial);
    mesh.scale.set(1.2, 0.8, 1);
    place(mesh, bush.x, 0.4, bush.z, group);
  }

  // 꽃: 가는 줄기 + 색깔 있는 꽃송이
  const stemGeometry = geometry(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4));
  const stemMaterial = material('#4f9a4a');
  const blossomGeometry = geometry(new THREE.SphereGeometry(0.12, 8, 6));
  const blossomMaterials = FLOWER_COLORS.map((color) => material(color));
  for (const flower of VILLAGE_FLOWERS) {
    place(new THREE.Mesh(stemGeometry, stemMaterial), flower.x, 0.18, flower.z, group);
    place(
      new THREE.Mesh(blossomGeometry, blossomMaterials[flower.variant % blossomMaterials.length]),
      flower.x,
      0.4,
      flower.z,
      group,
    );
  }

  return {
    group,
    dispose: () => {
      instancedMeshes.forEach((instanced) => instanced.dispose());
      geometries.forEach((created) => created.dispose());
      materials.forEach((created) => created.dispose());
    },
  };
}
