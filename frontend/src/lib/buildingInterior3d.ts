import * as THREE from 'three';
import {
  ROOM,
  ROOM_CENTER,
  type BuildingInterior,
  type FurnitureKind,
  type InteriorItem,
} from './buildingInteriors';

// 카메라가 캐릭터를 따라가며 가까이서 보므로, 벽 위쪽 끝이 화면에 보이지 않을 만큼 높게 세운다.
const WALL_HEIGHT = 12;
const WALL_THICKNESS = 0.2;
// 바닥과 벽은 방 크기보다 훨씬 길게 만든다. 방의 앞쪽·오른쪽 끝 너머까지 이어져, 화면 어디에도 빈 배경이 보이지 않는다.
const FILL_SIZE = 60;
const WOOD = '#8a5a3c';
const DARK_WOOD = '#5a3a24';
const CREAM = '#f5f0e0';
const BLACK = '#2e2e2e';
const WINDOW_COLOR = '#cfe8ff';
/** 선반·진열대에 색을 정하지 않았을 때 번갈아 놓는 물건 색. */
const GOODS_COLORS = ['#c8473d', '#f0b94a', '#4aa3a2', '#5b7fc7', '#f5f0e0'];

export interface InteriorRoom {
  group: THREE.Group;
  dispose: () => void;
}

