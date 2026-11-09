import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Avatar } from '../api/user';
import { createAvatarModel, disposeAvatarModel } from '../lib/avatarModel';
import type { AvatarPalette } from '../lib/avatarPreview';
import { collidesWithBuildings, findDoorAt } from '../lib/villageBuildings';
import { VILLAGE_RESIDENTS, collidesWithResidents } from '../lib/villageResidents';
import { collidesWithTrees } from '../lib/villageScenery';
import { createVillageWorld } from '../lib/villageScenery3d';
import styles from './VillageScene.module.css';

interface VillageSceneProps {
  avatar: Avatar;
  palette: AvatarPalette;
  /** 열려 있는 건물의 간판을 누르거나 문 앞에서 벽 쪽으로 걸어가면 호출된다. */
  onEnterBuilding: (buildingId: string) => void;
  /** 서버가 열려 있다고 알려 준 건물 id들. 여기에 없는 건물은 잠긴 것으로 본다. */
  unlockedBuildingIds: ReadonlySet<string>;
  /** 대화 가능한 거리 안에 들어온 가장 가까운 주민의 slug. 아무도 없으면 null. 바뀔 때만 호출된다. */
  onNearResidentChange: (residentSlug: string | null) => void;
}

const WALK_SPEED = 4; // 초당 이동 거리
const PLAYER_SCALE = 0.6; // 캐릭터 크기 배율. 문(높이 1.8)보다 작아야 집이 커 보인다
const TALK_DISTANCE = 2; // 이 거리 안에 들어오면 주민에게 말을 걸 수 있다
const TURN_SPEED = 14; // 클수록 방향 전환이 빠르다
const MAP_HALF_SIZE = 18; // 이동 가능한 정사각형 땅의 절반 크기
const GROUND_HALF_SIZE = 60; // 눈에 보이는 풀밭의 절반 크기. 화면 어디를 봐도 땅이 보이게 이동 범위보다 훨씬 크다
const VIEW_HEIGHT = 18; // 화면에 세로로 보이는 월드 길이(직교 카메라). 건물 3개가 한 화면에 들어오는 크기
// 고정 쿼터뷰: 캐릭터를 항상 이 각도로 본다. 직교 카메라라 멀리 둬도 크기는 같고, 카메라 앞쪽의 나무가
// 시야 앞면에 잘리지 않게 숲(최대 48) 바깥까지 물러나 있다.
const CAMERA_OFFSET = new THREE.Vector3(50, 50, 50);

/**
 * 화면 기준 방향키 → 월드 방향. 카메라가 (+x, +y, +z)에서 원점을 내려다보므로 화면 위쪽은 월드의
 * (-x, -z), 오른쪽은 (+x, -z)다.
 */
const KEY_DIRECTIONS: Record<string, [number, number]> = {
  ArrowUp: [-1, -1],
  KeyW: [-1, -1],
  ArrowDown: [1, 1],
  KeyS: [1, 1],
  ArrowLeft: [-1, 1],
  KeyA: [-1, 1],
  ArrowRight: [1, -1],
  KeyD: [1, -1],
};

/** 캐릭터가 (x, z)에 설 수 없는 자리(건물이나 나무 줄기)인지. */
function isBlocked(x: number, z: number): boolean {
  return collidesWithBuildings(x, z) || collidesWithTrees(x, z) || collidesWithResidents(x, z);
}

