import * as THREE from "three";

// 주문한 음식/음료의 3D 모델(쟁반 위). 원점은 쟁반 바닥 중앙, 단위는 방/캐릭터와 같은 px.
const std = (c: THREE.ColorRepresentation, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
const shade = <T extends THREE.Mesh>(m: T): T => {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
const cyl = (rt: number, rb: number, h: number, m: THREE.Material, seg = 24) => shade(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m));

export function buildOrderItem(id: string, opts: { tray?: boolean } = {}): THREE.Group {
  const g = new THREE.Group();
  const tray = shade(new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 13), std("#8a6a50", 0.7)));
  tray.position.y = 0.6;
  if (opts.tray ?? true) g.add(tray);
  if (id === "apple") {
    // 사과 두 개
    [[-3.6, 0.4], [3.4, -0.6]].forEach(([x, z]) => {
      const a = shade(new THREE.Mesh(new THREE.SphereGeometry(3.4, 16, 12), std("#d9304a", 0.45)));
      a.scale.set(1, 0.92, 1);
      a.position.set(x, 4.6, z);
      const st = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.4, 6), std("#6b4426", 0.8)));
      st.position.set(x, 8.2, z);
      const lf = shade(new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), std("#5d8a52", 0.6)));
      lf.scale.set(1.5, 0.35, 0.8);
      lf.position.set(x + 1.2, 8.4, z);
      g.add(a, st, lf);
    });
  } else if (id === "bread") {
    // 식빵
    const loaf = shade(new THREE.Mesh(new THREE.BoxGeometry(10, 5, 6), std("#d9a05a", 0.75)));
    loaf.position.y = 3.6;
    const top = shade(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 10, 14, 1, false, 0, Math.PI), std("#c98a42", 0.75)));
    top.rotation.z = Math.PI / 2;
    top.rotation.y = Math.PI / 2;
    top.position.y = 6.1;
    g.add(loaf, top);
  } else if (id === "milk") {
    const carton = shade(new THREE.Mesh(new THREE.BoxGeometry(5.2, 9, 5.2), std("#f4f7fb", 0.5)));
    carton.position.y = 5.2;
    const band = shade(new THREE.Mesh(new THREE.BoxGeometry(5.3, 3, 5.3), std("#5f8fb0", 0.5)));
    band.position.y = 5.6;
    const roof = shade(new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.4, 2.6), std("#e6eef6", 0.5)));
    roof.position.y = 10.4;
    g.add(carton, band, roof);
  } else if (id === "greentea") {
    const bottle = cyl(2.5, 2.6, 10, std("#dcebd2", 0.3), 16);
    bottle.position.y = 5.8;
    const label = cyl(2.62, 2.62, 3.4, std("#5d8a52", 0.5), 16);
    label.position.y = 5.8;
    const cap = cyl(1.2, 1.2, 1.2, std("#2f6b3a", 0.5), 12);
    cap.position.y = 11.2;
    g.add(bottle, label, cap);
  } else if (id === "coffee" || id === "tea") {
    const col = id === "coffee" ? "#6b3f22" : "#c98a3a";
    const saucer = cyl(5.6, 5, 0.7, std("#efe7d8", 0.4));
    saucer.position.y = 1.6;
    const cup = cyl(3.6, 2.8, 4.6, std("#fffaf0", 0.35));
    cup.position.y = 4.2;
    const liq = cyl(3.2, 3.2, 0.3, std(col, 0.3));
    liq.position.y = 6.45;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.45, 8, 14, Math.PI), std("#fffaf0", 0.35));
    handle.position.set(3.6, 4.4, 0);
    handle.rotation.z = -Math.PI / 2;
    g.add(saucer, cup, liq, handle);
  } else {
    const strawberry = id === "cake-strawberry";
    const plate = cyl(6.2, 6.2, 0.7, std("#fffdf8", 0.35));
    plate.position.y = 1.6;
    // 케이크 조각: 부채꼴 기둥 + 크림 + 윗장식
    const slice = shade(new THREE.Mesh(new THREE.CylinderGeometry(5.8, 5.8, 4.4, 20, 1, false, 0, Math.PI / 2.6), std(strawberry ? "#fff3df" : "#f3d98c", 0.7)));
    slice.position.y = 4.2;
    slice.rotation.y = -0.4;
    const crust = shade(new THREE.Mesh(new THREE.CylinderGeometry(5.9, 5.9, 1.2, 20, 1, false, 0, Math.PI / 2.6), std(strawberry ? "#f0d9a8" : "#a8794a", 0.8)));
    crust.position.y = 2.4;
    crust.rotation.y = -0.4;
    const top = shade(new THREE.Mesh(new THREE.CylinderGeometry(5.85, 5.85, 0.8, 20, 1, false, 0, Math.PI / 2.6), std(strawberry ? "#fffdf8" : "#f6e3a0", 0.6)));
    top.position.y = 6.6;
    top.rotation.y = -0.4;
    g.add(plate, slice, crust, top);
    if (strawberry) {
      const s = shade(new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 10), std("#d9304a", 0.5)));
      s.position.set(1.8, 8, 1.4);
      s.scale.y = 1.1;
      g.add(s);
    } else {
      const d = shade(new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), std("#c9594a", 0.5)));
      d.position.set(1.6, 7.6, 1.3);
      g.add(d);
    }
  }
  return g;
}
