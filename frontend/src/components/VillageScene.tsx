import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { VillageBuilding, VillageMap, VillagePosition } from '../api/village';
import type { Friendships } from '../api/resident';
import type { Avatar } from '../api/user';
import { createAvatarModel, disposeAvatarModel } from '../lib/avatarModel';
import type { AvatarPalette } from '../lib/avatarPreview';
import {
  CAMERA_OFFSET,
  KEY_DIRECTIONS,
  PLAYER_SCALE,
  TALK_DISTANCE,
  TURN_SPEED,
  WALK_SPEED,
  createResidentModel,
  disposeResidentModel,
  type ResidentModel,
} from '../lib/sceneCommon';
import { touchMove } from '../lib/touchMove';
import { collidesWithBuildings, findDoorAt } from '../lib/villageBuildings';
import { collidesWithResidents, placeResidents } from '../lib/villageResidents';
import { collidesWithTrees, createVillageLayout } from '../lib/villageScenery';
import { createVillageWorld } from '../lib/villageScenery3d';
import styles from './VillageScene.module.css';

interface VillageSceneProps {
  avatar: Avatar;
  palette: AvatarPalette;
  /** 서버에서 받은 마을 건물들. 길과 나무·꽃 배치도 이 목록으로 계산하며, 바뀌면 장면을 다시 만든다. */
  buildings: VillageBuilding[];
  /** 서버에서 받은 마을 땅 크기. 이동 범위와 풍경(나무·숲·풀밭) 범위가 이 값으로 정해진다. */
  map: VillageMap;
  /** 건물 간판을 눌렀을 때 호출된다. */
  onEnterBuilding: (buildingId: string) => void;
  /** 대화 가능한 거리 안에 들어온 가장 가까운 주민의 slug. 아무도 없으면 null. 바뀔 때만 호출된다. */
  onNearResidentChange: (residentSlug: string | null) => void;
  /** 건물 문 앞에 선 동안 그 건물 id. 아니면 null. 바뀔 때만 호출된다. */
  onNearBuildingChange: (buildingId: string | null) => void;
  /** 서버에 저장된 마지막 위치. 없거나 지금은 설 수 없는 자리면 기본 시작 위치에서 시작한다. 장면을 만들 때 한 번만 읽는다. */
  initialPosition: VillagePosition | null;
  /** 캐릭터가 서 있는 자리가 바뀔 때마다(시작할 때 포함) 호출된다. 저장은 호출하는 쪽이 맡는다. */
  onPositionChange: (position: VillagePosition) => void;
  /** 주민(slug)별 친밀도. 이름표 하트에 반영되며, 바뀌어도 장면을 다시 만들지 않고 하트만 다시 그린다. */
  friendships: Friendships;
}

const GROUND_SCALE = 2.5; // 눈에 보이는 풀밭의 절반 크기 = 이동 가능한 땅의 절반 크기 × 이 값. 화면 어디를 봐도 땅이 보이게 훨씬 크게 잡는다
const VIEW_HEIGHT = 18; // 화면에 세로로 보이는 월드 길이(직교 카메라)

function createGroundTexture(groundHalfSize: number): THREE.CanvasTexture {
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
  texture.repeat.set(groundHalfSize, groundHalfSize);
  return texture;
}

