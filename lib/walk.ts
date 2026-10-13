"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 마을 맵과 건물 내부 방이 함께 쓰는 캐릭터 이동/충돌 로직.
// 키 입력 -> requestAnimationFrame 루프 -> 경계/장애물 충돌 처리(X/Y 축을 따로 검사해 벽을
// 따라 미끄러지듯 이동)까지를 한곳에 두고, 무대(마을/방)에 따라 달라지는 값만 인자로 받는다.

export const CHAR_SIZE = 32;
export const MOVE_SPEED = 220; // px / sec

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

const KEY_DIRECTIONS: Record<string, { dx: number; dy: number }> = {
  arrowup: { dx: 0, dy: -1 },
  arrowdown: { dx: 0, dy: 1 },
  arrowleft: { dx: -1, dy: 0 },
  arrowright: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// 캐릭터(CHAR_SIZE) 한 칸이 (x, y)에 놓였을 때 장애물 중 하나와 겹치는지.
export function collidesWithRects(x: number, y: number, obstacles: Rect[]) {
  return obstacles.some((o) =>
    rectsOverlap(x, y, CHAR_SIZE, CHAR_SIZE, o.x, o.y, o.width, o.height)
  );
}

// 캐릭터가 rect의 테두리 밖 margin 거리 안에 들어와 있는지(상호작용 범위 판정).
export function isNearRect(x: number, y: number, rect: Rect, margin: number) {
  return rectsOverlap(
    x,
    y,
    CHAR_SIZE,
    CHAR_SIZE,
    rect.x - margin,
    rect.y - margin,
    rect.width + margin * 2,
    rect.height + margin * 2
  );
}

export function useWalker({
  width,
  height,
  obstacles,
  initial,
  paused = false,
  isometric = false,
}: {
  width: number;
  height: number;
  obstacles: Rect[];
  initial: Point;
  // true면 이동 입력을 무시하고 눌려 있던 키도 비운다(대화 모달이 열려 있을 때 등).
  paused?: boolean;
  // true면 방향키를 "화면 기준"으로 해석한다(비스듬한 시점의 마을: 위쪽 키 = 화면 위쪽).
  // 월드 좌표로는 위=(-1,-1), 아래=(+1,+1), 왼쪽=(-1,+1), 오른쪽=(+1,-1) 대각선이다.
  isometric?: boolean;
}) {
  const [position, setPosition] = useState<Point>(initial);
  const positionRef = useRef(position);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  // rAF 루프/키 핸들러는 마운트 시 한 번만 등록되므로, 최신 값은 ref로 읽는다.
  const obstaclesRef = useRef(obstacles);
  const pausedRef = useRef(paused);
  const sizeRef = useRef({ width, height });
  const isoRef = useRef(isometric);

  useEffect(() => {
    obstaclesRef.current = obstacles;
  }, [obstacles]);

  useEffect(() => {
    isoRef.current = isometric;
  }, [isometric]);

  useEffect(() => {
    sizeRef.current = { width, height };
  }, [width, height]);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) pressedKeysRef.current.clear();
  }, [paused]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // 캐릭터를 즉시 다른 자리로 옮긴다(마을로 돌아올 때 건물 입구 앞에 세우는 등).
  const teleport = useCallback((p: Point) => {
    positionRef.current = p;
    setPosition(p);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (pausedRef.current) return;
      const key = e.key.toLowerCase();
      if (KEY_DIRECTIONS[key]) {
        pressedKeysRef.current.add(key);
        e.preventDefault();
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      pressedKeysRef.current.delete(e.key.toLowerCase());
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    function tick(time: number) {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      // 탭이 백그라운드로 밀리는 등 프레임이 크게 밀렸다가 재개되면 delta가 비정상적으로
      // 커져 한 프레임에 큰 거리를 이동하게 되고, 도착 지점만 검사하는 충돌 처리 특성상
      // 장애물을 그대로 관통(터널링)할 수 있다. 최대 delta를 제한해 이를 방지한다.
      const delta = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      let dx = 0;
      let dy = 0;
      pressedKeysRef.current.forEach((key) => {
        const dir = KEY_DIRECTIONS[key];
        if (dir) {
          dx += dir.dx;
          dy += dir.dy;
        }
      });

      if (isoRef.current) {
        const sx = dx;
        const sy = dy;
        dx = sx + sy;
        dy = sy - sx;
      }

      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy) || 1;
        const moveX = (dx / length) * MOVE_SPEED * delta;
        const moveY = (dy / length) * MOVE_SPEED * delta;

        const { width: w, height: h } = sizeRef.current;
        const current = positionRef.current;
        let nextX = current.x;
        let nextY = current.y;

        const candidateX = clamp(current.x + moveX, 0, w - CHAR_SIZE);
        if (!collidesWithRects(candidateX, current.y, obstaclesRef.current)) {
          nextX = candidateX;
        }

        const candidateY = clamp(current.y + moveY, 0, h - CHAR_SIZE);
        if (!collidesWithRects(nextX, candidateY, obstaclesRef.current)) {
          nextY = candidateY;
        }

        if (nextX !== current.x || nextY !== current.y) {
          positionRef.current = { x: nextX, y: nextY };
          setPosition({ x: nextX, y: nextY });
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, []);

  return { position, positionRef, teleport };
}

// 저장해 둔 좌표를 다시 쓸 때, 그 자리가 범위 밖이거나 장애물과 겹치면 가장 가까운 빈 자리를 찾는다.
// 반경을 조금씩 넓혀 가며 찾고, 끝내 못 찾으면 fallback(기본 시작 위치)을 돌려준다.
export function nearestFreeSpot(
  p: Point,
  size: { width: number; height: number },
  obstacles: Rect[],
  fallback: Point
): Point {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return fallback;
  const maxX = size.width - CHAR_SIZE;
  const maxY = size.height - CHAR_SIZE;
  const isFree = (x: number, y: number) =>
    x >= 0 && y >= 0 && x <= maxX && y <= maxY && !collidesWithRects(x, y, obstacles);

  const start = { x: clamp(p.x, 0, maxX), y: clamp(p.y, 0, maxY) };
  if (isFree(start.x, start.y)) return start;

  const STEP = 8;
  const MAX_RADIUS = 240;
  for (let r = STEP; r <= MAX_RADIUS; r += STEP) {
    let best: Point | null = null;
    let bestDist = Infinity;
    for (let dx = -r; dx <= r; dx += STEP) {
      for (let dy = -r; dy <= r; dy += STEP) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // 이번 반경의 테두리만 본다
        const x = start.x + dx;
        const y = start.y + dy;
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist && isFree(x, y)) {
          best = { x, y };
          bestDist = dist;
        }
      }
    }
    if (best) return best;
  }
  return fallback;
}
