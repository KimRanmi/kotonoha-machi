import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Furniture, Room } from "../../../interiors";

// 건물 내부 방의 진짜 3D 모델. 좌표 규칙: 방의 평면 좌표 (x, y)가 three.js의 (X, Z), 위쪽이 Y.
// 단위는 방 데이터와 같은 px이다(캐릭터 CHAR_SIZE = 32). 이동·충돌·꾸미기 판정은 방 데이터 그대로이고
// 여기서는 눈에 보이는 모양만 만든다. 이미지 파일은 쓰지 않고, 마루 결 같은 질감은 캔버스로 그린다.

export const WALL_H = 190;

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
export function mixColor(a: string, b: string, t: number): THREE.Color {
  return new THREE.Color().copy(tmpA.set(a)).lerp(tmpB.set(b), t);
}
const std = (color: THREE.ColorRepresentation, roughness = 0.7, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function rbox(w: number, h: number, d: number, r: number, m: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.max(0.1, Math.min(r, Math.min(w, h, d) / 2 - 0.05))), m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function cyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 32): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function put<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.position.set(x, y, z);
  return o;
}

// ───────── 질감 (캔버스로 그린다) ─────────
function woodTexture(base: string): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const planks = 8;
  const ph = size / planks;
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < planks; i++) {
    const shade = (rnd() - 0.5) * 0.12;
    g.fillStyle = `#${mixColor(base, shade > 0 ? "#ffffff" : "#5a3a20", Math.abs(shade)).getHexString()}`;
    g.fillRect(0, i * ph, size, ph);
    for (let k = 0; k < 14; k++) {
      g.strokeStyle = `rgba(90,55,25,${0.05 + rnd() * 0.07})`;
      g.lineWidth = 1 + rnd() * 1.4;
      const y = i * ph + rnd() * ph;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(size * 0.3, y + (rnd() - 0.5) * 6, size * 0.6, y + (rnd() - 0.5) * 6, size, y + (rnd() - 0.5) * 4);
      g.stroke();
    }
    g.fillStyle = "rgba(60,35,15,0.35)";
    g.fillRect(0, i * ph, size, 1.6);
    const jx = rnd() * size;
    g.fillRect(jx, i * ph, 1.4, ph);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function emojiSprite(emoji: string): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.font = "100px serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(emoji, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.center.set(0.5, 0.08);
  s.scale.set(54, 54, 1);
  s.position.y = 0;
  return s;
}

export function shadowBlob(r = 15): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color: 0x2a1a0e, transparent: true, opacity: 0.28, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.6;
  return m;
}