/** 위에서 내려다보는 고정 쿼터뷰 마을. 방향키/WASD로 내 캐릭터를 자유롭게 걷게 한다. */
function VillageScene({
  avatar,
  palette,
  buildings,
  map,
  onEnterBuilding,
  onNearResidentChange,
  onNearBuildingChange,
  initialPosition,
  onPositionChange,
  friendships,
}: VillageSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 장면은 avatar/palette/buildings/map이 바뀔 때만 다시 만들고, 입장 콜백은 최신 값을 ref로 읽는다.
  const onEnterRef = useRef(onEnterBuilding);
  useEffect(() => {
    onEnterRef.current = onEnterBuilding;
  }, [onEnterBuilding]);
  const onNearRef = useRef(onNearResidentChange);
  useEffect(() => {
    onNearRef.current = onNearResidentChange;
  }, [onNearResidentChange]);

  const onNearBuildingRef = useRef(onNearBuildingChange);
  useEffect(() => {
    onNearBuildingRef.current = onNearBuildingChange;
  }, [onNearBuildingChange]);
  const onPositionRef = useRef(onPositionChange);
  useEffect(() => {
    onPositionRef.current = onPositionChange;
  }, [onPositionChange]);
  // 시작 위치는 장면을 만들 때 한 번만 쓰므로 ref에 담아 두고, 값이 바뀌어도 장면을 다시 만들지 않는다.
  const initialPositionRef = useRef(initialPosition);
  // 하트는 장면 안의 주민 이름표에 그려진다. 장면을 만들 때 최신 친밀도를 읽고, 이후 변화는 아래 효과가 반영한다.
  const friendshipsRef = useRef(friendships);
  const residentModelsRef = useRef(new Map<string, ResidentModel>());
  useEffect(() => {
    friendshipsRef.current = friendships;
    residentModelsRef.current.forEach((residentModel, slug) =>
      residentModel.setFriendship(friendships[slug] ?? 0),
    );
  }, [friendships]);

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

    const groundHalfSize = map.halfSize * GROUND_SCALE;
    const groundTexture = createGroundTexture(groundHalfSize);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(groundHalfSize * 2, groundHalfSize * 2),
      new THREE.MeshLambertMaterial({ map: groundTexture }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // 건물, 길, 나무, 꽃 같은 풍경은 lib/villageScenery3d.ts가 만든다.
    const layout = createVillageLayout(buildings, map.halfSize);
    const world = createVillageWorld(buildings, layout);
    const residents = placeResidents(buildings);
    const isBlocked = (x: number, z: number) =>
      collidesWithBuildings(buildings, x, z) ||
      collidesWithTrees(layout.trees, x, z) ||
      collidesWithResidents(residents, x, z);
    scene.add(world.group);

    const player = createAvatarModel(avatar, palette);
    player.scale.setScalar(PLAYER_SCALE);
    const start = initialPositionRef.current;
    // 저장된 자리가 땅 밖이거나(땅을 줄인 경우) 막힌 자리면 기본 시작 위치에서 시작한다.
    const limit = map.maxWalkCoordinate;
    if (
      start &&
      Math.abs(start.x) <= limit &&
      Math.abs(start.z) <= limit &&
      !isBlocked(start.x, start.z)
    ) {
      player.position.set(start.x, 0, start.z);
    }
    scene.add(player);

    // 건물에 속하지 않은 주민만 마을 길 위에 서서 남쪽(화면 아래)을 바라본다. 건물 소속 주민은 건물 안에 있다.
    // 장면이 사라질 때 정리할 수 있게 목록으로 들고 있는다.
    const residentModels = residents.map((resident) => {
      const residentModel = createResidentModel(
        resident,
        palette,
        friendshipsRef.current[resident.slug] ?? 0,
      );
      residentModel.model.position.set(resident.x, 0, resident.z);
      scene.add(residentModel.model);
      residentModelsRef.current.set(resident.slug, residentModel);
      return residentModel;
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
    const handlePointerMove = (event: PointerEvent) => {
      const hovered = findSign(event);
      for (const sign of world.signs) {
        sign.setHighlight(sign === hovered);
      }
      renderer.domElement.style.cursor = hovered ? 'pointer' : '';
    };
    const handleClick = (event: MouseEvent) => {
      const clicked = findSign(event);
      if (clicked) {
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

    onPositionRef.current({ x: player.position.x, z: player.position.z });
    let nearSlug: string | null = null;
    let nearBuildingId: string | null = null;
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
      dx += touchMove.x; // 화면 조이스틱(터치 기기)
      dz += touchMove.z;
      const length = Math.hypot(dx, dz);
      if (length > 0) {
        dx /= length;
        dz /= length;
        const limit = map.maxWalkCoordinate;
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
        onPositionRef.current({ x: player.position.x, z: player.position.z });
      }

      // 건물 문 앞에 서 있으면 마을 화면이 입장 버튼을 띄운다.
      const door = findDoorAt(buildings, player.position.x, player.position.z);
      const doorId = door ? door.id : null;
      if (doorId !== nearBuildingId) {
        nearBuildingId = doorId;
        onNearBuildingRef.current(nearBuildingId);
      }

      // 가장 가까운 주민이 말 걸 수 있는 거리 안이면 마을 화면이 대화 버튼을 띄운다.
      let closest: string | null = null;
      let closestDistance = TALK_DISTANCE;
      for (const resident of residents) {
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
      onNearBuildingRef.current(null);
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      disposeAvatarModel(player);
      residentModels.forEach(disposeResidentModel);
      residentModelsRef.current.clear();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      groundTexture.dispose();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      world.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [avatar, palette, buildings, map]);

  return <div ref={containerRef} className={styles.scene} aria-label="마을 화면" />;
}

export default VillageScene;
