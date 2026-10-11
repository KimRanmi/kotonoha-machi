import * as THREE from "three";

// 캐릭터(플레이어·주민)의 3D 모델. three.js 기본 도형(구·캡슐·원통)을 조합한 "스타일화된" 캐릭터다.
// 이 모듈은 방/마을 화면과 독립이라, 나중에 디자이너가 만든 .glb 모델로 바꿀 때는
// createCharacter()만 같은 모양(CharacterRig)을 돌려주도록 구현을 갈아 끼우면 된다.
// 크기 기준: 발바닥이 y=0, 키 약 48(방 데이터의 CHAR_SIZE=32 발자국 기준), 정면은 +Z.

export type HairStyle = "short" | "bob" | "bun" | "spiky" | "cap";
export type Accessory = "none" | "apron" | "hat" | "glasses" | "scarf";

export interface CharacterSpec {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  bottom: string;
  accessory?: Accessory;
  accent?: string; // 소품 색
}

export interface CharacterRig {
  root: THREE.Group;
  /** 매 프레임 호출. moving이면 걷는 동작, 아니면 서서 천천히 멈춘다. */
  update(dt: number, moving: boolean): void;
  /** 바라볼 방향(라디안, +Z 기준)으로 부드럽게 돌아선다. */
  face(angle: number, dt: number): void;
  dispose(): void;
}

// 플레이어 기본 모습
export const PLAYER_SPEC: CharacterSpec = {
  skin: "#f6d3b6",
  hair: "#5a3a28",
  hairStyle: "short",
  top: "#8fb6cf",
  bottom: "#5f6f86",
  accessory: "scarf",
  accent: "#e3a3a6",
};

// 주민별 모습: 건물 id(= 주민 id) 기준. 없으면 id를 해시해서 고른다.
const VILLAGER_SPECS: Record<string, CharacterSpec> = {
  cafe: { skin: "#f6d9c0", hair: "#7a4a2c", hairStyle: "bun", top: "#fffaf0", bottom: "#8a6a50", accessory: "apron", accent: "#c98f7e" },
  shop: { skin: "#efc9a6", hair: "#3a2a20", hairStyle: "cap", top: "#e0a860", bottom: "#4f6a86", accessory: "hat", accent: "#b8573f" },
  hall: { skin: "#f4d6bc", hair: "#8a8a92", hairStyle: "short", top: "#7f9a82", bottom: "#4a5a50", accessory: "glasses", accent: "#6b5a4a" },
};
const FALLBACK: CharacterSpec[] = [
  { skin: "#f6d3b6", hair: "#c9a06a", hairStyle: "bob", top: "#b9aec9", bottom: "#6f6a86", accessory: "scarf", accent: "#f3dc9c" },
  { skin: "#efc9a6", hair: "#2f2a36", hairStyle: "spiky", top: "#a9ca97", bottom: "#5a6a50", accessory: "none" },
  { skin: "#f6d9c0", hair: "#b5655a", hairStyle: "bun", top: "#ecb8b8", bottom: "#7a6a5a", accessory: "glasses", accent: "#8a6a50" },
];

export function specForVillager(id: string): CharacterSpec {
  if (VILLAGER_SPECS[id]) return VILLAGER_SPECS[id];
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

const mat = (c: string, rough = 0.75) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 });

function shadowed<T extends THREE.Mesh>(m: T): T {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function capsule(r: number, len: number, m: THREE.Material): THREE.Mesh {
  return shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), m));
}
function sphere(r: number, m: THREE.Material, sx = 1, sy = 1, sz = 1): THREE.Mesh {
  const s = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), m));
  s.scale.set(sx, sy, sz);
  return s;
}

