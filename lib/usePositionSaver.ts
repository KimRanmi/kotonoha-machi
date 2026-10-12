"use client";

import { useEffect, type RefObject } from "react";
import { saveLastPosition, saveLastPositionOnExit, setLastPositionProvider, type LastPosition } from "@/lib/storage";
import type { Point } from "@/lib/walk";

// 걷는 동안 저장하는 최대 빈도(이 간격마다 한 번), 그리고 멈춘 것을 알아차리는 확인 주기.
const SAVE_INTERVAL_MS = 3000;
const CHECK_INTERVAL_MS = 1000;

// 마지막 위치를 서버에 저장한다. 매 프레임 보내지 않고 아래 시점에만 보낸다.
// - 화면이 켜졌을 때(건물에 들어왔을 때 / 마을로 나왔을 때) 한 번
// - 걷는 중에는 위치가 바뀌었을 때 3초에 한 번까지, 멈추면(1초 동안 그대로) 곧바로 한 번
// - 탭을 닫거나 숨길 때(pagehide / visibilitychange): 페이지가 닫혀도 전송되는 keepalive 요청
// enabled가 false인 동안에는 아무것도 하지 않는다. 복원이 끝나기 전에 기본 위치로 덮어쓰지 않기 위해서다.
export function usePositionSaver(place: string, positionRef: RefObject<Point>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const snapshot = (): LastPosition => ({
      place,
      x: Math.round(positionRef.current.x * 10) / 10,
      y: Math.round(positionRef.current.y * 10) / 10,
    });
    const keyOf = (p: LastPosition) => `${p.x}|${p.y}`;

    setLastPositionProvider(snapshot);
    let current = snapshot();
    void saveLastPosition(current);
    let savedKey = keyOf(current);
    let savedAt = Date.now();
    let previousKey = savedKey;

    const timer = window.setInterval(() => {
      current = snapshot();
      const key = keyOf(current);
      if (key !== savedKey) {
        const stopped = key === previousKey;
        if (stopped || Date.now() - savedAt >= SAVE_INTERVAL_MS) {
          void saveLastPosition(current);
          savedKey = key;
          savedAt = Date.now();
        }
      }
      previousKey = key;
    }, CHECK_INTERVAL_MS);

    const saveOnExit = () => saveLastPositionOnExit(snapshot());
    const onVisibility = () => {
      if (document.visibilityState === "hidden") saveOnExit();
    };
    window.addEventListener("pagehide", saveOnExit);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", saveOnExit);
      document.removeEventListener("visibilitychange", onVisibility);
      setLastPositionProvider(null);
    };
  }, [place, positionRef, enabled]);
}
