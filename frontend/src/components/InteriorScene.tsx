import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Avatar } from '../api/user';
import { createAvatarModel, disposeAvatarModel } from '../lib/avatarModel';
import type { AvatarPalette } from '../lib/avatarPreview';
import { createInteriorRoom } from '../lib/buildingInterior3d';
import {
  ROOM,
  ROOM_ENTRANCE,
  ROOM_SCALE,
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
import styles from './InteriorScene.module.css';

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

const VIEW_HEIGHT = 9; // 화면에 세로로 보이는 월드 길이(직교 카메라). 마을(18)보다 가까이서 봐 방이 화면을 채운다
/** 카메라가 바라보는 높이. 캐릭터 발이 아니라 몸 가운데를 화면 중심에 둔다. */
const CAMERA_TARGET_HEIGHT = 0.6;
// 방의 맨 아래 꼭짓점 (ROOM.maxX, ROOM.maxZ)이 화면 아래 끝에 닿는 카메라 위치(x + z)의 한계. 카메라는 (50, 50, 50)에서
// 내려다보므로(고도각의 sin이 1/√3), 화면 가운데에서 아래 끝까지 VIEW_HEIGHT / 2만큼이 땅에서는 각 축 (VIEW_HEIGHT / 2) × √1.5다.
// 꼭짓점 가까이 선 캐릭터의 발이 화면 끝에 잘리지 않게, 각 축으로 CAMERA_BOTTOM_MARGIN만큼 더 아래까지 가서 꼭짓점을 화면 안쪽으로 올린다.
const CAMERA_BOTTOM_MARGIN = 0.8;
const CAMERA_BOTTOM_LIMIT =
  ROOM.maxX + ROOM.maxZ - 2 * ((VIEW_HEIGHT / 2) * Math.sqrt(1.5) - CAMERA_BOTTOM_MARGIN);

/** 건물 안 방. 마을과 같은 고정 쿼터뷰로 가까이서 보고, 카메라가 내 캐릭터를 따라 움직인다. */
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
    scene.background = new THREE.Color(interior.wallColor); // 바닥과 벽이 화면을 다 덮지만, 혹시 틈이 보여도 벽 색이게
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const light = new THREE.DirectionalLight(0xffffff, 1.6);
    light.position.set(6, 12, 4);
    scene.add(light);

    const room = createInteriorRoom(interior);
    scene.add(room.group);

    // 주민 자리는 배치 좌표로 적혀 있어 월드 좌표로 바꾼다.
    const spot = {
      x: interior.residentSpot.x * ROOM_SCALE,
      z: interior.residentSpot.z * ROOM_SCALE,
    };
    const isBlocked = (x: number, z: number) =>
      collidesWithFurniture(interior.items, x, z) ||
      (resident !== null && Math.hypot(x - spot.x, z - spot.z) < PLAYER_RADIUS + RESIDENT_RADIUS);

    const player = createAvatarModel(avatar, palette);
    player.scale.setScalar(PLAYER_SCALE);
    player.position.set(ROOM_ENTRANCE.x, 0, ROOM_ENTRANCE.z);
    player.rotation.y = (-3 * Math.PI) / 4; // 맨 아래 모서리의 매트에서 방 안쪽(-x, -z)을 보고 들어온다
    scene.add(player);

    // 주민은 정해진 자리에 서서 현관 쪽을 바라본다.
    let residentModel: THREE.Group | null = null;
    let nameTag: THREE.Sprite | null = null;
    if (resident) {
      residentModel = createAvatarModel(resident.avatar, palette);
      residentModel.scale.setScalar(PLAYER_SCALE);
      residentModel.position.set(spot.x, 0, spot.z);
      residentModel.rotation.y = Math.atan2(ROOM_ENTRANCE.x - spot.x, ROOM_ENTRANCE.z - spot.z);
      nameTag = createNameTag(resident.name);
      residentModel.add(nameTag);
      scene.add(residentModel);
    }

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

    // 계산대 같은 가구가 커진 만큼, 그 너머의 주민에게 말을 걸 수 있는 거리도 같이 늘린다.
    const talkDistance = TALK_DISTANCE * ROOM_SCALE;
    const cameraTarget = new THREE.Vector3();
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
          ROOM.minX + PLAYER_RADIUS,
          ROOM.maxX - PLAYER_RADIUS,
        );
        if (!isBlocked(nextX, player.position.z)) {
          player.position.x = nextX;
        }
        const nextZ = THREE.MathUtils.clamp(
          player.position.z + dz * WALK_SPEED * delta,
          ROOM.minZ + PLAYER_RADIUS,
          ROOM.maxZ - PLAYER_RADIUS,
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
        Math.hypot(player.position.x - spot.x, player.position.z - spot.z) < talkDistance;
      if (canTalk !== nearResident) {
        nearResident = canTalk;
        onNearResidentRef.current(nearResident);
      }

      // 현재 각도에서 목표 각도로 가장 짧은 방향으로 부드럽게 돈다.
      let diff = targetAngle - player.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.rotation.y += diff * Math.min(1, TURN_SPEED * delta);

      // 캐릭터를 따라가되, 방 맨 아래 꼭짓점 너머의 빈 바닥이 화면에 보이지 않게 아래쪽 한계에서 멈춘다.
      let targetX = THREE.MathUtils.clamp(player.position.x, ROOM.minX, ROOM.maxX);
      let targetZ = THREE.MathUtils.clamp(player.position.z, ROOM.minZ, ROOM.maxZ);
      const overBottom = targetX + targetZ - CAMERA_BOTTOM_LIMIT;
      if (overBottom > 0) {
        targetX -= overBottom / 2;
        targetZ -= overBottom / 2;
      }
      cameraTarget.set(targetX, CAMERA_TARGET_HEIGHT, targetZ);
      camera.position.copy(cameraTarget).add(CAMERA_OFFSET);
      camera.lookAt(cameraTarget);
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