/** 바닥, 벽 두 면, 현관 매트와 가구로 이루어진 방을 만든다. 호출한 쪽이 dispose()로 정리한다. */
export function createInteriorRoom(interior: BuildingInterior): InteriorRoom {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials = new Map<string, THREE.MeshLambertMaterial>();

  // 같은 색은 재질을 하나만 만들어 여러 부품이 나눠 쓴다.
  const paint = (color: string) => {
    let created = materials.get(color);
    if (!created) {
      created = new THREE.MeshLambertMaterial({ color });
      materials.set(color, created);
    }
    return created;
  };
  const geometry = <T extends THREE.BufferGeometry>(created: T): T => {
    geometries.push(created);
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

  // 방: 바닥과 카메라 반대편 두 벽(뒤, 왼쪽), 벽 아래 걸레받이, 현관 매트.
  // 뒤·왼쪽 구석에서 시작해 오른쪽(+x)과 앞쪽(+z)으로 FILL_SIZE만큼 뻗는다.
  const centerX = ROOM.minX + FILL_SIZE / 2;
  const centerZ = ROOM.minZ + FILL_SIZE / 2;
  place(box(FILL_SIZE, 0.2, FILL_SIZE, interior.floorColor), centerX, -0.1, centerZ, group);
  place(
    box(FILL_SIZE + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS, interior.wallColor),
    centerX - WALL_THICKNESS / 2,
    WALL_HEIGHT / 2,
    ROOM.minZ - WALL_THICKNESS / 2,
    group,
  );
  place(
    box(WALL_THICKNESS, WALL_HEIGHT, FILL_SIZE, interior.wallColor),
    ROOM.minX - WALL_THICKNESS / 2,
    WALL_HEIGHT / 2,
    centerZ,
    group,
  );
  place(box(FILL_SIZE, 0.25, 0.06, WOOD), centerX, 0.125, ROOM.minZ + 0.03, group);
  place(box(0.06, 0.25, FILL_SIZE, WOOD), ROOM.minX + 0.03, 0.125, centerZ, group);
  place(box(1.6, 0.04, 0.7, '#a8672e'), ROOM_CENTER.x, 0.02, ROOM.maxZ - 0.35, group);

  // 가구 종류별 모양. 가구 중심이 원점, 앞면이 +z인 채로 만들고 놓을 때 위치와 방향을 준다.
  const builders: Record<FurnitureKind, (g: THREE.Group, color?: string) => void> = {
    counter: (g, color = '#a9744f') => {
      place(box(3, 0.9, 0.7, color), 0, 0.45, 0, g);
      place(box(3.1, 0.08, 0.8, CREAM), 0, 0.94, 0, g);
      place(box(0.4, 0.3, 0.35, '#4a4a4a'), 1, 1.13, 0, g); // 계산기
    },
    roundTable: (g) => {
      place(cylinder(0.5, 0.5, 0.06, CREAM), 0, 0.72, 0, g);
      place(cylinder(0.06, 0.06, 0.7, DARK_WOOD), 0, 0.35, 0, g);
      place(cylinder(0.25, 0.25, 0.04, DARK_WOOD), 0, 0.02, 0, g);
      place(cylinder(0.07, 0.06, 0.1, '#ffffff'), 0.15, 0.8, 0.05, g); // 컵
    },
    lowTable: (g) => {
      place(box(1.2, 0.08, 1.2, WOOD), 0, 0.36, 0, g);
      for (const x of [-0.5, 0.5]) {
        for (const z of [-0.5, 0.5]) {
          place(box(0.1, 0.32, 0.1, DARK_WOOD), x, 0.16, z, g);
        }
      }
      place(sphere(0.11, '#3f6b4f'), 0, 0.5, 0, g); // 찻주전자
    },
    stool: (g, color = '#b8844f') => {
      place(cylinder(0.22, 0.22, 0.08, color), 0, 0.5, 0, g);
      place(cylinder(0.05, 0.05, 0.46, DARK_WOOD), 0, 0.23, 0, g);
    },
    cushion: (g, color = '#7b4a8a') => {
      place(box(0.55, 0.1, 0.55, color), 0, 0.05, 0, g);
    },
    shelf: (g, color) => {
      place(box(1.6, 2, 0.08, WOOD), 0, 1, -0.21, g); // 뒤판
      for (const x of [-0.76, 0.76]) {
        place(box(0.08, 2, 0.5, WOOD), x, 1, 0, g);
      }
      for (const y of [0.05, 0.7, 1.35, 1.97]) {
        place(box(1.6, 0.06, 0.5, WOOD), 0, y, 0, g);
      }
      // 세 칸에 물건(책·병·빵)을 다섯 개씩 세운다.
      [0.08, 0.73, 1.38].forEach((base, level) => {
        for (let i = 0; i < 5; i++) {
          const goods = color ?? GOODS_COLORS[(i + level) % GOODS_COLORS.length];
          place(box(0.22, 0.4, 0.3, goods), -0.56 + i * 0.28, base + 0.2, 0.02, g);
        }
      });
    },
    rack: (g) => {
      place(box(1.6, 1, 0.6, '#f5f5f5'), 0, 0.5, 0, g);
      GOODS_COLORS.forEach((goods, i) => {
        place(box(0.24, 0.24, 0.4, goods), -0.6 + i * 0.3, 1.12, 0, g);
      });
    },
    fridge: (g) => {
      place(box(1.6, 2, 0.6, '#e9eef2'), 0, 1, 0, g);
      place(box(1.4, 1.6, 0.04, '#bfe3f5'), 0, 1.05, 0.3, g); // 유리문
      [0.55, 1.05, 1.55].forEach((y, row) => {
        for (let i = 0; i < 6; i++) {
          const drink = GOODS_COLORS[(i + row) % GOODS_COLORS.length];
          place(box(0.14, 0.3, 0.06, drink), -0.55 + i * 0.22, y, 0.34, g);
        }
      });
    },
    showcase: (g, color = '#c98a4b') => {
      place(box(1.8, 0.5, 0.7, '#f5efe2'), 0, 0.25, 0, g);
      for (let i = 0; i < 6; i++) {
        const bread = sphere(0.13, color);
        bread.scale.y = 0.7;
        place(bread, -0.65 + i * 0.26, 0.58, 0.05, g);
      }
      // 유리 덮개 대신 네 기둥과 윗판으로 진열장 느낌만 낸다.
      for (const x of [-0.86, 0.86]) {
        for (const z of [-0.31, 0.31]) {
          place(box(0.05, 0.5, 0.05, '#ffffff'), x, 0.75, z, g);
        }
      }
      place(box(1.8, 0.05, 0.7, '#ffffff'), 0, 1.02, 0, g);
    },
    oven: (g) => {
      place(box(1.4, 1.6, 0.8, '#6b6f76'), 0, 0.8, 0, g);
      place(box(1, 0.6, 0.04, BLACK), 0, 0.7, 0.41, g);
      place(box(0.8, 0.4, 0.02, '#f2a03d'), 0, 0.7, 0.44, g); // 불빛
      place(box(1, 0.05, 0.06, '#cfcfcf'), 0, 1.1, 0.43, g);
      place(cylinder(0.12, 0.12, 1.2, '#6b6f76'), 0.4, 2.2, -0.1, g); // 연통
    },
    stove: (g) => {
      place(box(1.6, 0.9, 0.7, '#8a8f96'), 0, 0.45, 0, g);
      place(cylinder(0.28, 0.25, 0.35, '#3d3d3d'), -0.4, 1.07, 0, g); // 육수 냄비
      place(cylinder(0.25, 0.25, 0.02, '#e8c36a'), -0.4, 1.25, 0, g);
      place(cylinder(0.22, 0.22, 0.3, '#c9c9c9'), 0.4, 1.05, 0, g);
    },
    grill: (g) => {
      place(box(2, 0.9, 0.8, '#b0483a'), 0, 0.45, 0, g);
      place(box(1.8, 0.06, 0.6, BLACK), 0, 0.93, 0, g); // 철판
      for (const z of [-0.13, 0.13]) {
        for (let i = 0; i < 6; i++) {
          place(sphere(0.09, '#d99a4e'), -0.65 + i * 0.26, 1, z, g);
        }
      }
    },
    plant: (g, color = '#5fae57') => {
      place(cylinder(0.2, 0.15, 0.35, '#b5651d'), 0, 0.175, 0, g);
      const leaves = sphere(0.32, color);
      leaves.scale.y = 1.2;
      place(leaves, 0, 0.68, 0, g);
    },
    flowerBucket: (g, color = '#f4a3b8') => {
      place(cylinder(0.22, 0.18, 0.4, '#8fa3ad'), 0, 0.2, 0, g);
      place(sphere(0.2, '#4f9a4a'), 0, 0.48, 0, g);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        place(sphere(0.1, color), Math.cos(angle) * 0.14, 0.64, Math.sin(angle) * 0.14, g);
      }
    },
    // 머리맡이 -z(뒷벽) 쪽이다.
    bed: (g, color = '#8fb8d8') => {
      place(box(1.2, 0.3, 2.2, WOOD), 0, 0.15, 0, g);
      place(box(1.1, 0.2, 2.1, '#ffffff'), 0, 0.4, 0, g);
      place(box(1.12, 0.22, 1.3, color), 0, 0.41, 0.4, g); // 이불
      place(box(0.7, 0.12, 0.4, CREAM), 0, 0.56, -0.8, g); // 베개
      place(box(1.2, 0.8, 0.1, WOOD), 0, 0.4, -1.1, g);
    },
    sofa: (g, color = '#7fa37a') => {
      place(box(1.8, 0.4, 0.8, color), 0, 0.2, 0, g);
      place(box(1.8, 0.5, 0.2, color), 0, 0.65, -0.3, g);
      for (const x of [-0.8, 0.8]) {
        place(box(0.2, 0.3, 0.8, color), x, 0.55, 0, g);
      }
    },
    tv: (g) => {
      place(box(1.2, 0.5, 0.4, '#6b4a32'), 0, 0.25, 0, g);
      place(box(1, 0.6, 0.06, '#1f1f1f'), 0, 0.85, 0, g);
      place(box(0.9, 0.5, 0.02, '#4a6a8a'), 0, 0.85, 0.035, g); // 화면
    },
    // 책상이 뒤(-z, 칠판 쪽), 의자가 앞(+z)이다.
    desk: (g) => {
      place(box(0.8, 0.06, 0.5, '#d9b98a'), 0, 0.62, -0.2, g);
      for (const x of [-0.35, 0.35]) {
        for (const z of [-0.4, 0]) {
          place(box(0.05, 0.6, 0.05, '#8a8f96'), x, 0.3, z, g);
        }
      }
      place(box(0.4, 0.05, 0.4, '#b8844f'), 0, 0.38, 0.28, g);
      place(box(0.06, 0.36, 0.06, '#8a8f96'), 0, 0.18, 0.28, g);
      place(box(0.4, 0.4, 0.05, '#b8844f'), 0, 0.62, 0.47, g); // 등받이
    },
    lantern: (g, color = '#d8402f') => {
      place(cylinder(0.04, 0.04, 1.3, DARK_WOOD), 0, 0.65, 0, g);
      const paper = sphere(0.28, color);
      paper.scale.y = 1.2;
      place(paper, 0, 1.6, 0, g);
      for (const y of [1.27, 1.93]) {
        place(cylinder(0.14, 0.14, 0.06, BLACK), 0, y, 0, g);
      }
    },
    // 앞바퀴가 +x 쪽이다.
    motorcycle: (g, color = '#c8473d') => {
      for (const x of [-0.65, 0.65]) {
        const wheel = cylinder(0.32, 0.32, 0.14, BLACK);
        wheel.rotation.x = Math.PI / 2; // 바퀴를 세운다
        place(wheel, x, 0.32, 0, g);
      }
      place(box(1, 0.3, 0.3, color), 0, 0.62, 0, g);
      place(box(0.5, 0.22, 0.34, color), 0.15, 0.86, 0, g); // 연료통
      place(box(0.5, 0.1, 0.3, BLACK), -0.35, 0.82, 0, g); // 안장
      place(box(0.06, 0.5, 0.06, '#9a9a9a'), 0.6, 0.9, 0, g);
      place(box(0.06, 0.06, 0.6, '#9a9a9a'), 0.6, 1.15, 0, g); // 핸들
      place(sphere(0.1, '#fff3a8'), 0.76, 0.95, 0, g); // 전조등
    },
    tires: (g) => {
      for (const y of [0.1, 0.3, 0.5]) {
        place(cylinder(0.3, 0.3, 0.18, BLACK), 0, y, 0, g);
      }
    },
    statue: (g) => {
      place(box(1.2, 0.5, 1, '#8a6a4a'), 0, 0.25, 0, g);
      place(cylinder(0.45, 0.5, 0.15, '#e0b94a'), 0, 0.575, 0, g); // 연꽃 받침
      const body = sphere(0.38, '#d4a93a');
      body.scale.set(1, 1.1, 0.9);
      place(body, 0, 1, 0, g);
      place(sphere(0.22, '#d4a93a'), 0, 1.52, 0, g);
      const halo = cylinder(0.42, 0.42, 0.04, '#f0d77a');
      halo.rotation.x = Math.PI / 2; // 머리 뒤에 세운 둥근 광배
      place(halo, 0, 1.52, -0.22, g);
    },
    offeringBox: (g) => {
      place(box(1.2, 0.6, 0.6, '#6b4a32'), 0, 0.3, 0, g);
      for (const x of [-0.36, -0.12, 0.12, 0.36]) {
        place(box(0.05, 0.04, 0.6, '#3d2a1c'), x, 0.62, 0, g);
      }
    },
    incense: (g) => {
      place(cylinder(0.08, 0.15, 0.5, '#6f7378'), 0, 0.25, 0, g);
      place(cylinder(0.25, 0.18, 0.3, '#6f7378'), 0, 0.65, 0, g);
      place(cylinder(0.22, 0.22, 0.02, '#d9d4c8'), 0, 0.81, 0, g); // 재
      for (const x of [-0.07, 0, 0.07]) {
        place(box(0.02, 0.3, 0.02, '#c8473d'), x, 0.95, 0, g);
      }
    },
    barrel: (g) => {
      place(cylinder(0.32, 0.32, 0.7, '#c9a66b'), 0, 0.35, 0, g);
      for (const y of [0.15, 0.55]) {
        place(cylinder(0.335, 0.335, 0.06, '#3d2a1c'), 0, y, 0, g);
      }
    },
    rug: (g, color = '#d9776b') => {
      place(box(3, 0.02, 2, color), 0, 0.011, 0, g);
    },
    // 아래 넷은 벽걸이다. 벽면이 원점(z = 0)이고 방 안쪽(+z)으로 조금 튀어나온다.
    blackboard: (g) => {
      place(box(3.2, 1.4, 0.08, WOOD), 0, 1.7, 0, g);
      place(box(3, 1.2, 0.1, '#2f5d4a'), 0, 1.7, 0, g);
      place(box(1.2, 0.04, 0.02, CREAM), -0.6, 1.9, 0.05, g); // 분필 글씨
      place(box(0.8, 0.04, 0.02, CREAM), -0.8, 1.6, 0.05, g);
    },
    window: (g) => {
      place(box(1.4, 1.4, 0.08, '#fff4e0'), 0, 1.8, 0, g);
      place(box(1.2, 1.2, 0.1, WINDOW_COLOR), 0, 1.8, 0, g);
      place(box(0.06, 1.2, 0.12, '#fff4e0'), 0, 1.8, 0, g);
      place(box(1.2, 0.06, 0.12, '#fff4e0'), 0, 1.8, 0, g);
    },
    menuBoard: (g, color = '#4a2f1e') => {
      place(box(1.4, 0.9, 0.08, color), 0, 2.1, 0, g);
      for (const y of [2.35, 2.1, 1.85]) {
        place(box(0.9, 0.06, 0.02, CREAM), 0, y, 0.04, g);
      }
    },
    scroll: (g) => {
      place(box(0.6, 1.5, 0.04, '#f5efdc'), 0, 1.7, 0, g);
      for (const y of [2.45, 0.95]) {
        place(box(0.7, 0.06, 0.06, DARK_WOOD), 0, y, 0, g);
      }
      place(box(0.12, 0.8, 0.02, BLACK), 0, 1.75, 0.02, g); // 붓글씨
    },
  };

  const addItem = (item: InteriorItem) => {
    const furniture = new THREE.Group();
    builders[item.kind](furniture, item.color);
    furniture.rotation.y = ((item.turns ?? 0) * Math.PI) / 2;
    place(furniture, item.x, 0, item.z, group);
  };
  interior.items.forEach(addItem);

  return {
    group,
    dispose: () => {
      geometries.forEach((created) => created.dispose());
      materials.forEach((created) => created.dispose());
    },
  };
}
