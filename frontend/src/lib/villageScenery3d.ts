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
const WINDOW_COLOR = '#cfe8ff';

// 간판: 나무 테두리 + 글씨를 그린 캔버스 판. 글씨는 3D 글자가 아니라 캔버스에 그린 그림을 판에 붙인다.
const SIGN_STYLES: Record<string, { background: string; text: string; accent: string }> = {
  cafe: { background: '#4a2f1e', text: '#fbf1dc', accent: '#e0a95a' },
  shop: { background: '#1f3d6b', text: '#ffffff', accent: '#f2c230' },
  home: { background: '#7a3f3a', text: '#fff4e0', accent: '#f0c987' },
};
const SIGN_WIDTH = 3.2;
const SIGN_HEIGHT = 0.9;
const SIGN_FONT = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", "Apple SD Gothic Neo", sans-serif';

/** 건물 처마에 달린 간판. 마우스로 가리키거나 누를 수 있게 호출한 쪽이 object를 raycast한다. */
export interface VillageSign {
  building: VillageBuilding;
  object: THREE.Object3D;
  setHighlight: (on: boolean) => void;
}

export interface VillageWorld {
  group: THREE.Group;
  signs: VillageSign[];
  dispose: () => void;
}

/** 건물, 길, 나무, 꽃, 덤불로 이루어진 마을 풍경을 만든다. 호출한 쪽이 dispose()로 정리한다. */
export function createVillageWorld(): VillageWorld {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const signs: VillageSign[] = [];

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
  const place = <T extends THREE.Object3D>(
    mesh: T,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D,
  ): T => {
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

  // 건물: 벽 상자 + 뾰족 지붕 + 문. 창문과 장식은 건물별 함수가 카메라가 보는 +z, +x 벽에 단다.
  const doorMaterial = material('#6b4a32');
  const doorGeometry = geometry(new THREE.BoxGeometry(1.1, 1.8, 0.1));
  const roofGeometry = geometry(new THREE.ConeGeometry(1, ROOF_HEIGHT, 4));

  // 건물마다 컨셉에 맞는 장식을 단다. 좌표는 건물 중심 기준이고 문은 +z 벽 가운데에 있다.
  // 장식은 눈으로만 보이고 충돌은 없다(캐릭터가 지나다닐 수 있다).
  const paints = new Map<string, THREE.MeshLambertMaterial>();
  const paint = (color: string) => {
    let created = paints.get(color);
    if (!created) {
      created = material(color);
      paints.set(color, created);
    }
    return created;
  };
  const box = (width: number, height: number, depth: number, color: string) =>
    new THREE.Mesh(geometry(new THREE.BoxGeometry(width, height, depth)), paint(color));
  const cylinder = (radiusTop: number, radiusBottom: number, height: number, color: string) =>
    new THREE.Mesh(
      geometry(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 12)),
      paint(color),
    );
  const sphere = (radius: number, color: string) =>
    new THREE.Mesh(geometry(new THREE.SphereGeometry(radius, 8, 6)), paint(color));

  /** 문 앞에 비스듬히 드리우는 줄무늬 차양. */
  const addAwning = (house: THREE.Group, building: VillageBuilding, colors: [string, string]) => {
    const stripes = 5;
    const stripeWidth = building.width / stripes;
    for (let i = 0; i < stripes; i++) {
      const stripe = box(stripeWidth, 0.08, 1.1, colors[i % 2]);
      stripe.rotation.x = 0.35; // 앞쪽이 아래로 처지게
      const x = -building.width / 2 + stripeWidth * (i + 0.5);
      place(stripe, x, 2.2, building.depth / 2 + 0.5, house);
    }
  };

  /** 테두리가 있는 큰 창문 하나. */
  const addWindow = (
    house: THREE.Group,
    building: VillageBuilding,
    x: number,
    y: number,
    size: [number, number],
    frameColor: string,
  ) => {
    place(
      box(size[0] + 0.2, size[1] + 0.2, 0.08, frameColor),
      x,
      y,
      building.depth / 2 + 0.02,
      house,
    );
    place(box(size[0], size[1], 0.1, WINDOW_COLOR), x, y, building.depth / 2 + 0.03, house);
  };

  const addCafeTable = (house: THREE.Group, x: number, z: number, parasolColor: string) => {
    place(cylinder(0.45, 0.45, 0.06, '#f2e6d0'), x, 0.75, z, house);
    place(cylinder(0.05, 0.05, 0.75, '#6b4a32'), x, 0.375, z, house);
    place(cylinder(0.04, 0.04, 2, '#6b4a32'), x, 1, z, house); // 파라솔 기둥
    place(
      new THREE.Mesh(geometry(new THREE.ConeGeometry(1.1, 0.45, 8)), paint(parasolColor)),
      x,
      2.15,
      z,
      house,
    );
    for (const side of [-1, 1]) {
      const chairX = x + side * 0.8;
      place(box(0.4, 0.06, 0.4, '#b8844f'), chairX, 0.42, z, house); // 앉는 판
      place(box(0.1, 0.4, 0.1, '#8a5a3c'), chairX, 0.2, z, house); // 다리
      place(box(0.06, 0.4, 0.4, '#b8844f'), chairX + side * 0.2, 0.65, z, house); // 등받이
    }
  };

  const addCafe = (house: THREE.Group, building: VillageBuilding) => {
    const front = building.depth / 2;
    for (const side of [-1, 1]) {
      addWindow(house, building, side * 1.55, 1.4, [1.2, 1.2], '#fff4e0');
    }
    addAwning(house, building, ['#c8473d', '#fbf1dc']);
    // 굴뚝
    place(
      box(0.5, 1.2, 0.5, '#8c4a3a'),
      building.width * 0.25,
      building.height + 1.1,
      -building.depth * 0.2,
      house,
    );
    // 커피잔 간판: 기둥 위에 커다란 컵을 올린다.
    const signX = building.width / 2 + 0.6;
    place(cylinder(0.06, 0.06, 2.8, '#6b4a32'), signX, 1.4, front + 0.3, house);
    place(cylinder(0.45, 0.3, 0.6, '#ffffff'), signX, 3.1, front + 0.3, house);
    place(cylinder(0.38, 0.38, 0.04, '#5a3a24'), signX, 3.39, front + 0.3, house); // 커피
    const handle = new THREE.Mesh(
      geometry(new THREE.TorusGeometry(0.17, 0.05, 6, 10)),
      paint('#ffffff'),
    );
    place(handle, signX + 0.5, 3.1, front + 0.3, house);
    // 메뉴 칠판
    const board = new THREE.Group();
    board.add(box(0.8, 1, 0.06, '#8a5a3c'));
    for (const y of [0.25, 0, -0.25]) {
      place(box(0.45, 0.05, 0.02, '#f5f0e0'), 0, y, 0.04, board);
    }
    board.rotation.x = -0.15;
    place(board, 1.2, 0.5, front + 0.9, house);
    // 야외 테이블
    addCafeTable(house, -2.6, front + 1, '#c8473d');
    addCafeTable(house, 3, front + 0.5, '#f0b94a');
  };

  const addShop = (house: THREE.Group, building: VillageBuilding) => {
    const front = building.depth / 2;
    const itemColors = ['#e4572e', '#f3c13a', '#4aa3a2', '#9b5de5'];
    for (const side of [-1, 1]) {
      addWindow(house, building, side * 1.6, 1.4, [1.5, 1.2], '#ffffff');
      // 창 아래 진열대와 상품
      place(box(1.5, 0.06, 0.4, '#8a5a3c'), side * 1.6, 0.8, front + 0.15, house);
      itemColors.forEach((color, i) => {
        place(
          box(0.25, 0.25, 0.25, color),
          side * 1.6 - 0.55 + i * 0.37,
          0.96,
          front + 0.15,
          house,
        );
      });
    }
    addAwning(house, building, ['#3d6fb5', '#ffffff']);
    // 과일 상자 두 개와 통
    for (const [x, fruit] of [
      [-2.2, '#d9342b'],
      [-1.4, '#f5921e'],
    ] as const) {
      place(box(0.7, 0.45, 0.55, '#b8844f'), x, 0.225, front + 0.8, house);
      for (const offset of [-0.2, 0, 0.2]) {
        place(sphere(0.13, fruit), x + offset, 0.52, front + 0.8, house);
      }
    }
    place(cylinder(0.33, 0.33, 0.75, '#7a5230'), 2.2, 0.375, front + 0.8, house);
    for (const y of [0.2, 0.55]) {
      place(cylinder(0.345, 0.345, 0.06, '#3a2a1c'), 2.2, y, front + 0.8, house);
    }
    // 벽에서 튀어나온 팔에 매단 금화 간판
    const side = building.width / 2;
    place(box(1.4, 0.08, 0.08, '#3a2a1c'), side + 0.6, 2.3, front - 0.6, house);
    place(box(0.04, 0.35, 0.04, '#3a2a1c'), side + 0.3, 2.1, front - 0.6, house);
    place(box(0.04, 0.35, 0.04, '#3a2a1c'), side + 1.2, 2.1, front - 0.6, house);
    place(box(1.1, 0.6, 0.08, '#b8844f'), side + 0.75, 1.75, front - 0.6, house);
    const coin = cylinder(0.2, 0.2, 0.05, '#f2c230');
    coin.rotation.x = Math.PI / 2;
    place(coin, side + 0.75, 1.75, front - 0.54, house);
  };

  const addHome = (house: THREE.Group, building: VillageBuilding) => {
    const front = building.depth / 2;
    // 창문과 그 아래 화단
    for (const side of [-1, 1]) {
      addWindow(house, building, side * 1.3, 1.4, [0.8, 0.8], '#fff4e0');
      place(box(1, 0.25, 0.3, '#8a5a3c'), side * 1.3, 0.85, front + 0.2, house);
      for (const offset of [-0.3, 0, 0.3]) {
        place(
          sphere(0.1, FLOWER_COLORS[(offset > 0 ? 1 : 0) + (side > 0 ? 2 : 0)]),
          side * 1.3 + offset,
          1.05,
          front + 0.2,
          house,
        );
      }
    }
    place(box(0.1, 0.8, 0.8, WINDOW_COLOR), building.width / 2 + 0.03, 1.4, 0, house);
    // 현관 계단
    place(box(1.8, 0.12, 0.7, '#d8cfc0'), 0, 0.06, front + 0.45, house);
    // 굴뚝
    place(
      box(0.5, 1.3, 0.5, '#8c4a3a'),
      building.width * 0.25,
      building.height + 1.1,
      -building.depth * 0.2,
      house,
    );
    // 우편함
    place(cylinder(0.04, 0.04, 0.9, '#6b4a32'), 1.2, 0.45, front + 1.6, house);
    place(box(0.35, 0.25, 0.5, '#d9534f'), 1.2, 1, front + 1.6, house);
  };

  const createSignTexture = (building: VillageBuilding) => {
    const style = SIGN_STYLES[building.id];
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 144;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = style.background;
      context.fillRect(0, 0, 512, 144);
      context.strokeStyle = style.accent;
      context.lineWidth = 6;
      context.strokeRect(10, 10, 492, 124);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = style.text;
      context.font = `bold ${building.locked ? 68 : 78}px ${SIGN_FONT}`;
      context.fillText(building.label, 256, building.locked ? 58 : 74);
      if (building.locked) {
        context.fillStyle = style.accent;
        context.font = `bold 28px ${SIGN_FONT}`;
        context.fillText('準備中', 256, 112);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    return texture;
  };

  const createSign = (building: VillageBuilding): VillageSign => {
    const object = new THREE.Group();
    const bottom = building.height + 0.05;
    const z = building.depth / 2 + 0.5;
    place(
      box(SIGN_WIDTH + 0.2, SIGN_HEIGHT + 0.2, 0.12, '#6b4a32'),
      0,
      bottom + SIGN_HEIGHT / 2,
      z,
      object,
    );
    const faceMaterial = new THREE.MeshBasicMaterial({ map: createSignTexture(building) });
    materials.push(faceMaterial);
    const face = new THREE.Mesh(
      geometry(new THREE.PlaneGeometry(SIGN_WIDTH, SIGN_HEIGHT)),
      faceMaterial,
    );
    place(face, 0, bottom + SIGN_HEIGHT / 2, z + 0.065, object);
    return {
      building,
      object,
      setHighlight: (on) => faceMaterial.color.setScalar(on ? 1.3 : 1),
    };
  };

  const DECORATORS: Partial<
    Record<string, (house: THREE.Group, building: VillageBuilding) => void>
  > = {
    cafe: addCafe,
    shop: addShop,
    home: addHome,
  };

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

    place(new THREE.Mesh(doorGeometry, doorMaterial), 0, 0.9, building.depth / 2 + 0.03, house);
    DECORATORS[building.id]?.(house, building);
    const sign = createSign(building);
    house.add(sign.object);
    signs.push(sign);
    return house;
  }

  for (const building of VILLAGE_BUILDINGS) {
    group.add(createBuilding(building));
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
    signs,
    dispose: () => {
      textures.forEach((created) => created.dispose());
      instancedMeshes.forEach((instanced) => instanced.dispose());
      geometries.forEach((created) => created.dispose());
      materials.forEach((created) => created.dispose());
    },
  };
}
