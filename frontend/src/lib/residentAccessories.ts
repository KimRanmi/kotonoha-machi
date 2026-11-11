import * as THREE from 'three';

/**
 * 주민의 직업·특징을 드러내는 소품. 캐릭터 모델(+z가 앞, 머리 중심 y=1.35, 몸통 중심 y≈0.62)에
 * 단순한 도형 몇 개를 덧붙인다. 소품을 단 모델은 `disposeAvatarModel`로 함께 정리된다.
 */
type AccessoryKind =
  | 'glasses'
  | 'strawHat'
  | 'headphones'
  | 'bandana'
  | 'apron'
  | 'shawl'
  | 'bag'
  | 'case'
  | 'beard'
  | 'robe';

export interface Accessory {
  kind: AccessoryKind;
  /** 소품 색(#RRGGBB). 없으면 소품마다 정한 기본색을 쓴다. */
  color?: string;
}

function mesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: string,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color }));
  result.position.set(...position);
  result.scale.set(...scale);
  parent.add(result);
  return result;
}

function addGlasses(model: THREE.Object3D, color: string) {
  for (const x of [-0.2, 0.2]) {
    const lens = mesh(model, new THREE.TorusGeometry(0.12, 0.02, 8, 20), color, [x, 1.37, 0.57]);
    lens.rotation.y = x * 0.3;
  }
  mesh(model, new THREE.BoxGeometry(0.12, 0.02, 0.02), color, [0, 1.38, 0.59]);
}

function addStrawHat(model: THREE.Object3D, color: string) {
  mesh(model, new THREE.CylinderGeometry(0.95, 0.95, 0.04, 28), color, [0, 1.78, 0]);
  mesh(
    model,
    new THREE.SphereGeometry(0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    color,
    [0, 1.78, 0],
  );
}

function addHeadphones(model: THREE.Object3D, color: string) {
  mesh(model, new THREE.TorusGeometry(0.66, 0.04, 8, 24, Math.PI), color, [0, 1.35, 0]);
  for (const x of [-0.66, 0.66]) {
    mesh(model, new THREE.CylinderGeometry(0.17, 0.17, 0.12, 16), color, [x, 1.35, 0]).rotation.z =
      Math.PI / 2;
  }
}

function addBandana(model: THREE.Object3D, color: string) {
  mesh(
    model,
    new THREE.CylinderGeometry(0.64, 0.64, 0.12, 24, 1, true),
    color,
    [0, 1.7, 0],
    [1, 1, 0.97],
  );
  mesh(model, new THREE.BoxGeometry(0.2, 0.12, 0.04), color, [0, 1.7, 0.62]);
}

function addApron(model: THREE.Object3D, color: string) {
  mesh(model, new THREE.BoxGeometry(0.5, 0.5, 0.04), color, [0, 0.6, 0.36]);
}

function addShawl(model: THREE.Object3D, color: string) {
  const ring = mesh(
    model,
    new THREE.TorusGeometry(0.42, 0.1, 10, 24),
    color,
    [0, 0.9, 0],
    [1, 0.9, 0.9],
  );
  ring.rotation.x = Math.PI / 2;
}

function addBag(model: THREE.Object3D, color: string) {
  mesh(model, new THREE.BoxGeometry(0.34, 0.3, 0.14), color, [0.42, 0.4, 0.1]);
  const strap = mesh(model, new THREE.BoxGeometry(0.05, 0.9, 0.04), color, [0.1, 0.7, 0.3]);
  strap.rotation.z = -0.6;
}

function addCase(model: THREE.Object3D, color: string) {
  const body = mesh(model, new THREE.BoxGeometry(0.34, 1.2, 0.14), color, [0, 0.65, -0.4]);
  body.rotation.z = 0.5;
}

function addBeard(model: THREE.Object3D, color: string) {
  mesh(model, new THREE.SphereGeometry(0.3, 16, 12), color, [0, 1.0, 0.4], [1, 1.2, 0.6]);
}

function addRobe(model: THREE.Object3D, color: string) {
  mesh(model, new THREE.CylinderGeometry(0.4, 0.55, 0.75, 20), color, [0, 0.5, 0]);
}

const DEFAULT_COLORS: Record<AccessoryKind, string> = {
  glasses: '#3d3a36',
  strawHat: '#d9b45a',
  headphones: '#4a7fd0',
  bandana: '#d9534f',
  apron: '#f6f3ee',
  shawl: '#7b4fa0',
  bag: '#8a5a3c',
  case: '#5a3b28',
  beard: '#f2f2f2',
  robe: '#2f2f35',
};

/** 모델에 소품을 붙인다. */
export function addAccessory(model: THREE.Object3D, accessory: Accessory) {
  const color = accessory.color ?? DEFAULT_COLORS[accessory.kind];
  switch (accessory.kind) {
    case 'glasses':
      addGlasses(model, color);
      break;
    case 'strawHat':
      addStrawHat(model, color);
      break;
    case 'headphones':
      addHeadphones(model, color);
      break;
    case 'bandana':
      addBandana(model, color);
      break;
    case 'apron':
      addApron(model, color);
      break;
    case 'shawl':
      addShawl(model, color);
      break;
    case 'bag':
      addBag(model, color);
      break;
    case 'case':
      addCase(model, color);
      break;
    case 'beard':
      addBeard(model, color);
      break;
    case 'robe':
      addRobe(model, color);
      break;
  }
}
