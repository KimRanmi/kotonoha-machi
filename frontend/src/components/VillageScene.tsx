import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Avatar } from '../api/user';
import { createAvatarModel, disposeAvatarModel } from '../lib/avatarModel';
import type { AvatarPalette } from '../lib/avatarPreview';
import { collidesWithBuildings, VILLAGE_BUILDINGS } from '../lib/villageBuildings';
import styles from './VillageScene.module.css';

interface VillageSceneProps {
  avatar: Avatar;
  palette: AvatarPalette;
}

const WALK_SPEED = 4; // 초당 이동 거리
const TURN_SPEED = 14; // 클수록 방향 전환이 빠르다
const MAP_HALF_SIZE = 18; // 이동 가능한 정사각형 땅의 절반 크기
const VIEW_HEIGHT = 9; // 화면에 세로로 보이는 월드 길이(직교 카메라)
const CAMERA_OFFSET = new THREE.Vector3(10, 10, 10); // 고정 쿼터뷰: 캐릭터를 항상 이 각도로 본다

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
  texture.repeat.set(MAP_HALF_SIZE, MAP_HALF_SIZE);
  return texture;
}

/** 위에서 내려다보는 고정 쿼터뷰 마을. 방향키/WASD로 내 캐릭터를 자유롭게 걷게 한다. */
function VillageScene({ avatar, palette }: VillageSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#cfeaf5');
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(6, 12, 4);
    scene.add(sun);

    const groundTexture = createGroundTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_HALF_SIZE * 2, MAP_HALF_SIZE * 2),
      new THREE.MeshLambertMaterial({ map: groundTexture }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // 건물은 몸체 상자 위에 조금 더 넓고 어두운 지붕 상자를 얹은 단순한 모양이다.
    const buildingGeometries: THREE.BufferGeometry[] = [];
    const buildingMaterials: THREE.Material[] = [];
    for (const building of VILLAGE_BUILDINGS) {
      const bodyMaterial = new THREE.MeshLambertMaterial({ color: building.color });
      const roofMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color(building.color).multiplyScalar(0.75),
      });
      const bodyGeometry = new THREE.BoxGeometry(building.width, building.height, building.depth);
      const roofGeometry = new THREE.BoxGeometry(building.width + 0.6, 0.4, building.depth + 0.6);
      buildingMaterials.push(bodyMaterial, roofMaterial);
      buildingGeometries.push(bodyGeometry, roofGeometry);

      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.set(building.x, building.height / 2, building.z);
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.set(building.x, building.height + 0.2, building.z);
      scene.add(body, roof);
    }

    const player = createAvatarModel(avatar, palette);
    player.scale.setScalar(1.2);
    scene.add(player);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
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
        if (!collidesWithBuildings(nextX, player.position.z)) {
          player.position.x = nextX;
        }
        const nextZ = THREE.MathUtils.clamp(
          player.position.z + dz * WALK_SPEED * delta,
          -limit,
          limit,
        );
        if (!collidesWithBuildings(player.position.x, nextZ)) {
          player.position.z = nextZ;
        }
        targetAngle = Math.atan2(dx, dz);
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
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      disposeAvatarModel(player);
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      groundTexture.dispose();
      buildingGeometries.forEach((geometry) => geometry.dispose());
      buildingMaterials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [avatar, palette]);

  return <div ref={containerRef} className={styles.scene} aria-label="마을 화면" />;
}

export default VillageScene;
