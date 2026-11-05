import * as THREE from 'three';
import type { Avatar } from '../api/user';
import { HAIR_COLOR_HEX, SHOES_COLOR_HEX, SKIN_COLOR_HEX } from './avatarPreview';

/**
 * 캐릭터 꾸미기 5축 값으로 동물의 숲 같은 둥근 3D 캐릭터를 만든다(구/원통을 납작하게 눌러 조합).
 * 큰 머리에 작은 몸, 점 눈과 볼터치가 특징이다. 프로필 미리보기와 마을이 같은 함수를 쓰므로
 * 두 화면의 캐릭터가 항상 똑같다. 캐릭터는 +z 방향을 바라보고, 발바닥이 y=0, 키는 약 1.95다.
 */

const PANTS_COLOR = '3b4252';
const HEAD_Y = 1.35;
const HEAD_RADIUS = 0.62;
const HEAD_SCALE: [number, number, number] = [1, 0.92, 0.95];

interface ClothesLook {
  /** 상의 색(소매 포함). */
  top: string;
  /** 하의 색. null이면 피부(드레스처럼 맨다리)로 둔다. */
  pants: string | null;
}

const CLOTHES_LOOK: Record<Avatar['clothesStyle'], ClothesLook> = {
  PLAIN: { top: '6aa5d8', pants: PANTS_COLOR },
  HOODIE: { top: '8d8d99', pants: PANTS_COLOR },
  JACKET: { top: '4f6b45', pants: PANTS_COLOR },
  COAT: { top: 'a0522d', pants: '5a3a22' },
  SUIT: { top: '2b2f3a', pants: '2b2f3a' },
  DRESS: { top: 'd94f7a', pants: null },
  OVERALLS: { top: 'f2f2f2', pants: '3b6fb6' },
  STRIPES: { top: 'f2f2f2', pants: PANTS_COLOR },
  CHECKER: { top: 'c0392b', pants: PANTS_COLOR },
  TIE: { top: 'f2f2f2', pants: PANTS_COLOR },
};

type Vec3 = [number, number, number];

function hex(value: string): THREE.Color {
  return new THREE.Color(`#${value}`);
}

function material(color: string | THREE.Color, doubleSided = false): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color: typeof color === 'string' ? hex(color) : color,
    side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
  });
}

/** 줄무늬/체크 무늬를 그린 작은 캔버스 텍스처(몸통을 한 바퀴 감싼다). */
function patternTexture(kind: 'STRIPES' | 'CHECKER'): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = kind === 'STRIPES' ? '#f2f2f2' : '#c0392b';
    context.fillRect(0, 0, size, size);
    context.fillStyle = kind === 'STRIPES' ? '#2e4a8e' : '#7a1f17';
    if (kind === 'STRIPES') {
      for (let y = 0; y < size; y += 16) {
        context.fillRect(0, y, size, 8);
      }
    } else {
      for (let y = 0; y < size; y += 16) {
        for (let x = 0; x < size; x += 16) {
          if ((x / 16 + y / 16) % 2 === 1) {
            context.fillRect(x, y, 16, 16);
          }
        }
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function place(mesh: THREE.Mesh, parent: THREE.Object3D, position: Vec3, scale?: Vec3): THREE.Mesh {
  mesh.position.set(...position);
  if (scale) {
    mesh.scale.set(...scale);
  }
  parent.add(mesh);
  return mesh;
}

/** 반지름 `radius`인 구를 `scale`만큼 눌러 타원체로 놓는다. */
function addEllipsoid(
  parent: THREE.Object3D,
  radius: number,
  color: string | THREE.Color | THREE.Material,
  position: Vec3,
  scale: Vec3 = [1, 1, 1],
): THREE.Mesh {
  const mat = color instanceof THREE.Material ? color : material(color);
  return place(
    new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), mat),
    parent,
    position,
    scale,
  );
}

function addBox(
  parent: THREE.Object3D,
  size: Vec3,
  color: string | THREE.Color,
  position: Vec3,
): THREE.Mesh {
  return place(new THREE.Mesh(new THREE.BoxGeometry(...size), material(color)), parent, position);
}

/** 머리 윗부분만 덮는 모자 모양 머리카락. 앞머리선은 올리고 뒤는 내려 머리를 감싼다. */
function addHairCap(parent: THREE.Object3D, color: THREE.Color, coverage = 1.55, tilt = -0.4) {
  const geometry = new THREE.SphereGeometry(
    HEAD_RADIUS + 0.04,
    24,
    14,
    0,
    Math.PI * 2,
    0,
    coverage,
  );
  const cap = place(new THREE.Mesh(geometry, material(color, true)), parent, [0, HEAD_Y, -0.01]);
  cap.scale.set(...HEAD_SCALE);
  cap.rotation.x = tilt;
}

