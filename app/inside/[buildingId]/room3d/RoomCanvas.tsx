"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Furniture, Room } from "../../../interiors";
import { CHAR_SIZE } from "@/lib/walk";
import { buildFurniture, buildShell, shadowBlob } from "./build";
import { PLAYER_SPEC, createCharacter, specForVillager, type CharacterRig } from "../../../character3d";

// 건물 내부 방을 진짜 3D(three.js)로 보여주는 컴포넌트.
// - 시점: 지금까지와 같은 비스듬한 위쪽 시점(원근이 약한 카메라)이고, 캐릭터를 부드럽게 따라간다.
// - 이동·충돌·꾸미기 판정은 부모(page.tsx)가 방의 평면 좌표로 그대로 한다. 여기서는 그리기와
//   "마우스 위치 -> 바닥 평면 좌표" 변환만 한다.
// - 부하: 그림자 맵 하나, 장면은 방 하나뿐이다. 움직임이 없으면(카메라가 멈추고 입력이 없으면)
//   다시 그리지 않고, 화면을 떠나면 모든 자원을 해제한다.

export interface Ghost {
  x: number;
  y: number;
  width: number;
  height: number;
  round: boolean;
  bad: boolean;
}

export default function RoomCanvas({
  room,
  furniture,
  selectedId,
  ghost,
  position,
  residentRect,
  residentId,
  residentName,
  nearResident,
  decorating,
  onFloorPoint,
}: {
  room: Room;
  furniture: Furniture[];
  selectedId: string | null;
  ghost: Ghost | null;
  position: { x: number; y: number };
  residentRect: { x: number; y: number } | null;
  residentId: string | null;
  residentName: string | null;
  nearResident: boolean;
  decorating: boolean;
  onFloorPoint: (pt: { x: number; y: number } | null, type: "click" | "move") => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const doorRef = useRef<HTMLDivElement>(null);

  // 최신 props를 렌더 루프/이벤트에서 읽기 위한 ref
  const live = useRef({ position, nearResident, decorating, onFloorPoint, residentRect, ghost, selectedId, furniture });
  const apiRef = useRef<{ dirty: () => void; rebuildFurniture: () => void; updateOverlay: () => void } | null>(null);
  useEffect(() => {
    live.current = { position, nearResident, decorating, onFloorPoint, residentRect, ghost, selectedId, furniture };
    apiRef.current?.updateOverlay();
    apiRef.current?.dirty();
  });

  // 가구 구성이 바뀌면 가구 모델만 다시 만든다.
  const furnitureKey = furniture.map((f) => `${f.id}:${f.x}:${f.y}`).join("|");
  useEffect(() => {
    apiRef.current?.rebuildFurniture();
  }, [furnitureKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const W = room.width;
    const H = room.height;
    const wh = room.wallHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.prepend(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    // 그릴 필요가 있을 때만 그린다.
    let needs = true;

    const scene = new THREE.Scene();
    scene.add(buildShell(room));

    // 빛: 하늘색 반구광 + 앞쪽 위에서 비추는 따뜻한 해(그림자 생성)
    scene.add(new THREE.HemisphereLight(0xfff6e6, 0xc9a97a, 1.15));
    const sun = new THREE.DirectionalLight(0xfff0d2, 2.1);
    sun.position.set(W * 0.9, 760, H * 1.1);
    sun.target.position.set(W / 2, 0, (wh + H) / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = Math.max(W, H) * 0.75;
    Object.assign(sun.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc, near: 50, far: 2600 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.6;
    scene.add(sun, sun.target);

    // 가구
    let furnGroup = new THREE.Group();
    scene.add(furnGroup);
    const disposeGroup = (grp: THREE.Object3D) => {
      grp.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    };
    const rebuildFurniture = () => {
      scene.remove(furnGroup);
      disposeGroup(furnGroup);
      furnGroup = new THREE.Group();
      live.current.furniture.filter((f) => f.y + f.height > wh).forEach((f) => furnGroup.add(buildFurniture(f, room.id)));
      scene.add(furnGroup);
      needs = true;
    };
    rebuildFurniture();

    // 플레이어 / 주민: 3D 캐릭터(app/character3d.ts) + 바닥 그림자
    const rigs: CharacterRig[] = [];
    const playerRig = createCharacter(PLAYER_SPEC);
    rigs.push(playerRig);
    playerRig.root.scale.setScalar(1.3); // 방 안에서 또렷이 보이도록 살짝 키운다
    const player = new THREE.Group();
    player.add(shadowBlob(), playerRig.root);
    scene.add(player);
    let resident: THREE.Group | null = null;
    let residentRig: CharacterRig | null = null;
    if (residentId && residentRect) {
      residentRig = createCharacter(specForVillager(residentId));
      rigs.push(residentRig);
      residentRig.root.scale.setScalar(1.3);
      resident = new THREE.Group();
      resident.add(shadowBlob(), residentRig.root);
      resident.position.set(residentRect.x + CHAR_SIZE / 2, 0, residentRect.y + CHAR_SIZE / 2);
      scene.add(resident);
    }
    // 방 안의 다른 사람들(직원·손님 등): 제자리에서 숨 쉬듯 서 있고, 이름표가 있으면 달아 준다.
    const npcRigs: CharacterRig[] = [];
    const npcLabels: { el: HTMLDivElement; x: number; z: number }[] = [];
    room.npcs.forEach((n) => {
      const rig = createCharacter(specForVillager(n.look));
      rig.root.scale.setScalar(1.3);
      rig.face(n.facing ?? 0, 1);
      npcRigs.push(rig);
      rigs.push(rig);
      const grp = new THREE.Group();
      grp.add(shadowBlob(), rig.root);
      grp.position.set(n.x + CHAR_SIZE / 2, 0, n.y + CHAR_SIZE / 2);
      scene.add(grp);
      if (n.label) {
        const el = document.createElement("div");
        el.className = "roomLabel";
        el.textContent = n.label;
        host.appendChild(el);
        npcLabels.push({ el, x: n.x + CHAR_SIZE / 2, z: n.y + CHAR_SIZE / 2 });
      }
    });
    let idleAcc = 0;
    let prevX = position.x;
    let prevZ = position.y;
    let movingFor = 0; // 마지막으로 움직인 뒤 지난 시간(걷기 동작을 부드럽게 끝내려고)

    // 꾸미기 보조: 놓을 자리 표시 + 선택 표시
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0x50c878, transparent: true, opacity: 0.45, depthWrite: false });
    const ghostMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ghostMat);
    ghostMesh.rotation.x = -Math.PI / 2;
    ghostMesh.position.y = 1.2;
    ghostMesh.visible = false;
    scene.add(ghostMesh);
    const selMat = new THREE.MeshBasicMaterial({ color: 0xf2b84b, transparent: true, opacity: 0.4, depthWrite: false });
    const selMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), selMat);
    selMesh.rotation.x = -Math.PI / 2;
    selMesh.position.y = 1.0;
    selMesh.visible = false;
    scene.add(selMesh);

    // 카메라: 약한 원근 + 비스듬한 위쪽 시점. 캐릭터를 부드럽게 따라간다.
    const camera = new THREE.PerspectiveCamera(24, 1, 20, 8000);
    const DIST = 1150;
    const EL = (36 * Math.PI) / 180;
    const off = new THREE.Vector3(Math.cos(EL) * 0.7071, Math.sin(EL), Math.cos(EL) * 0.7071).multiplyScalar(DIST);
    const target = new THREE.Vector3(W / 2, 20, (wh + H) / 2);
    const focus = target.clone();
    let focusInit = false;

    const size = { w: 1, h: 1 };
    const resize = () => {
      size.w = host.clientWidth || 1;
      size.h = host.clientHeight || 1;
      renderer.setSize(size.w, size.h, false);
      camera.aspect = size.w / size.h;
      // 화면이 좁으면(세로 모바일) 더 멀리서 본다
      camera.zoom = Math.min(0.95, Math.max(0.34, Math.min(size.w / 1750, size.h / 920)));
      camera.updateProjectionMatrix();
      needs = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // 라벨(이름표, 💬, 문)은 3D 점을 화면 좌표로 바꿔 DOM에 얹는다.
    const v = new THREE.Vector3();
    const place = (el: HTMLElement | null, x: number, y: number, z: number, show = true) => {
      if (!el) return;
      v.set(x, y, z).project(camera);
      el.style.display = show ? "block" : "none";
      el.style.transform = `translate(${((v.x + 1) / 2) * size.w}px, ${((1 - v.y) / 2) * size.h}px) translate(-50%, -100%)`;
    };
    const updateOverlay = () => {
      const l = live.current;
      if (l.residentRect) {
        const rx = l.residentRect.x + CHAR_SIZE / 2;
        const rz = l.residentRect.y + CHAR_SIZE / 2;
        place(nameRef.current, rx, -2, rz, true);
        place(hintRef.current, rx, 70, rz, l.nearResident);
      }
      npcLabels.forEach((l) => place(l.el, l.x, -2, l.z, true));
      place(doorRef.current, room.door.x + room.door.width / 2, 2, H - 6, true);
    };

    // 마우스 -> 바닥 평면 좌표
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const toFloor = (e: PointerEvent): { x: number; y: number } | null => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(plane, hit)) return null;
      return { x: hit.x, y: hit.z };
    };
    const onClick = (e: PointerEvent) => {
      if (!live.current.decorating) return;
      const p = toFloor(e);
      if (p) live.current.onFloorPoint(p, "click");
    };
    const onMove = (e: PointerEvent) => {
      if (!live.current.decorating) return;
      live.current.onFloorPoint(toFloor(e), "move");
    };
    const onLeave = () => live.current.onFloorPoint(null, "move");
    renderer.domElement.addEventListener("click", onClick as unknown as EventListener);
    renderer.domElement.addEventListener("pointermove", onMove as unknown as EventListener);
    renderer.domElement.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const l = live.current;
      const goal = new THREE.Vector3(l.position.x + CHAR_SIZE / 2, 20, l.position.y + CHAR_SIZE / 2);
      // 카메라가 방 가장자리 밖을 너무 보지 않게 방 안쪽으로 살짝 묶는다
      goal.x = THREE.MathUtils.clamp(goal.x, W * 0.12, W * 0.88);
      goal.z = THREE.MathUtils.clamp(goal.z, wh + 40, H - 20);
      if (!focusInit) {
        focus.copy(goal);
        focusInit = true;
        needs = true;
      }
      const k = 1 - Math.exp(-dt * 7);
      if (focus.distanceToSquared(goal) > 0.04) {
        focus.lerp(goal, k);
        needs = true;
      }
      player.position.set(l.position.x + CHAR_SIZE / 2, 0, l.position.y + CHAR_SIZE / 2);
      const mx = l.position.x - prevX;
      const mz = l.position.y - prevZ;
      const movedNow = mx * mx + mz * mz > 0.0004;
      if (movedNow) {
        movingFor = 0;
        playerRig.face(Math.atan2(mx, mz), dt);
        prevX = l.position.x;
        prevZ = l.position.y;
      } else movingFor += dt;
      const walking = movingFor < 0.12;
      playerRig.update(dt, walking);
      // 주민은 가까이 온 플레이어 쪽을 바라본다
      if (residentRig && resident) {
        const dx = player.position.x - resident.position.x;
        const dz = player.position.z - resident.position.z;
        if (dx * dx + dz * dz < 220 * 220) residentRig.face(Math.atan2(dx, dz), dt);
        else residentRig.face(0, dt);
        residentRig.update(dt, false);
      }
      npcRigs.forEach((r) => r.update(dt, false));
      // 서 있는 사람들이 숨 쉬는 모습은 초당 10번만 다시 그려서 부하를 줄인다
      idleAcc += dt;
      if (idleAcc > 0.1 && (npcRigs.length > 0 || residentRig)) {
        idleAcc = 0;
        needs = true;
      }
      // 걷는 동안과 직후(동작이 멈추는 동안)는 계속 그린다
      if (walking || movingFor < 0.5 || (residentRig && Math.abs(residentRig.root.rotation.y) > 0.01)) needs = true;

      const g = l.ghost;
      if (l.decorating && g) {
        ghostMesh.visible = true;
        ghostMesh.position.x = g.x + g.width / 2;
        ghostMesh.position.z = g.y + g.height / 2;
        ghostMesh.scale.set(g.width, g.height, 1);
        ghostMat.color.set(g.bad ? 0xdc5050 : 0x50c878);
      } else ghostMesh.visible = false;
      const sel = l.selectedId ? l.furniture.find((f) => f.id === l.selectedId) : null;
      if (sel && l.decorating) {
        selMesh.visible = true;
        selMesh.position.x = sel.x + sel.width / 2;
        selMesh.position.z = sel.y + sel.height / 2;
        selMesh.scale.set(sel.width + 8, sel.height + 8, 1);
      } else selMesh.visible = false;

      if (needs) {
        camera.position.copy(focus).add(off);
        camera.lookAt(focus);
        camera.updateMatrixWorld();
        renderer.render(scene, camera);
        updateOverlay();
        needs = false;
      }
    };
    raf = requestAnimationFrame(loop);

    resize();
    apiRef.current = { dirty: () => (needs = true), rebuildFurniture, updateOverlay };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("click", onClick as unknown as EventListener);
      renderer.domElement.removeEventListener("pointermove", onMove as unknown as EventListener);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      apiRef.current = null;
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        const kill = (x: THREE.Material) => {
          (x as THREE.MeshStandardMaterial).map?.dispose();
          x.dispose();
        };
        if (Array.isArray(mat)) mat.forEach(kill);
        else if (mat) kill(mat);
      });
      rigs.forEach((r) => r.dispose());
      npcLabels.forEach((l) => l.el.remove());
      renderer.dispose();
      renderer.domElement.remove();
    };
    // 방(건물)이 바뀔 때만 다시 만든다. 위치·가구 같은 나머지는 live ref와 별도 effect로 갱신한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, room.width, room.height, residentId]);

  return (
    <div ref={hostRef} style={{ position: "absolute", inset: 0, cursor: decorating ? "crosshair" : undefined }}>
      {residentName && (
        <>
          <div ref={nameRef} className="roomLabel">
            {residentName}
          </div>
          <div ref={hintRef} className="roomHint">
            💬
          </div>
        </>
      )}
      <div ref={doorRef} className="roomDoorTag">
        문
      </div>
    </div>
  );
}
