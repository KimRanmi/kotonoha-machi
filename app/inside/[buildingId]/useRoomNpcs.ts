"use client";

import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { CHAR_SIZE, clamp, collidesWithRects, type Point, type Rect } from "@/lib/walk";
import { findPath } from "@/lib/path";
import type { Room } from "../../interiors";

// 방 안 사람들의 행동 시뮬레이션: 서 있기 / 의자에 앉기 / 돌아다니기 / 주문 서빙.
// - 돌아다니는 사람은 느린 속도로 목적지를 정해 걷고, 가구·벽·다른 사람·플레이어를 피하고(부딪히면 새 목적지),
//   도착하면 잠시 쉰다. 플레이어가 가까이 있거나(대화하려는 중) 대화 중이면 멈춰서 플레이어 쪽을 바라본다.
// - 서빙(serve)은 길찾기(A*)로 가구를 돌아 "준비하는 곳 → 플레이어 앞 → 원래 자리"로 걷는 일이다.
//   쟁반(carry)을 들고 가서 플레이어 앞에서 건네고, 끝나면 원래 하던 행동으로 돌아간다.
// 이동·충돌 판정은 플레이어와 같은 평면 좌표이고, 사람들의 현재 위치는 플레이어의 충돌 판정에도 반영된다.

export interface NpcState {
  id: string;
  x: number;
  y: number;
  facing: number; // 라디안, 0 = 화면 아래쪽(+Y)
  walking: boolean;
  sitting: boolean;
  carry: string | null; // 들고 있는 주문 품목 id
}

export function initialNpcStates(room: Room): NpcState[] {
  return room.npcs.map((n) => ({ id: n.id, x: n.x, y: n.y, facing: n.facing ?? 0, walking: false, sitting: n.behavior === "sit", carry: null }));
}

const SPEED = 52; // 돌아다니기 (플레이어는 220)
const TASK_SPEED = 92; // 서빙할 때는 조금 빨리
const STOP_NEAR = 92; // 플레이어가 이 거리 안이면 멈춘다

type Step =
  | { k: "go"; to: Point | "player"; speed: number }
  | { k: "wait"; t: number; face?: number }
  | { k: "carry"; item: string | null }
  | { k: "call"; fn: () => void }
  | { k: "face-player" };

interface Task {
  steps: Step[];
  i: number;
  path: Point[] | null;
  goal: Point | null;
  t: number;
  replan: number;
}

interface Sim {
  id: string;
  home: Point;
  x: number;
  y: number;
  facing: number;
  mode: "stand" | "sit" | "wander";
  area?: { x0: number; y0: number; x1: number; y1: number };
  target: Point | null;
  wait: number;
  stuck: number;
  walking: boolean;
  carry: string | null;
  task: Task | null;
}

export interface ServeOptions {
  station: Point; // 준비하는 자리 (직원 좌상단 좌표)
  prepareSeconds?: number;
  onHandover: () => void; // 플레이어에게 건넨 순간
  onDone?: () => void; // 원래 자리로 돌아온 뒤
  onFail?: () => void;
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
  const simsRef = useRef<Sim[]>([]);
  useEffect(() => {
    obstaclesRef.current = staticObstacles;
    pausedRef.current = paused;
    talkRef.current = talkingTo;
    emitRef.current = onStates;
  });

  // 주문 서빙을 시킨다. 이미 다른 일을 하는 중이면 false.
  const serve = useCallback(
    (npcId: string, itemId: string, opts: ServeOptions): boolean => {
      const s = simsRef.current.find((x) => x.id === npcId);
      if (!s || s.task || s.mode === "sit") return false;
      const prep = opts.prepareSeconds ?? 3;
      s.task = {
        steps: [
          { k: "go", to: opts.station, speed: TASK_SPEED },
          { k: "wait", t: prep, face: 0 },
          { k: "carry", item: itemId },
          { k: "go", to: "player", speed: TASK_SPEED },
          { k: "face-player" },
          { k: "wait", t: 0.6 },
          { k: "carry", item: null },
          { k: "call", fn: opts.onHandover },
          { k: "wait", t: 1.2 },
          { k: "go", to: s.home, speed: TASK_SPEED },
          { k: "call", fn: () => opts.onDone?.() },
        ],
        i: 0,
        path: null,
        goal: null,
        t: 0,
        replan: 0,
      };
      s.target = null;
      return true;
    },
    []
  );

