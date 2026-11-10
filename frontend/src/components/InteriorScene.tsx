import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Avatar } from '../api/user';
import { createAvatarModel, disposeAvatarModel } from '../lib/avatarModel';
import type { AvatarPalette } from '../lib/avatarPreview';
import { createInteriorRoom } from '../lib/buildingInterior3d';
import {
  ROOM_DEPTH,
  ROOM_ENTRANCE,
  ROOM_WIDTH,
  collidesWithFurniture,
  isAtRoomExit,
  type BuildingInterior,
} from '../lib/buildingInteriors';
import {
  CAMERA_OFFSET,
  KEY_DIRECTIONS,
  PLAYER_SCALE,
  TALK_DISTANCE,
  TURN_SPEED,
  WALK_SPEED,
  createNameTag,
} from '../lib/sceneCommon';
import { PLAYER_RADIUS } from '../lib/villageBuildings';
import { RESIDENT_RADIUS, type VillageResident } from '../lib/villageResidents';
import styles from './VillageScene.module.css';

interface InteriorSceneProps {
  avatar: Avatar;
  palette: AvatarPalette;
  /** 이 건물의 방 꾸밈(바닥·벽 색, 가구 목록). 바뀌면 장면을 다시 만든다. */
  interior: BuildingInterior;
  /** 방 안에 서 있는 주민. 주민이 없는 건물(집)이면 null. */
  resident: VillageResident | null;
  /** 주민에게 말을 걸 수 있는 거리 안에 있는지. 바뀔 때만 호출된다. */
  onNearResidentChange: (near: boolean) => void;
  /** 현관 매트 위에 서 있는지. 바뀔 때만 호출된다. */
  onNearExitChange: (near: boolean) => void;
}

// 방 전체가 화면에 들어오도록 보이는 범위를 정한다. 세로는 최소 이만큼, 가로는 방 대각선 길이만큼 보여야 한다.
const MIN_VIEW_HEIGHT = 13;
const MIN_VIEW_WIDTH = 15.5;
/** 카메라가 바라보는 지점. 벽이 위로 솟아 있어 바닥 중심보다 조금 위를 본다. */
const CAMERA_TARGET = new THREE.Vector3(0, 1.2, 0);

/** 건물 안 방. 카메라는 마을과 같은 고정 쿼터뷰이고, 방이 한 화면에 들어오므로 캐릭터를 따라가지 않는다. */
function InteriorScene({
  avatar,
  palette,
  interior,
  resident,
  onNearResidentChange,
  onNearExitChange,
}: InteriorSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 장면은 avatar/palette/interior/resident가 바뀔 때만 다시 만들고, 콜백은 최신 값을 ref로 읽는다.
  const onNearResidentRef = useRef(onNearResidentChange);
  useEffect(() => {
    onNearResidentRef.current = onNearResidentChange;
  }, [onNearResidentChange]);
  const onNearExitRef = useRef(onNearExitChange);
  useEffect(() => {
    onNearExitRef.current = onNearExitChange;
  }, [onNearExitChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#2b2622'); // 방 바깥은 어둡게 비워 방만 떠 보이게 한다
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const light = new THREE.DirectionalLight(0xffffff, 1.6);
    light.position.set(6, 12, 4);
    scene.add(light);

    const room = createInteriorRoom(interior);
    scene.add(room.group);

    const spot = interior.residentSpot;
    const isBlocked = (x: number, z: number) =>
      collidesWithFurniture(interior.items, x, z) ||
      (resident !== null && Math.hypot(x - spot.x, z - spot.z) < PLAYER_RADIUS + RESIDENT_RADIUS);

    const player = createAvatarModel(avatar, palette);
    player.scale.setScalar(PLAYER_SCALE);
    player.position.set(ROOM_ENTRANCE.x, 0, ROOM_ENTRANCE.z);
    player.rotation.y = Math.PI; // 방 안쪽(-z)을 보고 들어온다
    scene.add(player);

    // 주민은 정해진 자리에 서서 현관 쪽을 바라본다.
    let residentModel: THREE.Group | null = null;
    let nameTag: THREE.Sprite | null = null;
    if (resident) {
      residentModel = createAvatarModel(resident.avatar, palette);
      residentModel.scale.setScalar(PLAYER_SCALE);
      residentModel.position.set(spot.x, 0, spot.z);
      nameTag = createNameTag(resident.name);
      residentModel.add(nameTag);
      scene.add(residentModel);
    }

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
    camera.position.copy(CAMERA_TARGET).add(CAMERA_OFFSET);
    camera.lookAt(CAMERA_TARGET);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      const aspect = clientWidth / Math.max(clientHeight, 1);
      // 화면이 좁으면 가로로 방이 잘리지 않게 보이는 범위를 넓힌다.
      const viewHeight = Math.max(MIN_VIEW_HEIGHT, MIN_VIEW_WIDTH / aspect);
      renderer.setSize(clientWidth, clientHeight);
      camera.left = (-viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
    };
    resize();
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

    const limitX = ROOM_WIDTH / 2 - PLAYER_RADIUS;
    const limitZ = ROOM_DEPTH / 2 - PLAYER_RADIUS;
    let nearResident = false;
    let nearExit = false;
    let targetAngle = player.rotation.y;
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
        // X, Z를 따로 검사해야 가구에 비스듬히 부딪혀도 옆으로 미끄러진다.
        const nextX = THREE.MathUtils.clamp(
          player.position.x + dx * WALK_SPEED * delta,
          -limitX,
          limitX,
        );
        if (!isBlocked(nextX, player.position.z)) {
          player.position.x = nextX;
        }
        const nextZ = THREE.MathUtils.clamp(
          player.position.z + dz * WALK_SPEED * delta,
          -limitZ,
          limitZ,
        );
        if (!isBlocked(player.position.x, nextZ)) {
          player.position.z = nextZ;
        }
        targetAngle = Math.atan2(dx, dz);
      }

      const atExit = isAtRoomExit(player.position.x, player.position.z);
      if (atExit !== nearExit) {
        nearExit = atExit;
        onNearExitRef.current(nearExit);
      }

      const canTalk =
        resident !== null &&
        Math.hypot(player.position.x - spot.x, player.position.z - spot.z) < TALK_DISTANCE;
      if (canTalk !== nearResident) {
        nearResident = canTalk;
        onNearResidentRef.current(nearResident);
      }

      // 현재 각도에서 목표 각도로 가장 짧은 방향으로 부드럽게 돈다.
      let diff = targetAngle - player.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.rotation.y += diff * Math.min(1, TURN_SPEED * delta);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      onNearResidentRef.current(false);
      onNearExitRef.current(false);
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      disposeAvatarModel(player);
      if (residentModel) {
        disposeAvatarModel(residentModel);
      }
      if (nameTag) {
        nameTag.material.map?.dispose();
        nameTag.material.dispose();
      }
      room.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [avatar, palette, interior, resident]);

  return <div ref={containerRef} className={styles.scene} aria-label="건물 내부 화면" />;
}

export default InteriorScene;