/** 머리 표면 위(윗면 기준 극각 `polar`, 방위각 `azimuth`)의 한 점. 곱슬/모히칸 장식 위치에 쓴다. */
function headSurface(polar: number, azimuth: number, push = 0.04): Vec3 {
  const radius = HEAD_RADIUS + push;
  return [
    radius * Math.sin(polar) * Math.sin(azimuth) * HEAD_SCALE[0],
    HEAD_Y + radius * Math.cos(polar) * HEAD_SCALE[1],
    radius * Math.sin(polar) * Math.cos(azimuth) * HEAD_SCALE[2],
  ];
}

/** 헤어스타일 8종. 모두 둥근 덩어리로 만든다. */
function addHair(parent: THREE.Object3D, style: Avatar['hairStyle'], color: THREE.Color) {
  switch (style) {
    case 'SHORT':
      addHairCap(parent, color);
      break;
    case 'BOB':
      addHairCap(parent, color, 1.7, -0.45);
      addEllipsoid(parent, 0.62, color, [0, 1.12, -0.2], [1.02, 0.62, 0.62]);
      break;
    case 'PONYTAIL':
      addHairCap(parent, color);
      addEllipsoid(parent, 0.16, color, [0, 1.52, -0.6], [1, 1, 1]);
      addEllipsoid(parent, 0.17, color, [0, 1.2, -0.68], [1, 2.1, 1]);
      break;
    case 'AFRO':
      addEllipsoid(parent, 0.76, color, [0, 1.6, -0.25], [1, 0.85, 0.95]);
      break;
    case 'BRAIDS':
      addHairCap(parent, color, 1.6);
      for (const x of [-0.58, 0.58]) {
        for (const [y, r] of [
          [1.2, 0.11],
          [0.98, 0.1],
          [0.78, 0.09],
        ] as [number, number][]) {
          addEllipsoid(parent, r, color, [x, y, -0.05], [1, 1.25, 1]);
        }
      }
      break;
    case 'CURLY':
      addHairCap(parent, color, 1.3, -0.3);
      for (const [polar, count] of [
        [0, 1],
        [0.65, 6],
        [1.1, 8],
        [1.45, 8],
      ] as [number, number][]) {
        for (let i = 0; i < count; i += 1) {
          const azimuth = (i / count) * Math.PI * 2 + 0.2;
          const position = headSurface(polar, azimuth);
          // 얼굴(앞쪽 아래)을 가리지 않게 앞쪽은 건너뛴다.
          if (polar > 0.9 && position[2] > 0.25) {
            continue;
          }
          addEllipsoid(parent, 0.19, color, position);
        }
      }
      break;
    case 'BUNS':
      addHairCap(parent, color);
      addEllipsoid(parent, 0.21, color, [-0.4, 1.9, -0.08]);
      addEllipsoid(parent, 0.21, color, [0.4, 1.9, -0.08]);
      break;
    case 'MOHAWK':
      for (const polar of [0.05, 0.25, 0.45, 0.65, 0.9]) {
        const position = headSurface(polar, 0, 0.02);
        addEllipsoid(
          parent,
          0.14,
          color,
          [0, position[1] + 0.03, position[2] - 0.04],
          [0.8, 1.5, 1],
        );
      }
      for (const polar of [0.35, 0.65, 0.95]) {
        const position = headSurface(polar, Math.PI, 0.02);
        addEllipsoid(parent, 0.14, color, [0, position[1] + 0.03, position[2]], [0.8, 1.5, 1]);
      }
      break;
  }
}

