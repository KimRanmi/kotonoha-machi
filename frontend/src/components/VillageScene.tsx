import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Avatar } from '../api/user';
import { createAvatarModel, disposeAvatarModel } from '../lib/avatarModel';
import type { AvatarPalette } from '../lib/avatarPreview';
import { collidesWithBuildings } from '../lib/villageBuildings';
import { collidesWithTrees } from '../lib/villageScenery';
import { createVillageWorld } from '../lib/villageScenery3d';
import styles from './VillageScene.module.css';

interface VillageSceneProps {
  avatar: Avatar;
  palette: AvatarPalette;
  /** 열려 있는 건물의 간판을 눌렀을 때 호출된다. 걸어가지 않고 바로 입장한다. */
  onEnterBuilding: (buildingId: string) => void;
}

const WALK_SPEED = 4; // 초당 이동 거리
const PLAYER_SCALE = 0.6; // 캐릭터 크기 배율. 문(높이 1.8)보다 작아야 집이 커 보인다
const TURN_SPEED = 14; // 클수록 방향 전환이 빠르다
const MAP_HALF_SIZE = 18; // 이동 가능한 정사각형 땅의 절반 크기
const GROUND_HALF_SIZE = 100; // 눈에 보이는 풀밭의 절반 크기. 안개가 가리는 거리(FOG_FAR)보다 멀어야 땅 끝이 안 보인다
const SKY_COLOR = '#bfe3f5'; // 하늘색. 안개 색도 같게 해서 먼 곳이 하늘에 녹아들게 한다
const FOG_NEAR = 22;
const FOG_FAR = 70;

// 3인칭 추적 카메라: 캐릭터 뒤에서 따라가며, 마우스 드래그나 Q/E로 캐릭터 둘레를 돈다.
const CAMERA_FOV = 55;
const CAMERA_DISTANCE = 7; // 캐릭터에서 카메라까지 거리
const CAMERA_MIN_DISTANCE = 2.5; // 벽·나무에 막혀 당겨질 때 이보다 가까워지지는 않는다
const CAMERA_MIN_PITCH = 0.15; // 카메라 높이각(라디안). 작을수록 낮게 깔려 멀리 보인다
const CAMERA_MAX_PITCH = 1.1;
const LOOK_HEIGHT = 0.9; // 카메라가 바라보는 캐릭터 몸의 높이
const DRAG_TURN_SPEED = 0.005; // 마우스 1픽셀당 시점이 도는 각도(라디안)
const KEY_TURN_SPEED = 2; // Q/E로 도는 속도(초당 라디안)
const CLICK_MAX_MOVE = 5; // 이 픽셀 안쪽으로만 움직였으면 드래그가 아니라 클릭으로 본다

/** 이동 키 → [앞뒤, 좌우] 입력. 앞은 카메라가 보는 쪽이다. */
const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [1, 0],
  KeyW: [1, 0],
  ArrowDown: [-1, 0],
  KeyS: [-1, 0],
  ArrowLeft: [0, -1],
  KeyA: [0, -1],
  ArrowRight: [0, 1],
  KeyD: [0, 1],
};
/** 시점 회전 키. Q는 왼쪽, E는 오른쪽으로 돈다. */
const TURN_KEYS: Record<string, number> = { KeyQ: 1, KeyE: -1 };

/** 캐릭터가 (x, z)에 설 수 없는 자리(건물이나 나무 줄기)인지. */
function isBlocked(x: number, z: number): boolean {
  return collidesWithBuildings(x, z) || collidesWithTrees(x, z);
}

/** 카메라가 (x, z)에 있으면 건물·나무에 파묻히거나 숲 속으로 들어가는지. */
function isCameraBlocked(x: number, z: number): boolean {
  return Math.abs(x) > MAP_HALF_SIZE || Math.abs(z) > MAP_HALF_SIZE || isBlocked(x, z);
}

function createGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#9fd28a';
    context.fillRect(0, 0, 64, 64);
    context.fillStyle = '#93c97d';
    context.fillRect(0, 0, 32, 32);
    context.fillRect(32, 32, 32, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(GROUND_HALF_SIZE, GROUND_HALF_SIZE);
  return texture;
}