// ───────── 방 껍데기: 바닥, 벽, 몰딩, 창, 커튼, 깔개, 빛 ─────────
export function buildShell(room: Room): THREE.Group {
  const g = new THREE.Group();
  const W = room.width;
  const H = room.height;
  const wh = room.wallHeight;
  const kind = room.id;
  const wallC = mixColor(room.wallColor, "#f7efe0", 0.62);
  const wallL = wallC.clone().multiplyScalar(0.93);
  const wains = mixColor(room.wallColor, "#8a6a50", 0.35);
  const floorBase = `#${mixColor(room.floorColor, "#c9a374", 0.45).getHexString()}`;

  // 바닥
  const tex = woodTexture(floorBase);
  tex.repeat.set(W / 256, (H - wh) / 256);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H - wh), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.02 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(W / 2, 0, (wh + H) / 2);
  floor.receiveShadow = true;
  floor.name = "floor";
  g.add(floor);
  // 바닥 두께(앞쪽 두 면)
  const slabM = std("#c9a77c", 0.8);
  g.add(put(new THREE.Mesh(new THREE.BoxGeometry(W, 16, 6), slabM), W / 2, -8, H + 3));
  g.add(put(new THREE.Mesh(new THREE.BoxGeometry(6, 16, H - wh), slabM), W + 3, -8, (wh + H) / 2));

  // 벽 두 면(안쪽 오른쪽 = z=wh, 안쪽 왼쪽 = x=0)
  const wallM = std(wallC, 0.95);
  const wallLM = std(wallL, 0.95);
  const back = new THREE.Mesh(new THREE.BoxGeometry(W + 8, WALL_H, 8), wallM);
  back.position.set(W / 2 - 4, WALL_H / 2, wh - 4);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(8, WALL_H, H - wh + 8), wallLM);
  left.position.set(-4, WALL_H / 2, (wh - 8 + H) / 2);
  left.receiveShadow = true;
  g.add(left);

  const trim = std("#fff8ec", 0.6);
  const panel = std(wains, 0.8);
  // 웨인스콧 패널 + 레일 + 걸레받이 + 몰딩 (두 벽)
  const addBand = (len: number, h: number, th: number, y: number, mat: THREE.Material, alongX: boolean) => {
    const m = rbox(alongX ? len : th, h, alongX ? th : len, 0.8, mat);
    if (alongX) m.position.set(len / 2, y, wh + th / 2);
    else m.position.set(th / 2, y, wh + len / 2);
    g.add(m);
  };
  addBand(W, 56, 3, 28, panel, true);
  addBand(H - wh, 56, 3, 28, std(wains.clone().multiplyScalar(0.9), 0.8), false);
  addBand(W, 5, 5, 58, trim, true);
  addBand(H - wh, 5, 5, 58, trim, false);
  addBand(W, 12, 4.5, 6, trim, true);
  addBand(H - wh, 12, 4.5, 6, trim, false);
  addBand(W, 12, 7, WALL_H - 6, trim, true);
  addBand(H - wh, 12, 7, WALL_H - 6, trim, false);

  // 창문(안쪽 오른쪽 벽): 틀 + 발광 유리 + 십자 살 + 창턱 + 커튼
  const winW = 110;
  const winH = 74;
  const winY = 118;
  const xs = [W * 0.16, W * 0.56];
  const glassM = new THREE.MeshStandardMaterial({ color: 0xcfeaf4, emissive: 0xbfe0ec, emissiveIntensity: 0.9, roughness: 0.2 });
  const curtainM = std("#c98f7e", 0.9);
  xs.forEach((x0) => {
    const cx = x0 + winW / 2;
    g.add(put(rbox(winW + 16, winH + 16, 5, 1.5, trim), cx, winY, wh + 2.5));
    g.add(put(new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), glassM), cx, winY, wh + 5.2));
    g.add(put(rbox(3, winH, 3, 0.6, trim), cx, winY, wh + 6.2));
    g.add(put(rbox(winW, 3, 3, 0.6, trim), cx, winY, wh + 6.2));
    g.add(put(rbox(winW + 26, 5, 14, 1.5, trim), cx, winY - winH / 2 - 10, wh + 8));
    g.add(put(rbox(32, winH + 34, 9, 3, curtainM), x0 - 14, winY + 6, wh + 8));
    g.add(put(rbox(32, winH + 34, 9, 3, curtainM), x0 + winW + 14, winY + 6, wh + 8));
    g.add(put(cyl(2, 2, winW + 90, std("#8a6a50", 0.5), 12), cx, winY + winH / 2 + 22, wh + 9));
    (g.children[g.children.length - 1] as THREE.Mesh).rotation.z = Math.PI / 2;
    // 창에서 들어오는 빛 자락
    const lg = new THREE.BufferGeometry();
    const p = (x: number, z: number) => [x, 0.5, z];
    const v = [...p(x0 + 6, wh), ...p(x0 + winW, wh), ...p(x0 + winW + 150, wh + 260), ...p(x0 + 156, wh + 260)];
    lg.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    lg.setIndex([0, 2, 1, 0, 3, 2]);
    g.add(new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ color: 0xfff1c9, transparent: true, opacity: 0.16, depthWrite: false })));
  });

  // 방 종류별 벽 장식
  const frame = (cx: number, y: number, w: number, h: number, inner: string, onLeft = false) => {
    const m = new THREE.Group();
    m.add(put(rbox(w + 8, h + 8, 4, 1, std("#8a6a50", 0.6)), 0, 0, 0));
    m.add(put(new THREE.Mesh(new THREE.PlaneGeometry(w, h), std(inner, 0.9)), 0, 0, 2.2));
    if (onLeft) {
      m.rotation.y = Math.PI / 2;
      m.position.set(0, y, cx);
    } else m.position.set(cx, y, wh + 2.5);
    g.add(m);
  };
  if (kind === "cafe") frame(W * 0.46, 112, 44, 50, "#33473a");
  else if (kind === "shop") frame(W * 0.46, 128, 70, 24, "#b5655a");
  else if (kind === "hall") frame(W * 0.47, 112, 78, 60, "#d8c19a");
  else if (kind === "home") frame(W * 0.46, 118, 62, 46, "#d9e8d0");
  frame(wh + (H - wh) * 0.4 + 35, 116, 60, 52, "#a9c6cb", true);

  // 깔개 + 문 앞 매트
  const rugColor = kind === "cafe" ? "#c98f7e" : kind === "shop" ? "#9ec0c6" : kind === "hall" ? "#a8b99a" : kind === "home" ? "#c9a0b8" : "#b9a89a";
  const rugX = W * 0.5;
  const rugZ = H * 0.64;
  const rw = W * 0.32;
  const rd = (H - wh) * 0.3;
  g.add(put(rbox(rw, 1.6, rd, 0.8, std(rugColor, 1)), rugX, 0.9, rugZ));
  g.add(put(rbox(rw - 22, 1.8, rd - 22, 0.8, std(mixColor(rugColor, "#ffffff", 0.3), 1)), rugX, 1, rugZ));
  g.add(put(rbox(rw - 46, 2, rd - 46, 0.8, std(rugColor, 1)), rugX, 1.1, rugZ));
  g.add(put(rbox(room.door.width - 12, 2, 74, 1, std("#8f6a4a", 1)), room.door.x + room.door.width / 2, 1, H - 40));

  // 벽에 붙은 가구(칠판 등)
  room.furniture
    .filter((f) => f.y + f.height <= wh)
    .forEach((f) => {
      const cx = f.x + f.width / 2;
      g.add(put(rbox(f.width + 14, 92, 5, 1.5, std("#8a6a50", 0.6)), cx, 104, wh + 2.5));
      g.add(put(new THREE.Mesh(new THREE.PlaneGeometry(f.width, 76), std(f.color, 0.9)), cx, 104, wh + 5.2));
      [0.2, 0.5, 0.78].forEach((u, i) => g.add(put(new THREE.Mesh(new THREE.PlaneGeometry(30, 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 })), f.x + f.width * u + 15, 112 - i * 12, wh + 5.4)));
    });

  return g;
}

