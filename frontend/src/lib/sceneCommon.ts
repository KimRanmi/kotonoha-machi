import * as THREE from 'three';

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

/** 주민 머리 위에 띄울 이름표. 글자를 캔버스에 그려 항상 카메라를 향하는 판(Sprite)에 붙인다. */
export function createNameTag(name: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = 'rgba(255, 255, 255, 0.85)';
    context.beginPath();
    context.roundRect(0, 8, 256, 48, 24);
    context.fill();
    context.fillStyle = '#3d3a36';
    context.font = 'bold 30px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(name, 128, 33);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.renderOrder = 1; // 다른 물체에 가려지지 않게 맨 위에 그린다
  sprite.scale.set(2.4, 0.6, 1);
  sprite.position.y = 2.6; // 주민 모델(배율 적용 전) 머리 위
  return sprite;
}
