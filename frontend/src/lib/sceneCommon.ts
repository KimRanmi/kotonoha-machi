import * as THREE from 'three';
import { createAvatarModel, disposeAvatarModel } from './avatarModel';
import type { AvatarPalette } from './avatarPreview';
import { addAccessory } from './residentAccessories';
import type { VillageResident } from './villageResidents';

/** 마을과 건물 내부 장면이 함께 쓰는 값들. */

export const WALK_SPEED = 4; // 초당 이동 거리
export const PLAYER_SCALE = 0.6; // 캐릭터 크기 배율. 문(높이 1.8)보다 작아야 집이 커 보인다
export const TALK_DISTANCE = 2; // 이 거리 안에 들어오면 주민에게 말을 걸 수 있다
export const TURN_SPEED = 14; // 클수록 방향 전환이 빠르다
// 고정 쿼터뷰: 바라보는 지점을 항상 이 각도로 본다. 직교 카메라라 멀리 둬도 크기는 같다.
export const CAMERA_OFFSET = new THREE.Vector3(50, 50, 50);

/**
 * 화면 기준 방향키 → 월드 방향. 카메라가 (+x, +y, +z)에서 원점을 내려다보므로 화면 위쪽은 월드의
 * (-x, -z), 오른쪽은 (+x, -z)다.
 */
export const KEY_DIRECTIONS: Record<string, [number, number]> = {
  ArrowUp: [-1, -1],
  KeyW: [-1, -1],
  ArrowDown: [1, 1],
  KeyS: [1, 1],
  ArrowLeft: [-1, 1],
  KeyA: [-1, 1],
  ArrowRight: [1, -1],
  KeyD: [1, -1],
};

const NAME_TAG_WIDTH = 256;
const NAME_TAG_HEIGHT = 112;
const NAME_TAG_PILL_Y = 56; // 이름 알약의 위쪽 y. 그 위 공간에 하트를 그린다
const NAME_TAG_UNIT = 2.4 / NAME_TAG_WIDTH; // 캔버스 1픽셀이 월드에서 차지하는 길이

/** 하트 모양 경로를 만든다. (centerX, topY)에서 위쪽 가운데 오목한 곳이 시작하고 size는 너비다. */
function traceHeart(
  context: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  size: number,
) {
  const half = size / 2;
  context.beginPath();
  context.moveTo(centerX, topY + size * 0.3);
  context.bezierCurveTo(centerX, topY, centerX - half, topY, centerX - half, topY + size * 0.32);
  context.bezierCurveTo(
    centerX - half,
    topY + size * 0.62,
    centerX - size * 0.2,
    topY + size * 0.78,
    centerX,
    topY + size * 0.95,
  );
  context.bezierCurveTo(
    centerX + size * 0.2,
    topY + size * 0.78,
    centerX + half,
    topY + size * 0.62,
    centerX + half,
    topY + size * 0.32,
  );
  context.bezierCurveTo(centerX + half, topY, centerX, topY, centerX, topY + size * 0.3);
  context.closePath();
}

/** 이름표를 캔버스에 그린다. 위쪽에 하트(친밀도만큼 아래에서부터 채움), 아래쪽에 이름 알약. */
function drawNameTag(canvas: HTMLCanvasElement, name: string, friendshipLevel: number) {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);

  const heartSize = 44;
  const heartTop = 4;
  const heartBottom = heartTop + heartSize * 0.95;
  const ratio = Math.min(Math.max(friendshipLevel, 0), 100) / 100;
  context.save();
  traceHeart(context, canvas.width / 2, heartTop, heartSize);
  context.fillStyle = '#ffffff';
  context.fill();
  context.clip();
  context.fillStyle = '#ff5c7a';
  context.fillRect(0, heartBottom - (heartBottom - heartTop) * ratio, canvas.width, canvas.height);
  context.restore();
  traceHeart(context, canvas.width / 2, heartTop, heartSize);
  context.lineWidth = 3;
  context.strokeStyle = '#c94a64';
  context.stroke();

  context.fillStyle = 'rgba(255, 255, 255, 0.85)';
  context.beginPath();
  context.roundRect(0, NAME_TAG_PILL_Y, 256, 48, 24);
  context.fill();
  context.fillStyle = '#3d3a36';
  context.font = 'bold 30px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(name, 128, NAME_TAG_PILL_Y + 25);
}

/**
 * 주민 머리 위에 띄울 이름표. 하트와 글자를 캔버스에 그려 항상 카메라를 향하는 판(Sprite)에 붙인다.
 * 하트는 친밀도(0~100)만큼 아래에서부터 색이 채워진다.
 */
export function createNameTag(name: string, friendshipLevel: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = NAME_TAG_WIDTH;
  canvas.height = NAME_TAG_HEIGHT;
  drawNameTag(canvas, name, friendshipLevel);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.renderOrder = 1; // 다른 물체에 가려지지 않게 맨 위에 그린다
  sprite.scale.set(2.4, NAME_TAG_HEIGHT * NAME_TAG_UNIT, 1);
  // 이름 알약의 중심이 예전 이름표 자리(머리 위 2.6)에 오도록, 캔버스 중심과의 차이만큼 올린다
  sprite.position.y = 2.6 + (NAME_TAG_PILL_Y + 24 - NAME_TAG_HEIGHT / 2) * NAME_TAG_UNIT;
  return sprite;
}

/** 이름표의 하트를 새 친밀도로 다시 그린다. */
export function updateNameTag(nameTag: THREE.Sprite, name: string, friendshipLevel: number) {
  const texture = nameTag.material.map;
  if (texture && texture.image instanceof HTMLCanvasElement) {
    drawNameTag(texture.image, name, friendshipLevel);
    texture.needsUpdate = true;
  }
}

/** 장면에 놓인 주민 한 명. 몸(체형·소품 적용)과 머리 위 이름표를 한 묶음(model)으로 들고 있는다. */
export interface ResidentModel {
  model: THREE.Group;
  nameTag: THREE.Sprite;
  /** 이름표의 하트를 새 친밀도(0~100)로 다시 그린다. */
  setFriendship: (level: number) => void;
}

/**
 * 주민 한 명의 모델을 만든다. 체형 배율은 몸에만 적용하고, 이름표는 배율에 찌그러지지 않게 묶음 쪽에 둔다.
 * 위치와 방향은 부르는 쪽이 정하고, 쓰고 나면 `disposeResidentModel`로 정리해야 한다.
 */
export function createResidentModel(
  resident: VillageResident,
  palette: AvatarPalette,
  friendshipLevel: number,
): ResidentModel {
  const model = new THREE.Group();
  model.scale.setScalar(PLAYER_SCALE);
  const height = resident.build?.height ?? 1;
  const width = resident.build?.width ?? 1;
  const body = createAvatarModel(resident.avatar, palette);
  for (const accessory of resident.accessories ?? []) {
    addAccessory(body, accessory);
  }
  body.scale.set(width, height, width);
  model.add(body);
  const nameTag = createNameTag(resident.name, friendshipLevel);
  nameTag.position.y *= height;
  model.add(nameTag);
  return {
    model,
    nameTag,
    setFriendship: (level) => updateNameTag(nameTag, resident.name, level),
  };
}

/** `createResidentModel`로 만든 주민 모델이 쓴 GPU 자원을 해제한다. */
export function disposeResidentModel({ model, nameTag }: ResidentModel) {
  disposeAvatarModel(model);
  nameTag.material.map?.dispose();
  nameTag.material.dispose();
}