// ───────── 가구 ─────────
const BOOK_COLORS = ["#b5655a", "#6f8fa3", "#d4b46a", "#7f9a72", "#8d7aa8", "#c98a5a"];

function chairModel(wood: THREE.Color, backDir: [number, number]): THREE.Group {
  const g = new THREE.Group();
  const m = std(wood, 0.65);
  g.add(put(rbox(24, 5, 24, 1.6, m), 0, 22, 0));
  [[-9, -9], [9, -9], [-9, 9], [9, 9]].forEach(([x, z]) => g.add(put(cyl(1.7, 1.4, 20, m, 10), x, 10, z)));
  g.add(put(rbox(24, 28, 3, 1.2, m), 0, 38, -10.5));
  g.add(put(rbox(18, 3, 2.4, 0.8, std(wood.clone().multiplyScalar(0.85), 0.65)), 0, 44, -10.4));
  g.rotation.y = Math.atan2(-backDir[0], -backDir[1]);
  return g;
}

function cupModel(color = "#fffaf0"): THREE.Group {
  const g = new THREE.Group();
  g.add(put(cyl(7, 7, 1, std("#efe7d8", 0.4), 20), 0, 0.5, 0));
  g.add(put(cyl(4.4, 3.4, 6, std(color, 0.35), 20), 0, 4, 0));
  g.add(put(cyl(3.9, 3.9, 0.4, std("#6b3f22", 0.3), 20), 0, 6.9, 0));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.55, 8, 14, Math.PI), std(color, 0.35));
  handle.position.set(4.4, 4.2, 0);
  handle.rotation.z = -Math.PI / 2;
  g.add(handle);
  g.traverse((o) => ((o as THREE.Mesh).isMesh ? (((o as THREE.Mesh).castShadow = true), ((o as THREE.Mesh).receiveShadow = true)) : 0));
  return g;
}

