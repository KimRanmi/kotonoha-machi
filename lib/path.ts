import { CHAR_SIZE, collidesWithRects, type Point, type Rect } from "@/lib/walk";

// 방 안 사람들이 가구·벽을 돌아서 걷게 하는 길찾기(A*). 캐릭터(CHAR_SIZE 한 칸)의 좌상단 좌표를
// 격자(cell px)로 나눠, 장애물과 겹치는 칸은 막힌 칸으로 본다. 8방향 이동, 모서리 끼어들기 금지.
// 결과는 좌상단 좌표 목록(시작 칸 제외, 마지막은 목표 근처의 갈 수 있는 칸)이고, 못 가면 null이다.

export function findPath(
  from: Point,
  to: Point,
  obstacles: Rect[],
  bounds: { width: number; height: number },
  cell = 8
): Point[] | null {
  const cols = Math.floor((bounds.width - CHAR_SIZE) / cell) + 1;
  const rows = Math.floor((bounds.height - CHAR_SIZE) / cell) + 1;
  const blockedCache = new Map<number, boolean>();
  const blocked = (cx: number, cy: number) => {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return true;
    const k = cy * cols + cx;
    let b = blockedCache.get(k);
    if (b === undefined) {
      b = collidesWithRects(cx * cell, cy * cell, obstacles);
      blockedCache.set(k, b);
    }
    return b;
  };
  const clampC = (v: number, max: number) => Math.min(Math.max(v, 0), max - 1);
  const sx = clampC(Math.round(from.x / cell), cols);
  const sy = clampC(Math.round(from.y / cell), rows);
  let gx = clampC(Math.round(to.x / cell), cols);
  let gy = clampC(Math.round(to.y / cell), rows);

  // 목표 칸이 막혀 있으면 가장 가까운 빈 칸으로 바꾼다.
  if (blocked(gx, gy)) {
    let found = false;
    for (let r = 1; r <= 6 && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (!blocked(gx + dx, gy + dy)) {
            gx += dx;
            gy += dy;
            found = true;
          }
        }
      }
    }
    if (!found) return null;
  }

  const key = (x: number, y: number) => y * cols + x;
  const g = new Map<number, number>([[key(sx, sy), 0]]);
  const prev = new Map<number, number>();
  const open: { k: number; x: number; y: number; f: number }[] = [{ k: key(sx, sy), x: sx, y: sy, f: 0 }];
  const closed = new Set<number>();
  const h = (x: number, y: number) => Math.hypot(x - gx, y - gy);
  let guard = 0;
  while (open.length && guard++ < 30000) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (closed.has(cur.k)) continue;
    closed.add(cur.k);
    if (cur.x === gx && cur.y === gy) {
      const out: Point[] = [];
      let k = cur.k;
      while (k !== key(sx, sy)) {
        out.push({ x: (k % cols) * cell, y: Math.floor(k / cols) * cell });
        const p = prev.get(k);
        if (p === undefined) break;
        k = p;
      }
      return out.reverse();
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (blocked(nx, ny)) continue;
        if (dx && dy && (blocked(cur.x + dx, cur.y) || blocked(cur.x, cur.y + dy))) continue;
        const nk = key(nx, ny);
        if (closed.has(nk)) continue;
        const ng = (g.get(cur.k) ?? 0) + (dx && dy ? 1.414 : 1);
        if (ng < (g.get(nk) ?? Infinity)) {
          g.set(nk, ng);
          prev.set(nk, cur.k);
          open.push({ k: nk, x: nx, y: ny, f: ng + h(nx, ny) });
        }
      }
    }
  }
  return null;
}