/** 주민 머리 위에 띄울 이름표. 글자를 캔버스에 그려 항상 카메라를 향하는 판(Sprite)에 붙인다. */
function createNameTag(name: string): THREE.Sprite {
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

/** 위에서 내려다보는 고정 쿼터뷰 마을. 방향키/WASD로 내 캐릭터를 자유롭게 걷게 한다. */
function VillageScene({
  avatar,
  palette,
  onEnterBuilding,
  unlockedBuildingIds,
  onNearResidentChange,
}: VillageSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 장면은 avatar/palette가 바뀔 때만 다시 만들고, 입장 콜백은 최신 값을 ref로 읽는다.
  const onEnterRef = useRef(onEnterBuilding);
  useEffect(() => {
    onEnterRef.current = onEnterBuilding;
  }, [onEnterBuilding]);
  // 열림 값도 같은 방식으로 ref에 담아 두고, 값이 바뀌면 장면을 다시 만들지 않고 간판 모양만 갱신한다.
  const unlockedRef = useRef(unlockedBuildingIds);
  const applyUnlockedRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    unlockedRef.current = unlockedBuildingIds;
    applyUnlockedRef.current?.();
  }, [unlockedBuildingIds]);
  const onNearRef = useRef(onNearResidentChange);
  useEffect(() => {
    onNearRef.current = onNearResidentChange;
  }, [onNearResidentChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#9fd28a'); // 풀밭 색. 혹시 땅 끝이 보여도 하늘색 틈이 생기지 않게
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
    const applyUnlocked = () => {
      for (const sign of world.signs) {
        sign.setLocked(!unlockedRef.current.has(sign.building.id));
      }
    };
    applyUnlockedRef.current = applyUnlocked;
    applyUnlocked();

    const player = createAvatarModel(avatar, palette);
    player.scale.setScalar(PLAYER_SCALE);
    scene.add(player);

    // 주민은 고정 위치에 서서 광장 쪽을 바라본다. 장면이 사라질 때 정리할 수 있게 목록으로 들고 있는다.
    const residentModels = VILLAGE_RESIDENTS.map((resident) => {
      const model = createAvatarModel(resident.avatar, palette);
      model.scale.setScalar(PLAYER_SCALE);
      model.position.set(resident.x, 0, resident.z);
      model.rotation.y = Math.atan2(-resident.x, -resident.z);
      const nameTag = createNameTag(resident.name);
      model.add(nameTag);
      scene.add(model);
      return { model, nameTag };
    });

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      const aspect = clientWidth / Math.max(clientHeight, 1);
      renderer.setSize(clientWidth, clientHeight);
      camera.left = (-VIEW_HEIGHT * aspect) / 2;
      camera.right = (VIEW_HEIGHT * aspect) / 2;
      camera.top = VIEW_HEIGHT / 2;
      camera.bottom = -VIEW_HEIGHT / 2;
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
    const isUnlocked = (buildingId: string) => unlockedRef.current.has(buildingId);
    const handlePointerMove = (event: PointerEvent) => {
      const hovered = findSign(event);
      for (const sign of world.signs) {
        sign.setHighlight(sign === hovered && isUnlocked(sign.building.id));
      }
      renderer.domElement.style.cursor =
        hovered && isUnlocked(hovered.building.id) ? 'pointer' : '';
    };
    const handleClick = (event: MouseEvent) => {
      const clicked = findSign(event);
      if (clicked && isUnlocked(clicked.building.id)) {
        onEnterRef.current(clicked.building.id);
      }
    };
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
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
      if (event.code in KEY_DIRECTIONS) {
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

    let nearSlug: string | null = null;
    let entered = false; // 문 앞에서 프레임마다 입장이 중복 호출되지 않게
    let targetAngle = 0;
    let previousTime = performance.now();
    let frameId = 0;
    const animate = (time: number) => {
      const delta = Math.min(Math.max((time - previousTime) / 1000, 0), 0.1);
      previousTime = time;

      let dx = 0;
      let dz = 0;
      for (const code of pressed) {
        dx += KEY_DIRECTIONS[code][0];
        dz += KEY_DIRECTIONS[code][1];
      }
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

        // 문 앞에서 벽 쪽(-z)으로 걸어 들어가면 열린 건물에 자동 입장한다.
        const door = findDoorAt(player.position.x, player.position.z);
        if (!entered && dz < 0 && door && isUnlocked(door.id)) {
          entered = true;
          onEnterRef.current(door.id);
        }
      }

      // 가장 가까운 주민이 말 걸 수 있는 거리 안이면 마을 화면이 대화 버튼을 띄운다.
      let closest: string | null = null;
      let closestDistance = TALK_DISTANCE;
      for (const resident of VILLAGE_RESIDENTS) {
        const distance = Math.hypot(player.position.x - resident.x, player.position.z - resident.z);
        if (distance < closestDistance) {
          closest = resident.slug;
          closestDistance = distance;
        }
      }
      if (closest !== nearSlug) {
        nearSlug = closest;
        onNearRef.current(nearSlug);
      }

      // 현재 각도에서 목표 각도로 가장 짧은 방향으로 부드럽게 돈다.
      let diff = targetAngle - player.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.rotation.y += diff * Math.min(1, TURN_SPEED * delta);

      camera.position.copy(player.position).add(CAMERA_OFFSET);
      camera.lookAt(player.position);
      renderer.render(scene, camera);

      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      onNearRef.current(null);
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      disposeAvatarModel(player);
      for (const { model, nameTag } of residentModels) {
        disposeAvatarModel(model);
        nameTag.material.map?.dispose();
        nameTag.material.dispose();
      }
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      groundTexture.dispose();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      applyUnlockedRef.current = null;
      world.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [avatar, palette]);

  return <div ref={containerRef} className={styles.scene} aria-label="마을 화면" />;
}

export default VillageScene;