/** 캐릭터 뒤에서 따라가는 3인칭 마을. 방향키/WASD로 걷고, 마우스 드래그나 Q/E로 시점을 돌린다. */
function VillageScene({ avatar, palette, onEnterBuilding }: VillageSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 장면은 avatar/palette가 바뀔 때만 다시 만들고, 입장 콜백은 최신 값을 ref로 읽는다.
  const onEnterRef = useRef(onEnterBuilding);
  useEffect(() => {
    onEnterRef.current = onEnterBuilding;
  }, [onEnterBuilding]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY_COLOR);
    scene.fog = new THREE.Fog(SKY_COLOR, FOG_NEAR, FOG_FAR);
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(6, 12, 4);
    scene.add(sun);

    const groundTexture = createGroundTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_HALF_SIZE * 2, GROUND_HALF_SIZE * 2),
      new THREE.MeshLambertMaterial({ map: groundTexture }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // 건물, 길, 나무, 꽃 같은 풍경은 lib/villageScenery3d.ts가 만든다.
    const world = createVillageWorld();
    scene.add(world.group);

    const player = createAvatarModel(avatar, palette);
    player.scale.setScalar(PLAYER_SCALE);
    scene.add(player);

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
    };
    resize();

    // 간판은 3D 물체라서, 마우스 위치에서 화면 안쪽으로 광선을 쏘아 맞은 간판을 찾는다(raycaster).
    // 열려 있는 건물 간판만 반응하고, 잠긴 건물 간판은 눌러도 아무 일도 없다.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const findSign = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(
        world.signs.map((sign) => sign.object),
        true,
      )[0];
      return world.signs.find((sign) => hit && sign.object.getObjectById(hit.object.id));
    };
    // 시점: yaw는 카메라가 보는 방향(앞 = (sin, cos)), pitch는 카메라가 캐릭터를 내려다보는 높이각이다.
    let yaw = Math.PI; // 처음에는 -z 쪽(상점 방향)을 본다
    let pitch = 0.5;
    let dragging = false;
    let dragDistance = 0;
    const handlePointerDown = (event: PointerEvent) => {
      dragging = true;
      dragDistance = 0;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (dragging) {
        dragDistance += Math.abs(event.movementX) + Math.abs(event.movementY);
        yaw -= event.movementX * DRAG_TURN_SPEED;
        pitch = THREE.MathUtils.clamp(
          pitch + event.movementY * DRAG_TURN_SPEED,
          CAMERA_MIN_PITCH,
          CAMERA_MAX_PITCH,
        );
        return;
      }
      const hovered = findSign(event);
      for (const sign of world.signs) {
        sign.setHighlight(sign === hovered && !sign.building.locked);
      }
      renderer.domElement.style.cursor = hovered && !hovered.building.locked ? 'pointer' : '';
    };
    const handlePointerUp = () => {
      dragging = false;
    };
    const handleClick = (event: MouseEvent) => {
      if (dragDistance > CLICK_MAX_MOVE) {
        return; // 시점을 돌리려고 끈 것이라 간판을 누른 게 아니다.
      }
      const clicked = findSign(event);
      if (clicked && !clicked.building.locked) {
        onEnterRef.current(clicked.building.id);
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointercancel', handlePointerUp);
    renderer.domElement.addEventListener('click', handleClick);

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const pressed = new Set<string>();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return; // Cmd+A, Ctrl+S 같은 브라우저 단축키는 막지 않는다.
      }
      const target = event.target;
      if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) {
        return;
      }
      if (event.code in MOVE_KEYS || event.code in TURN_KEYS) {
        pressed.add(event.code);
        event.preventDefault(); // 방향키로 페이지가 스크롤되지 않게
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      pressed.delete(event.code);
    };
    const handleBlur = () => pressed.clear();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    let targetAngle = 0;
    let previousTime = performance.now();
    let frameId = 0;
    const animate = (time: number) => {
      const delta = Math.min(Math.max((time - previousTime) / 1000, 0), 0.1);
      previousTime = time;

      for (const code of pressed) {
        yaw += (TURN_KEYS[code] ?? 0) * KEY_TURN_SPEED * delta;
      }

      // 앞(카메라가 보는 쪽)과 오른쪽 입력을 월드 방향으로 바꾼다.
      let forward = 0;
      let right = 0;
      for (const code of pressed) {
        const [keyForward, keyRight] = MOVE_KEYS[code] ?? [0, 0];
        forward += keyForward;
        right += keyRight;
      }
      let dx = forward * Math.sin(yaw) - right * Math.cos(yaw);
      let dz = forward * Math.cos(yaw) + right * Math.sin(yaw);
      const length = Math.hypot(dx, dz);
      if (length > 0) {
        dx /= length;
        dz /= length;
        const limit = MAP_HALF_SIZE - 1;
        // X, Z를 따로 검사해야 건물에 비스듬히 부딪혀도 벽을 따라 미끄러진다.
        const nextX = THREE.MathUtils.clamp(
          player.position.x + dx * WALK_SPEED * delta,
          -limit,
          limit,
        );
        if (!isBlocked(nextX, player.position.z)) {
          player.position.x = nextX;
        }
        const nextZ = THREE.MathUtils.clamp(
          player.position.z + dz * WALK_SPEED * delta,
          -limit,
          limit,
        );
        if (!isBlocked(player.position.x, nextZ)) {
          player.position.z = nextZ;
        }
        targetAngle = Math.atan2(dx, dz);
      }

      // 현재 각도에서 목표 각도로 가장 짧은 방향으로 부드럽게 돈다.
      let diff = targetAngle - player.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.rotation.y += diff * Math.min(1, TURN_SPEED * delta);

      // 카메라는 캐릭터 뒤(보는 방향의 반대쪽) 위에 둔다. 벽·나무·맵 가장자리에 파묻히면 캐릭터 쪽으로 당긴다.
      const behindX = -Math.sin(yaw) * Math.cos(pitch);
      const behindZ = -Math.cos(yaw) * Math.cos(pitch);
      let distance = CAMERA_DISTANCE;
      while (
        distance > CAMERA_MIN_DISTANCE &&
        isCameraBlocked(
          player.position.x + behindX * distance,
          player.position.z + behindZ * distance,
        )
      ) {
        distance -= 0.25;
      }
      camera.position.set(
        player.position.x + behindX * distance,
        LOOK_HEIGHT + Math.sin(pitch) * distance,
        player.position.z + behindZ * distance,
      );
      camera.lookAt(player.position.x, LOOK_HEIGHT, player.position.z);
      renderer.render(scene, camera);

      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      disposeAvatarModel(player);
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      groundTexture.dispose();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointercancel', handlePointerUp);
      renderer.domElement.removeEventListener('click', handleClick);
      world.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [avatar, palette]);

  return <div ref={containerRef} className={styles.scene} aria-label="마을 화면" />;
}

export default VillageScene;
