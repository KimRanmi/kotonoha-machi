import * as THREE from 'three';
import type { Avatar } from '../api/user';
import { HAIR_COLOR_HEX, SHOES_COLOR_HEX, SKIN_COLOR_HEX } from './avatarPreview';

/**
 * 캐릭터 꾸미기 5축 값으로 저폴리 3D 캐릭터를 만든다(박스/구 같은 기본 도형 조합).
 * 프로필 미리보기와 마을이 같은 함수를 쓰므로 두 화면의 캐릭터가 항상 똑같다.
 * 캐릭터는 +z 방향을 바라보고, 발바닥이 y=0, 키는 약 2다.
 */

const PANTS_COLOR = '3b4252';

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

function hex(value: string): THREE.Color {
  return new THREE.Color(`#${value}`);
}

function material(color: string | THREE.Color): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color: new THREE.Color(color), flatShading: true });
}

/** 가로세로 선으로 줄무늬/체크 무늬를 그린 작은 캔버스 텍스처(상의 앞뒤에 입힌다). */
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
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  color: string | THREE.Color | THREE.Material,
  position: [number, number, number],
): THREE.Mesh {
  const mat = color instanceof THREE.Material ? color : material(color);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addSphere(
  parent: THREE.Object3D,
  radius: number,
  color: THREE.Color,
  position: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), material(color));
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

/** 머리 위쪽(윗면 y=1.9)에 헤어스타일 8종을 얹는다. 머리는 한 변 0.6인 정육면체다. */
function addHair(parent: THREE.Object3D, style: Avatar['hairStyle'], color: THREE.Color) {
  const cap = () => {
    addBox(parent, [0.68, 0.16, 0.68], color, [0, 1.94, 0]);
    addBox(parent, [0.68, 0.45, 0.14], color, [0, 1.7, -0.27]);
    addBox(parent, [0.68, 0.1, 0.12], color, [0, 1.84, 0.3]);
  };

  switch (style) {
    case 'SHORT':
      cap();
      break;
    case 'BOB':
      cap();
      addBox(parent, [0.68, 0.7, 0.14], color, [0, 1.58, -0.27]);
      addBox(parent, [0.1, 0.5, 0.6], color, [-0.34, 1.62, 0]);
      addBox(parent, [0.1, 0.5, 0.6], color, [0.34, 1.62, 0]);
      break;
    case 'PONYTAIL': {
      cap();
      const tail = addBox(parent, [0.16, 0.6, 0.16], color, [0, 1.6, -0.42]);
      tail.rotation.x = -0.25;
      break;
    }
    case 'AFRO':
      addSphere(parent, 0.5, color, [0, 2.0, -0.08]);
      break;
    case 'BRAIDS':
      cap();
      addBox(parent, [0.12, 0.8, 0.12], color, [-0.36, 1.5, 0.05]);
      addBox(parent, [0.12, 0.8, 0.12], color, [0.36, 1.5, 0.05]);
      break;
    case 'CURLY':
      for (const [x, y, z] of [
        [0, 2.05, 0],
        [-0.25, 2.0, 0.15],
        [0.25, 2.0, 0.15],
        [-0.28, 2.0, -0.15],
        [0.28, 2.0, -0.15],
        [0, 2.0, -0.28],
        [-0.34, 1.78, 0],
        [0.34, 1.78, 0],
      ] as [number, number, number][]) {
        addSphere(parent, 0.18, color, [x, y, z]);
      }
      break;
    case 'BUNS':
      cap();
      addSphere(parent, 0.17, color, [-0.26, 2.1, -0.05]);
      addSphere(parent, 0.17, color, [0.26, 2.1, -0.05]);
      break;
    case 'MOHAWK':
      addBox(parent, [0.12, 0.32, 0.64], color, [0, 2.0, -0.02]);
      break;
  }
}