  useEffect(() => {
    const sims: Sim[] = room.npcs.map((n) => ({
      id: n.id,
      home: { x: n.x, y: n.y },
      x: n.x,
      y: n.y,
      facing: n.facing ?? 0,
      mode: n.behavior ?? "stand",
      area: n.area,
      target: null,
      wait: 1 + Math.random() * 3,
      stuck: 0,
      walking: false,
      carry: null,
      task: null,
    }));
    simsRef.current = sims;
    if (sims.length === 0) return;

    const W = room.width;
    const H = room.height;
    const bounds = { width: W, height: H };
    const blockers = (self: Sim, withPlayer: boolean): Rect[] => {
      const p = playerRef.current;
      return [
        ...obstaclesRef.current,
        ...(withPlayer ? [{ x: p.x - 10, y: p.y - 10, width: CHAR_SIZE + 20, height: CHAR_SIZE + 20 }] : []),
        ...sims.filter((o) => o !== self).map((o) => ({ x: o.x, y: o.y, width: CHAR_SIZE, height: CHAR_SIZE })),
      ];
    };
    const pickTarget = (s: Sim): Point | null => {
      const a = s.area;
      if (!a) return null;
      const bl = blockers(s, true);
      for (let i = 0; i < 12; i++) {
        const x = clamp(a.x0 + Math.random() * (a.x1 - a.x0), 0, W - CHAR_SIZE);
        const y = clamp(a.y0 + Math.random() * (a.y1 - a.y0), 0, H - CHAR_SIZE);
        if (!collidesWithRects(x, y, bl)) return { x, y };
      }
      return null;
    };
    const turn = (s: Sim, want: number, dt: number, rate = 8) => {
      let d = want - s.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      s.facing += d * Math.min(1, dt * rate);
    };

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let changed = false;

    // 서빙 등 "일"을 한 틱 진행한다.
    const runTask = (s: Sim, dt: number) => {
      const task = s.task!;
      const step = task.steps[task.i];
      if (!step) {
        s.task = null;
        s.walking = false;
        changed = true;
        return;
      }
      const next = () => {
        task.i++;
        task.path = null;
        task.goal = null;
        task.t = 0;
        changed = true;
      };
      if (step.k === "carry") {
        s.carry = step.item;
        next();
      } else if (step.k === "call") {
        step.fn();
        next();
      } else if (step.k === "face-player") {
        const p = playerRef.current;
        s.walking = false;
        turn(s, Math.atan2(p.x - s.x, p.y - s.y), dt, 10);
        changed = true;
        task.t += dt;
        if (task.t > 0.25) next();
      } else if (step.k === "wait") {
        s.walking = false;
        if (step.face !== undefined) turn(s, step.face, dt, 10);
        task.t += dt;
        changed = true;
        if (task.t >= step.t) next();
      } else {
        // go: 길찾기로 목적지(또는 플레이어 앞)까지 걷는다
        const p = playerRef.current;
        const dest: Point = step.to === "player" ? { x: p.x, y: p.y } : step.to;
        const dToDest = Math.hypot(dest.x - s.x, dest.y - s.y);
        const arrived = step.to === "player" ? dToDest < 54 : dToDest < 5;
        if (arrived) {
          s.walking = false;
          next();
          return;
        }
        task.replan -= dt;
        if (!task.path || task.replan <= 0 || !task.goal || Math.hypot(task.goal.x - dest.x, task.goal.y - dest.y) > 48) {
          // 플레이어를 장애물로 보지 않고 길을 찾는다(앞에서 멈추므로)
          const goalPt = step.to === "player" ? { x: dest.x, y: dest.y } : dest;
          task.path = findPath({ x: s.x, y: s.y }, goalPt, [...obstaclesRef.current], bounds);
          task.goal = { ...dest };
          task.replan = 0.7;
          if (!task.path) {
            // 갈 수 없으면 일을 포기하고 집으로 돌아간다
            s.task = null;
            s.carry = null;
            s.target = null;
            s.wait = 1;
            changed = true;
            return;
          }
        }
        const path = task.path;
        while (path.length && Math.hypot(path[0].x - s.x, path[0].y - s.y) < 4) path.shift();
        const wp = path[0] ?? dest;
        const dx = wp.x - s.x;
        const dy = wp.y - s.y;
        const dist = Math.hypot(dx, dy) || 1;
        const stepLen = Math.min(step.speed * dt, dist);
        const bl = blockers(s, false);
        let nx = s.x;
        let ny = s.y;
        const cx = clamp(s.x + (dx / dist) * stepLen, 0, W - CHAR_SIZE);
        if (!collidesWithRects(cx, s.y, bl)) nx = cx;
        const cy = clamp(s.y + (dy / dist) * stepLen, 0, H - CHAR_SIZE);
        if (!collidesWithRects(nx, cy, bl)) ny = cy;
        if (nx === s.x && ny === s.y) {
          s.walking = false;
          task.replan = 0; // 막혔으면 다시 길을 찾는다
        } else {
          turn(s, Math.atan2(nx - s.x, ny - s.y), dt, 10);
          s.x = nx;
          s.y = ny;
          s.walking = true;
          changed = true;
        }
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const p = playerRef.current;
      for (const s of sims) {
        if (s.task) {
          if (!pausedRef.current) runTask(s, dt);
          continue;
        }
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
            turn(s, want, dt, 6);
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
        const stepLen = Math.min(SPEED * dt, dist);
        const bl = blockers(s, true);
        let nx = s.x;
        let ny = s.y;
        const cx = clamp(s.x + (dx / dist) * stepLen, 0, W - CHAR_SIZE);
        if (!collidesWithRects(cx, s.y, bl)) nx = cx;
        const cy = clamp(s.y + (dy / dist) * stepLen, 0, H - CHAR_SIZE);
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
          turn(s, Math.atan2(nx - s.x, ny - s.y), dt, 8);
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
        emitRef.current(sims.map((s) => ({ id: s.id, x: s.x, y: s.y, facing: s.facing, walking: s.walking, sitting: s.mode === "sit", carry: s.carry })));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [room, playerRef]);

  return { serve };
}
