"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { CHAR_SIZE, clamp, collidesWithRects, type Point, type Rect } from "@/lib/walk";
import type { Room } from "../../interiors";

// 방 안 사람들의 행동 시뮬레이션: 서 있기 / 의자에 앉기 / 돌아다니기.
// 돌아다니는 사람은 느린 속도로 목적지를 정해 걷고, 가구·벽·다른 사람·플레이어를 피하고(부딪히면 새 목적지),
// 도착하면 잠시 쉰다. 플레이어가 가까이 있거나(대화하려는 중) 대화 중이면 멈춰서 플레이어 쪽을 바라본다.
// 이동·충돌 판정은 플레이어와 같은 평면 좌표이고, 걷는 사람의 현재 위치는 플레이어의 충돌 판정에도 반영된다.

export interface NpcState {
  id: string;
  x: number;
  y: number;
  facing: number; // 라디안, 0 = 화면 아래쪽(+Y)
  walking: boolean;
  sitting: boolean;
}

export function initialNpcStates(room: Room): NpcState[] {
  return room.npcs.map((n) => ({ id: n.id, x: n.x, y: n.y, facing: n.facing ?? 0, walking: false, sitting: n.behavior === "sit" }));
}

const SPEED = 52; // px/s (플레이어는 220)
const STOP_NEAR = 92; // 플레이어가 이 거리 안이면 멈춘다

interface Sim {
  id: string;
  x: number;
  y: number;
  facing: number;
  mode: "stand" | "sit" | "wander";
  area?: { x0: number; y0: number; x1: number; y1: number };
  target: Point | null;
  wait: number;
  stuck: number;
  walking: boolean;
}

export function useRoomNpcs({
  room,
  staticObstacles,
  playerRef,
  paused,
  talkingTo,
  onStates,
}: {
  room: Room;
  staticObstacles: Rect[]; // 벽·가구·건물 담당 주민 등 움직이지 않는 장애물
  playerRef: MutableRefObject<Point>;
  paused: boolean;
  talkingTo: string | null;
  onStates: (s: NpcState[]) => void;
}) {
  const obstaclesRef = useRef(staticObstacles);
  const pausedRef = useRef(paused);
  const talkRef = useRef(talkingTo);
  const emitRef = useRef(onStates);
  useEffect(() => {
    obstaclesRef.current = staticObstacles;
    pausedRef.current = paused;
    talkRef.current = talkingTo;
    emitRef.current = onStates;
  });

  useEffect(() => {
    const sims: Sim[] = room.npcs.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      facing: n.facing ?? 0,
      mode: n.behavior ?? "stand",
      area: n.area,
      target: null,
      wait: 1 + Math.random() * 3,
      stuck: 0,
      walking: false,
    }));
    if (!sims.some((s) => s.mode === "wander")) return;

    const W = room.width;
    const H = room.height;
    const blockers = (self: Sim): Rect[] => {
      const p = playerRef.current;
      return [
        ...obstaclesRef.current,
        { x: p.x - 10, y: p.y - 10, width: CHAR_SIZE + 20, height: CHAR_SIZE + 20 },
        ...sims.filter((o) => o !== self).map((o) => ({ x: o.x, y: o.y, width: CHAR_SIZE, height: CHAR_SIZE })),
      ];
    };
    const pickTarget = (s: Sim): Point | null => {
      const a = s.area;
      if (!a) return null;
      const bl = blockers(s);
      for (let i = 0; i < 12; i++) {
        const x = clamp(a.x0 + Math.random() * (a.x1 - a.x0), 0, W - CHAR_SIZE);
        const y = clamp(a.y0 + Math.random() * (a.y1 - a.y0), 0, H - CHAR_SIZE);
        if (!collidesWithRects(x, y, bl)) return { x, y };
      }
      return null;
    };

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let changed = false;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const p = playerRef.current;
      for (const s of sims) {
        if (s.mode !== "wander") continue;
        const dxp = p.x - s.x;
        const dyp = p.y - s.y;
        const near = dxp * dxp + dyp * dyp < STOP_NEAR * STOP_NEAR;
        const talking = talkRef.current === s.id;
        if (pausedRef.current || near || talking) {
          // 대화하려는 중이면 멈춰서 플레이어를 바라본다
          if (s.walking) changed = true;
          s.walking = false;
          const want = Math.atan2(dxp, dyp);
          if (Math.abs(want - s.facing) > 0.02) {
            let d = want - s.facing;
            d = Math.atan2(Math.sin(d), Math.cos(d));
            s.facing += d * Math.min(1, dt * 6);
            changed = true;
          }
          continue;
        }
        if (s.wait > 0) {
          s.wait -= dt;
          if (s.walking) changed = true;
          s.walking = false;
          continue;
        }
        if (!s.target) {
          s.target = pickTarget(s);
          if (!s.target) s.wait = 1.5;
          continue;
        }
        const dx = s.target.x - s.x;
        const dy = s.target.y - s.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) {
          s.target = null;
          s.wait = 2 + Math.random() * 5;
          s.walking = false;
          changed = true;
          continue;
        }
        const step = Math.min(SPEED * dt, dist);
        const mx = (dx / dist) * step;
        const my = (dy / dist) * step;
        const bl = blockers(s);
        let nx = s.x;
        let ny = s.y;
        const cx = clamp(s.x + mx, 0, W - CHAR_SIZE);
        if (!collidesWithRects(cx, s.y, bl)) nx = cx;
        const cy = clamp(s.y + my, 0, H - CHAR_SIZE);
        if (!collidesWithRects(nx, cy, bl)) ny = cy;
        if (nx === s.x && ny === s.y) {
          s.stuck += dt;
          s.walking = false;
          if (s.stuck > 0.7) {
            s.target = null;
            s.wait = 1 + Math.random() * 2;
            s.stuck = 0;
          }
        } else {
          s.stuck = 0;
          const want = Math.atan2(nx - s.x, ny - s.y);
          let d = want - s.facing;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          s.facing += d * Math.min(1, dt * 8);
          s.x = nx;
          s.y = ny;
          s.walking = true;
          changed = true;
        }
      }
      acc += dt;
      if (changed && acc > 0.05) {
        acc = 0;
        changed = false;
        emitRef.current(sims.map((s) => ({ id: s.id, x: s.x, y: s.y, facing: s.facing, walking: s.walking, sitting: s.mode === "sit" })));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [room, playerRef]);
}