export function createCharacter(spec: CharacterSpec): CharacterRig {
  const root = new THREE.Group();
  const body = new THREE.Group(); // 걷는 동안 위아래로 살짝 흔들리는 부분
  root.add(body);

  const skin = mat(spec.skin, 0.65);
  const hair = mat(spec.hair, 0.8);
  const top = mat(spec.top);
  const bottom = mat(spec.bottom);
  const shoe = mat("#4a3a30", 0.7);
  const accent = mat(spec.accent ?? "#e3a3a6");

  // 다리 (엉덩이 축에서 회전)
  const mkLeg = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 12, 0);
    const leg = capsule(2.3, 4.6, bottom);
    leg.position.y = -5;
    const foot = sphere(2.7, shoe, 1, 0.65, 1.45);
    foot.position.set(0, -10.2, 1.1);
    pivot.add(leg, foot);
    body.add(pivot);
    return pivot;
  };
  const legL = mkLeg(-3.4);
  const legR = mkLeg(3.4);

  // 몸통
  const torso = capsule(5.6, 5, top);
  torso.position.y = 18.5;
  torso.scale.set(1, 1, 0.82);
  body.add(torso);

  // 팔 (어깨 축에서 회전)
  const mkArm = (x: number, side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 23, 0);
    pivot.rotation.z = side * 0.18;
    const arm = capsule(1.9, 5.4, top);
    arm.position.y = -5;
    const hand = sphere(2, skin);
    hand.position.y = -10.4;
    pivot.add(arm, hand);
    body.add(pivot);
    return pivot;
  };
  const armL = mkArm(-7.4, -1);
  const armR = mkArm(7.4, 1);

  // 머리
  const head = new THREE.Group();
  head.position.y = 34;
  body.add(head);
  head.add(sphere(10, skin, 1, 0.96, 0.98));
  // 얼굴: 점 눈 + 볼 터치 + 작은 입
  const eyeM = mat("#2b1d16", 0.4);
  [-3.7, 3.7].forEach((x) => {
    const e = sphere(1.1, eyeM, 1, 1.25, 0.6);
    e.position.set(x, 0.4, 9.2);
    head.add(e);
    const b = new THREE.Mesh(new THREE.CircleGeometry(1.9, 16), new THREE.MeshBasicMaterial({ color: 0xf08fa4, transparent: true, opacity: 0.55 }));
    b.position.set(x * 1.55, -2.6, 8.35);
    b.rotation.y = Math.sign(x) * 0.5;
    head.add(b);
  });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.22, 6, 12, Math.PI), eyeM);
  mouth.position.set(0, -2.9, 9.4);
  mouth.rotation.z = Math.PI;
  head.add(mouth);

  // 머리 모양
  const dome = (r: number, thetaLen: number) => shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16, 0, Math.PI * 2, 0, thetaLen), hair));
  if (spec.hairStyle === "short" || spec.hairStyle === "cap") {
    const d = dome(10.6, Math.PI * 0.56);
    d.rotation.x = -0.28;
    d.position.set(0, 0.6, -0.4);
    head.add(d);
    if (spec.hairStyle === "short") {
      const fringe = sphere(4.2, hair, 1.8, 0.55, 0.7);
      fringe.position.set(0, 7.2, 6.6);
      head.add(fringe);
    }
  } else if (spec.hairStyle === "bob") {
    const d = dome(10.8, Math.PI * 0.62);
    d.rotation.x = -0.15;
    d.position.set(0, 0.4, -0.5);
    head.add(d);
    [-9.2, 9.2].forEach((x) => {
      const side = sphere(4.2, hair, 0.8, 1.7, 1);
      side.position.set(x, -3, -1.5);
      head.add(side);
    });
  } else if (spec.hairStyle === "bun") {
    const d = dome(10.5, Math.PI * 0.58);
    d.rotation.x = -0.35;
    d.position.set(0, 0.5, -0.6);
    head.add(d);
    const bun = sphere(4.4, hair);
    bun.position.set(0, 10.4, -3.4);
    head.add(bun);
  } else {
    const d = dome(10.4, Math.PI * 0.54);
    d.rotation.x = -0.3;
    d.position.set(0, 0.6, -0.4);
    head.add(d);
    [[-5, 9.2, 0.6], [0, 11, 0], [5, 9.2, 0.6]].forEach(([x, y, z]) => {
      const c = shadowed(new THREE.Mesh(new THREE.ConeGeometry(2.8, 6, 8), hair));
      c.position.set(x, y, z);
      c.rotation.z = -x * 0.08;
      head.add(c);
    });
  }

  // 소품
  const acc = spec.accessory ?? "none";
  if (acc === "apron") {
    const a = shadowed(new THREE.Mesh(new THREE.BoxGeometry(10.4, 10.5, 1.4), mat("#fffdf8")));
    a.position.set(0, 16.2, 4.7);
    body.add(a);
    const s = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.6, 7.5, 1.2), accent));
    s.position.set(-3.2, 23, 4.6);
    const s2 = s.clone();
    s2.position.x = 3.2;
    body.add(s, s2);
  } else if (acc === "hat") {
    const hat = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(7.4, 8.2, 3.8, 24), accent));
    hat.position.set(0, 9.6, 0);
    const brim = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(11.6, 11.6, 0.9, 28), accent));
    brim.position.set(0, 7.9, 0);
    head.add(hat, brim);
  } else if (acc === "glasses") {
    const gm = mat(spec.accent ?? "#6b5a4a", 0.4);
    [-3.9, 3.9].forEach((x) => {
      const r = shadowed(new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.35, 8, 20), gm));
      r.position.set(x, 0.4, 9.6);
      head.add(r);
    });
    const bridge = shadowed(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 0.4), gm));
    bridge.position.set(0, 0.7, 9.8);
    head.add(bridge);
  } else if (acc === "scarf") {
    const sc = shadowed(new THREE.Mesh(new THREE.TorusGeometry(6.2, 1.8, 10, 24), accent));
    sc.position.set(0, 25.6, 0);
    sc.rotation.x = Math.PI / 2;
    body.add(sc);
    const tail = shadowed(new THREE.Mesh(new THREE.BoxGeometry(3, 7, 1.4), accent));
    tail.position.set(2.8, 21.6, 5.2);
    body.add(tail);
  }

  // 애니메이션 상태
  let phase = 0;
  let amp = 0;
  let heading = 0;
  const ownGeoms: THREE.BufferGeometry[] = [];
  const ownMats: THREE.Material[] = [skin, hair, top, bottom, shoe, accent, eyeM];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      ownGeoms.push(m.geometry);
      const mm = m.material as THREE.Material;
      if (!ownMats.includes(mm)) ownMats.push(mm);
    }
  });

  return {
    root,
    update(dt, moving) {
      amp += ((moving ? 1 : 0) - amp) * Math.min(1, dt * 12);
      if (moving) phase += dt * 11;
      const s = Math.sin(phase) * amp;
      legL.rotation.x = s * 0.75;
      legR.rotation.x = -s * 0.75;
      armL.rotation.x = -s * 0.7;
      armR.rotation.x = s * 0.7;
      body.position.y = Math.abs(Math.sin(phase)) * 1.5 * amp;
      body.rotation.z = Math.sin(phase * 0.5) * 0.04 * amp;
    },
    face(angle, dt) {
      let d = angle - heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      heading += d * Math.min(1, dt * 12);
      root.rotation.y = heading;
    },
    dispose() {
      ownGeoms.forEach((g) => g.dispose());
      ownMats.forEach((m) => m.dispose());
    },
  };
}