/** 몸통(작고 둥근 알 모양)과 팔, 옷 종류별 소품. */
function addBodyAndClothes(
  parent: THREE.Object3D,
  style: Avatar['clothesStyle'],
  skin: THREE.Color,
  look: ClothesLook,
) {
  const topColor = hex(look.top);
  const patterned = style === 'STRIPES' || style === 'CHECKER';
  const topMaterial: THREE.Material = patterned
    ? new THREE.MeshLambertMaterial({ map: patternTexture(style) })
    : material(topColor);
  const sleeveColor = patterned ? (style === 'STRIPES' ? '2e4a8e' : '7a1f17') : topColor;

  addEllipsoid(parent, 1, topMaterial, [0, 0.62, 0], [0.4, 0.42, 0.36]);

  for (const side of [-1, 1]) {
    const sleeve = addEllipsoid(parent, 0.12, sleeveColor, [side * 0.43, 0.68, 0], [1, 1.5, 1]);
    sleeve.rotation.z = side * 0.35;
    addEllipsoid(parent, 0.09, skin, [side * 0.5, 0.5, 0.02]);
  }

  switch (style) {
    case 'HOODIE':
      addEllipsoid(parent, 0.24, topColor, [0, 0.95, -0.2], [1.3, 0.7, 0.8]);
      break;
    case 'JACKET': {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 20), material('3d5236'));
      collar.rotation.x = Math.PI / 2;
      place(collar, parent, [0, 0.98, 0]);
      addBox(parent, [0.03, 0.5, 0.02], 'd8d2c0', [0, 0.62, 0.36]);
      break;
    }
    case 'COAT': {
      const skirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.46, 0.34, 20),
        material(topColor),
      );
      place(skirt, parent, [0, 0.3, 0]);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 20), material('7a3b1d'));
      collar.rotation.x = Math.PI / 2;
      place(collar, parent, [0, 0.98, 0]);
      break;
    }
    case 'SUIT':
      addBox(parent, [0.16, 0.4, 0.02], 'f2f2f2', [0, 0.74, 0.35]);
      addBox(parent, [0.06, 0.3, 0.02], 'c0392b', [0, 0.7, 0.365]);
      break;
    case 'TIE':
      addBox(parent, [0.07, 0.32, 0.02], '2e4a8e', [0, 0.7, 0.36]);
      break;
    case 'DRESS': {
      const skirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.52, 0.34, 20),
        material(topColor),
      );
      place(skirt, parent, [0, 0.3, 0]);
      break;
    }
    case 'OVERALLS': {
      const pants = look.pants ?? PANTS_COLOR;
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.3, 20), material(pants));
      place(lower, parent, [0, 0.36, 0]);
      addBox(parent, [0.3, 0.24, 0.02], pants, [0, 0.66, 0.36]);
      addBox(parent, [0.06, 0.3, 0.02], pants, [-0.13, 0.84, 0.3]);
      addBox(parent, [0.06, 0.3, 0.02], pants, [0.13, 0.84, 0.3]);
      break;
    }
    default:
      break;
  }
}

/** 큰 둥근 머리와 점 눈, 볼터치, 작은 미소. */
function addHeadAndFace(parent: THREE.Object3D, skin: THREE.Color) {
  addEllipsoid(parent, HEAD_RADIUS, skin, [0, HEAD_Y, 0], HEAD_SCALE);
  for (const x of [-0.2, 0.2]) {
    addEllipsoid(parent, 0.065, '1c1c1c', [x, HEAD_Y + 0.02, 0.55], [0.9, 1.25, 0.5]);
    addEllipsoid(parent, 0.085, 'f08a8a', [x * 1.7, HEAD_Y - 0.12, 0.47], [1.2, 0.7, 0.4]);
  }
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.014, 6, 14, Math.PI),
    material('8a3b32'),
  );
  smile.rotation.z = Math.PI;
  place(smile, parent, [0, HEAD_Y - 0.1, 0.565]);
}

/** 5축 값으로 캐릭터 한 명을 만든다. 쓰고 나면 `disposeAvatarModel`로 정리해야 한다. */
export function createAvatarModel(avatar: Avatar): THREE.Group {
  const root = new THREE.Group();
  const skin = hex(SKIN_COLOR_HEX[avatar.skinColor]);
  const hair = hex(HAIR_COLOR_HEX[avatar.hairColor]);
  const shoes = hex(SHOES_COLOR_HEX[avatar.shoesColor]);
  const look = CLOTHES_LOOK[avatar.clothesStyle];

  // 짧고 통통한 다리와 둥근 신발
  for (const x of [-0.17, 0.17]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.11, 0.22, 12),
      material(look.pants ? hex(look.pants) : skin),
    );
    place(leg, root, [x, 0.26, 0]);
    addEllipsoid(root, 0.2, shoes, [x, 0.1, 0.06], [0.85, 0.55, 1.2]);
  }

  addBodyAndClothes(root, avatar.clothesStyle, skin, look);
  addHeadAndFace(root, skin);
  addHair(root, avatar.hairStyle, hair);
  return root;
}

/** 모델이 만든 도형/재질/텍스처를 GPU 메모리에서 해제한다. */
export function disposeAvatarModel(model: THREE.Object3D) {
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const mat of materials) {
        if (mat instanceof THREE.MeshLambertMaterial) {
          mat.map?.dispose();
        }
        mat.dispose();
      }
    }
  });
}