export function buildFurniture(f: Furniture, kind: string): THREE.Group {
  const g = new THREE.Group();
  const cx = f.x + f.width / 2;
  const cz = f.y + f.height / 2;
  g.position.set(cx, 0, cz);
  const wood = mixColor(f.color, "#a9784a", 0.45);
  const dark = mixColor(f.color, "#7a5232", 0.55);
  const woodM = std(wood, 0.6);
  const darkM = std(dark, 0.65);
  const id = f.id;
  const w = f.width;
  const d = f.height;

  if (f.shape === "round" && id !== "plant") {
    const r = w / 2;
    g.add(put(cyl(r * 0.42, r * 0.46, 3, darkM, 36), 0, 1.5, 0));
    g.add(put(cyl(5, 6.5, 34, darkM, 16), 0, 19, 0));
    g.add(put(cyl(r, r, 4, woodM, 48), 0, 38, 0));
    g.add(put(cyl(r + 0.6, r + 0.6, 1.2, std(wood.clone().multiplyScalar(0.8), 0.6), 48), 0, 36.2, 0));
    const c1 = put(cupModel(), 6, 40, -4);
    const c2 = put(cupModel("#f3e4cf"), -10, 40, 7);
    g.add(c1, c2);
    // 의자: 테이블 가장자리 바깥에 놓고, 등받이는 테이블 반대쪽을 향한다
    ([[0, -1], [1, 0], [-1, 0]] as [number, number][]).forEach(([bx, bz]) => g.add(put(chairModel(dark, [bx, bz]), bx * (r + 8), 0, bz * (r + 8))));
    return g;
  }

  if (id === "plant") {
    g.add(put(cyl(13, 9, 22, std("#b86f4a", 0.7), 24), 0, 11, 0));
    g.add(put(cyl(14, 14, 3, std("#d18a60", 0.7), 24), 0, 22, 0));
    g.add(put(cyl(11, 11, 1, std("#4a3322", 1), 20), 0, 23.4, 0));
    const leafColors = ["#5d8a52", "#6f9c5f", "#4f7a47"];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), std(leafColors[i % 3], 0.6));
      leaf.scale.set(5, 17 + (i % 3) * 3, 1.6);
      leaf.position.set(Math.cos(a) * 9, 36 + (i % 3) * 4, Math.sin(a) * 9);
      leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      leaf.castShadow = true;
      g.add(leaf);
    }
    return g;
  }

  if (id === "bed") {
    // 머리판은 위쪽(작은 z) 쪽
    g.add(put(rbox(w, 14, d, 2, darkM), 0, 7, 0));
    g.add(put(rbox(w - 6, 12, d - 6, 3, std("#f4efe6", 0.9)), 0, 20, 0));
    g.add(put(rbox(w - 5, 5, d * 0.62, 2.4, std(f.color, 0.95)), 0, 28, d * 0.18));
    g.add(put(rbox(w / 2 - 8, 7, 24, 3.4, std("#fffdf8", 0.95)), -w / 4, 30, -d / 2 + 22));
    g.add(put(rbox(w / 2 - 8, 7, 24, 3.4, std("#fffdf8", 0.95)), w / 4, 30, -d / 2 + 22));
    g.add(put(rbox(w, 52, 7, 2, darkM), 0, 26, -d / 2 + 3));
    return g;
  }

  if (id === "chair") {
    g.add(chairModel(dark, [0, -1]));
    return g;
  }

  if (id.startsWith("shelf")) {
    const Hh = 104;
    const stock = kind === "shop";
    g.add(put(rbox(w, Hh, 4, 1, darkM), 0, Hh / 2, -d / 2 + 2));
    g.add(put(rbox(5, Hh, d, 1, darkM), -w / 2 + 2.5, Hh / 2, 0));
    g.add(put(rbox(5, Hh, d, 1, darkM), w / 2 - 2.5, Hh / 2, 0));
    for (let i = 0; i <= 4; i++) g.add(put(rbox(w - 4, 3, d - 2, 0.8, woodM), 0, 2 + i * 24, 0));
    for (let i = 0; i < 4; i++) {
      const y0 = 3.5 + i * 24;
      if (stock) {
        for (let j = 0; j < 6; j++) {
          const gx = -w / 2 + 14 + j * ((w - 28) / 5);
          const col = ["#c0584a", "#d9b85a", "#6f9a72", "#6f8fb0"][(i + j) % 4];
          if ((i + j) % 2) g.add(put(cyl(4.6, 4.6, 14, std(col, 0.45), 14), gx, y0 + 7, 2));
          else g.add(put(rbox(9, 13, 8, 1.2, std(col, 0.6)), gx, y0 + 6.5, 2));
        }
      } else {
        let x = -w / 2 + 7;
        let n = 0;
        while (x < w / 2 - 12) {
          const bw = 4.5 + ((n * 7 + i * 3) % 4);
          const bh = 15 + ((n * 5 + i) % 5) * 1.4;
          g.add(put(rbox(bw, bh, d * 0.62, 0.5, std(BOOK_COLORS[(n + i) % BOOK_COLORS.length], 0.7)), x + bw / 2, y0 + bh / 2, 1));
          x += bw + 0.6;
          n++;
        }
      }
    }
    return g;
  }

  if (id === "showcase") {
    // 케이크 쇼케이스: 나무 하부장 + 유리 케이스(2단) + 조명 + 케이크들
    const baseH = 26;
    g.add(put(rbox(w, baseH, d, 2, darkM), 0, baseH / 2, 0));
    g.add(put(rbox(w + 4, 3, d + 4, 1, std("#f1e6d2", 0.4)), 0, baseH + 1.5, 0));
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0xdff0f6, transparent: true, opacity: 0.2, roughness: 0.04, side: THREE.DoubleSide, depthWrite: false });
    const caseH = 40;
    const cy0 = baseH + 3;
    g.add(put(new THREE.Mesh(new THREE.BoxGeometry(w - 2, caseH, d - 2), glassM), 0, cy0 + caseH / 2, 0));
    const frame = std("#cfcac0", 0.3, 0.6);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(put(cyl(1, 1, caseH, frame, 8), (sx * (w - 3)) / 2, cy0 + caseH / 2, (sz * (d - 3)) / 2)));
    g.add(put(rbox(w, 2.4, d, 0.8, std("#f1ece2", 0.4)), 0, cy0 + caseH + 1.2, 0));
    // 안쪽 조명(발광)
    g.add(put(new THREE.Mesh(new THREE.BoxGeometry(w - 10, 0.8, 5), new THREE.MeshStandardMaterial({ color: 0xfff2d0, emissive: 0xffe9b0, emissiveIntensity: 1.4 })), 0, cy0 + caseH - 1, -d / 2 + 8));
    // 유리 선반 + 케이크
    for (let lv = 0; lv < 2; lv++) {
      const sy = cy0 + 1 + lv * 18;
      g.add(put(rbox(w - 6, 1.2, d - 6, 0.4, std("#e6f1f5", 0.2)), 0, sy, 0));
      const cakeDefs: [number, string, string][] = [[-w / 3, "#fff3df", "#d9304a"], [0, "#f3d98c", "#a8794a"], [w / 3, "#f4d4dc", "#f6e8c8"]];
      cakeDefs.forEach(([cx, body, top], i) => {
        const cake = new THREE.Group();
        cake.add(put(cyl(8, 8, 7, std(body, 0.7), 24), 0, 4.1, 0));
        cake.add(put(cyl(8.1, 8.1, 1.4, std(top, 0.6), 24), 0, 7.9, 0));
        if (i === 0) [[-3, 1], [3, -1], [0, 4]].forEach(([bx, bz]) => cake.add(put(new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), std("#d9304a", 0.5)), bx, 9.6, bz)));
        cake.position.set(cx, sy + 0.6, lv ? -4 : 3);
        cake.traverse((o) => ((o as THREE.Mesh).isMesh ? (((o as THREE.Mesh).castShadow = true), ((o as THREE.Mesh).receiveShadow = true)) : 0));
        g.add(cake);
      });
    }
    return g;
  }

  if (id === "cooler") {
    // 음료 냉장 쇼케이스: 흰 본체 + 유리문 + 음료 병 + 조명
    const Hh = 100;
    g.add(put(rbox(w, Hh, d, 2, std("#f1f3f4", 0.4)), 0, Hh / 2, 0));
    g.add(put(new THREE.Mesh(new THREE.BoxGeometry(w - 10, Hh - 16, 1), new THREE.MeshStandardMaterial({ color: 0x1f2b33, emissive: 0x9fd4e6, emissiveIntensity: 0.35, roughness: 0.4 })), 0, Hh / 2 - 2, d / 2 + 0.2));
    for (let lv = 0; lv < 4; lv++) {
      for (let j = 0; j < 4; j++) {
        const col = ["#d9604c", "#e0b84a", "#5f8f6a", "#5f8fb0"][(lv + j) % 4];
        g.add(put(cyl(2.6, 2.6, 10, std(col, 0.4), 12), -w / 2 + 11 + j * ((w - 22) / 3), 14 + lv * 20, d / 2 + 1.4));
      }
    }
    g.add(put(new THREE.Mesh(new THREE.BoxGeometry(w - 8, 4, 1.2), new THREE.MeshStandardMaterial({ color: 0xfff2d0, emissive: 0xffe9b0, emissiveIntensity: 1.1 })), 0, Hh - 5, d / 2 + 0.4));
    return g;
  }

  if (id.startsWith("display")) {
    g.add(put(rbox(w, 26, d, 2, darkM), 0, 13, 0));
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w - 4, 28, d - 4), new THREE.MeshPhysicalMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.28, roughness: 0.05, transmission: 0.0 }));
    glass.position.set(0, 40, 0);
    g.add(glass);
    g.add(put(rbox(w, 2, d, 1, std("#ffffff", 0.3)), 0, 55, 0));
    [[-w / 4, 0xd9a05a], [w / 4, 0xc0584a]].forEach(([x, c]) => g.add(put(cyl(7, 7, 12, std(c as number, 0.5), 18), x as number, 32, 0)));
    return g;
  }

  if (id === "counter" || id === "register") {
    const Hh = 46;
    g.add(put(rbox(w, Hh, d, 2, darkM), 0, Hh / 2, 0));
    const n = Math.max(2, Math.round(w / 56));
    for (let i = 0; i < n; i++) {
      const pw = (w - 10) / n;
      g.add(put(rbox(pw - 6, Hh - 16, 1.4, 0.5, std(dark.clone().lerp(new THREE.Color("#ffffff"), 0.1), 0.6)), -w / 2 + 5 + pw * (i + 0.5), Hh / 2, d / 2 + 0.2));
    }
    g.add(put(rbox(w + 6, 5, d + 8, 1.6, std(mixColor(f.color, "#d9b88a", 0.6), 0.45)), 0, Hh + 2.5, 2));
    if (id === "counter") {
      const steel = std("#c9c4bb", 0.3, 0.6);
      g.add(put(rbox(30, 30, 24, 2, steel), -w / 2 + 40, Hh + 20, 0));
      g.add(put(cyl(2.4, 2.4, 8, std("#5a4a3a", 0.6), 10), -w / 2 + 40, Hh + 11, 9));
      g.add(put(cupModel(), -w / 2 + 120, Hh + 5, 4));
      g.add(put(cupModel("#f3e4cf"), -w / 2 + 150, Hh + 5, 6));
      g.add(put(cyl(14, 14, 2, std("#e9e1d3", 0.4), 24), w / 2 - 36, Hh + 6, 2));
      g.add(put(cyl(8, 8, 8, std("#e9a3a0", 0.7), 20), w / 2 - 36, Hh + 11, 2));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(11, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.3, roughness: 0.05 }));
      dome.position.set(w / 2 - 36, Hh + 7, 2);
      g.add(dome);
    } else {
      g.add(put(rbox(28, 16, 22, 2, std("#4f4a44", 0.5)), 0, Hh + 13, 0));
      const scr = rbox(22, 16, 3, 1, std("#6a645c", 0.4));
      scr.position.set(0, Hh + 30, -4);
      scr.rotation.x = -0.25;
      g.add(scr);
      g.add(put(new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshStandardMaterial({ color: 0xa9d4a0, emissive: 0x7fb97a, emissiveIntensity: 0.6 })), 0, Hh + 30, -2.4));
      (g.children[g.children.length - 1] as THREE.Mesh).rotation.x = -0.25;
    }
    return g;
  }

  if (id.startsWith("desk") || id === "meeting") {
    const topY = 34;
    g.add(put(rbox(w, 5, d, 1.6, woodM), 0, topY + 2.5, 0));
    [[-w / 2 + 6, -d / 2 + 6], [w / 2 - 6, -d / 2 + 6], [-w / 2 + 6, d / 2 - 6], [w / 2 - 6, d / 2 - 6]].forEach(([x, z]) => g.add(put(rbox(5, topY, 5, 1, darkM), x, topY / 2, z)));
    if (id === "meeting") {
      for (let i = 0; i < 4; i++) {
        const px = -w / 2 + 36 + i * ((w - 72) / 3);
        g.add(put(chairModel(dark, [0, -1]), px, 0, -d / 2 - 14));
        g.add(put(chairModel(dark, [0, 1]), px, 0, d / 2 + 14));
      }
      g.add(put(rbox(24, 0.8, 18, 0.2, std("#fffaf0", 0.9)), -26, topY + 5.4, 3));
      g.add(put(rbox(26, 0.8, 18, 0.2, std("#f3ecdc", 0.9)), 30, topY + 5.4, -2));
    } else {
      g.add(put(rbox(w * 0.28, topY - 6, d - 12, 1.2, darkM), -w / 2 + w * 0.17, (topY - 6) / 2 + 2, 0));
      for (const yy of [10, 24]) g.add(put(rbox(14, 2, 1.4, 0.4, std("#d9c9a0", 0.4, 0.4)), -w / 2 + w * 0.17, yy, d / 2 - 5.5));
      g.add(put(rbox(26, 0.9, 20, 0.2, std("#fffaf0", 0.9)), w / 2 - 36, topY + 5.5, 0));
      const book = rbox(14, 2.4, 10, 0.5, std("#c9594a", 0.7));
      book.position.set(w / 2 - 32, topY + 7, 2);
      book.rotation.y = 0.3;
      g.add(book);
      g.add(put(chairModel(dark, [0, 1]), 0, 0, d / 2 + 16));
    }
    return g;
  }

  g.add(put(rbox(w, 34, d, 2, woodM), 0, 17, 0));
  return g;
}