/** 옷 종류별로 몸통(상의)과 소품을 얹는다. 몸통 윗면 y=1.3, 아랫면 y=0.6. */
function addClothes(
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

  addBox(parent, [0.8, 0.7, 0.44], topMaterial, [0, 0.95, 0]);
  // 소매: 팔 위쪽 절반
  addBox(parent, [0.2, 0.34, 0.24], sleeveColor, [-0.5, 1.13, 0]);
  addBox(parent, [0.2, 0.34, 0.24], sleeveColor, [0.5, 1.13, 0]);
  // 팔 아래쪽(맨팔)
  addBox(parent, [0.18, 0.3, 0.22], skin, [-0.5, 0.82, 0]);
  addBox(parent, [0.18, 0.3, 0.22], skin, [0.5, 0.82, 0]);

  switch (style) {
    case 'HOODIE':
      addBox(parent, [0.6, 0.2, 0.2], topColor, [0, 1.28, -0.25]); // 목 뒤 후드
      break;
    case 'JACKET':
      addBox(parent, [0.1, 0.7, 0.02], 'd8d2c0', [0, 0.95, 0.23]); // 지퍼 라인
      addBox(parent, [0.8, 0.1, 0.46], '3d5236', [0, 1.28, 0]); // 깃
      break;
    case 'COAT':
      addBox(parent, [0.86, 0.5, 0.5], topColor, [0, 0.38, 0]); // 무릎까지 오는 자락
      addBox(parent, [0.86, 0.1, 0.5], '7a3b1d', [0, 1.28, 0]);
      break;
    case 'SUIT':
      addBox(parent, [0.22, 0.6, 0.02], 'f2f2f2', [0, 0.98, 0.23]); // 셔츠
      addBox(parent, [0.08, 0.4, 0.02], 'c0392b', [0, 0.98, 0.24]); // 넥타이
      break;
    case 'TIE':
      addBox(parent, [0.08, 0.4, 0.02], '2e4a8e', [0, 0.98, 0.23]);
      break;
    case 'DRESS': {
      const skirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.55, 0.5, 8),
        material(topColor),
      );
      skirt.position.set(0, 0.45, 0);
      parent.add(skirt);
      break;
    }
    case 'OVERALLS':
      addBox(parent, [0.5, 0.45, 0.02], look.pants ?? PANTS_COLOR, [0, 0.82, 0.23]); // 가슴판
      addBox(parent, [0.08, 0.3, 0.02], look.pants ?? PANTS_COLOR, [-0.18, 1.15, 0.23]);
      addBox(parent, [0.08, 0.3, 0.02], look.pants ?? PANTS_COLOR, [0.18, 1.15, 0.23]);
      break;
    default:
      break;
  }
}

/** 5축 값으로 캐릭터 한 명을 만든다. 쓰고 나면 `disposeAvatarModel`로 정리해야 한다. */
export function createAvatarModel(avatar: Avatar): THREE.Group {
  const root = new THREE.Group();
  const skin = hex(SKIN_COLOR_HEX[avatar.skinColor]);
  const hair = hex(HAIR_COLOR_HEX[avatar.hairColor]);
  const shoes = hex(SHOES_COLOR_HEX[avatar.shoesColor]);
  const look = CLOTHES_LOOK[avatar.clothesStyle];

  // 신발(y 0~0.15)과 다리(y 0.15~0.6)
  for (const x of [-0.2, 0.2]) {
    addBox(root, [0.3, 0.15, 0.4], shoes, [x, 0.075, 0.04]);
    addBox(root, [0.28, 0.45, 0.28], look.pants ? hex(look.pants) : skin, [x, 0.375, 0]);
  }

  addClothes(root, avatar.clothesStyle, skin, look);

  // 머리(한 변 0.6, y 1.3~1.9)와 얼굴
  addBox(root, [0.6, 0.6, 0.6], skin, [0, 1.6, 0]);
  addBox(root, [0.09, 0.12, 0.02], '1c1c1c', [-0.14, 1.62, 0.305]);
  addBox(root, [0.09, 0.12, 0.02], '1c1c1c', [0.14, 1.62, 0.305]);
  addBox(root, [0.14, 0.04, 0.02], 'a8483c', [0, 1.46, 0.305]);

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
