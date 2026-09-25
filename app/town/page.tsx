"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./town.module.css";
import { BUILDINGS } from "./buildings";
import { BuildingMarker } from "./BuildingMarker";

// 맵/캐릭터 기본 수치. 이번 범위는 "하나로 이어진 오픈맵 위에서 자유롭게 걸어다니기"까지이며
// 실제 아트 에셋, 건물 기능, 대화 연동 등은 이후 단계에서 다룬다.
// 건물 목록/타입은 ./buildings, 건물 한 채의 렌더링은 ./BuildingMarker 에 분리해뒀다 —
// 건물별 기능을 추가할 때 이동/충돌을 다루는 이 파일을 건드릴 필요가 없도록 하기 위함이다.
const MAP_WIDTH = 960;
const MAP_HEIGHT = 640;
const CHAR_SIZE = 32;
const MOVE_SPEED = 220; // px / sec

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function rectsOverlap(
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

function collidesWithBuildings(x: number, y: number) {
  return BUILDINGS.some((b) =>
    rectsOverlap(x, y, CHAR_SIZE, CHAR_SIZE, b.x, b.y, b.width, b.height)
  );
}

export default function TownPage() {
  const [position, setPosition] = useState({
    x: MAP_WIDTH / 2 - CHAR_SIZE / 2,
    y: MAP_HEIGHT / 2 - CHAR_SIZE / 2,
  });
  const positionRef = useRef(position);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // 키보드 입력 처리: 방향키 / WASD를 누르고 있는 동안 계속 이동한다.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if (KEY_DIRECTIONS[key]) {
        pressedKeysRef.current.add(key);
        e.preventDefault();
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      pressedKeysRef.current.delete(key);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // requestAnimationFrame 루프: 눌린 키에 따라 매 프레임 위치를 갱신하고,
  // 맵 경계와 건물에 막히도록 충돌 처리를 한다 (X/Y 축을 각각 체크해 벽을 따라 미끄러지듯 이동).
  useEffect(() => {
    function tick(time: number) {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      // 탭이 백그라운드로 밀리는 등 프레임이 크게 밀렸다가 재개되면 delta가 비정상적으로
      // 커져 한 프레임에 큰 거리를 이동하게 되고, 도착 지점만 검사하는 충돌 처리 특성상
      // 건물을 그대로 관통(터널링)할 수 있다. 최대 delta를 제한해 이를 방지한다.
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

      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy) || 1;
        const moveX = (dx / length) * MOVE_SPEED * delta;
        const moveY = (dy / length) * MOVE_SPEED * delta;

        const current = positionRef.current;
        let nextX = current.x;
        let nextY = current.y;

        const candidateX = clamp(current.x + moveX, 0, MAP_WIDTH - CHAR_SIZE);
        if (!collidesWithBuildings(candidateX, current.y)) {
          nextX = candidateX;
        }

        const candidateY = clamp(current.y + moveY, 0, MAP_HEIGHT - CHAR_SIZE);
        if (!collidesWithBuildings(nextX, candidateY)) {
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.title}>ことばのまち — 마을 지도</div>
        <Link href="/" className={styles.navLink}>
          ← 대화로 돌아가기
        </Link>
      </header>

      <main
        className={styles.mapWrapper}
        style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
      >
        <div className={styles.map} style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}>
          <div
            className={styles.path}
            style={{ left: 0, top: MAP_HEIGHT / 2 - 30, width: MAP_WIDTH, height: 60 }}
          />
          <div
            className={styles.path}
            style={{ left: MAP_WIDTH / 2 - 30, top: 0, width: 60, height: MAP_HEIGHT }}
          />

          {BUILDINGS.map((b) => (
            <BuildingMarker key={b.id} building={b} />
          ))}

          <div
            className={styles.character}
            style={{ left: position.x, top: position.y, width: CHAR_SIZE, height: CHAR_SIZE }}
          >
            🧑
          </div>
        </div>
      </main>

      <p className={styles.hint}>방향키 또는 WASD로 캐릭터를 움직여보세요.</p>
    </div>
  );
}
