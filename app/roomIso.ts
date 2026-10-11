import type { Room } from "./interiors";
import type { P2 } from "./iso";

// 건물 내부 방의 아이소메트릭 투영. 마을과 같은 시점(월드 x → 오른쪽 아래, y → 왼쪽 아래)이다.
// 이동·충돌·꾸미기 판정은 방의 평면 좌표(Room.width x Room.height) 그대로이고, 그릴 때만 project()로 바꾼다.
// 걸어 다닐 수 있는 바닥은 y ∈ [wallHeight, height] (위쪽 wallHeight 띠는 벽이라 못 들어간다).
// 위(y=wallHeight)쪽 벽과 왼쪽(x=0)쪽 벽만 세운 "단면 모형"이라 앞쪽 두 면은 열려 있다.

export const ROOM_K = 1;
export const ROOM_SCALE = ROOM_K / 0.6; // 가구·벽 높이 배율(마을과 같은 규칙)
export const WALL_Z = 190; // 벽 높이
const MARGIN = 56;
export const FLOOR_SLAB = 16;

export function makeRoomIso(room: Room) {
  const K = ROOM_K;
  const roy = MARGIN + WALL_Z - (room.wallHeight * K) / 2;
  const rox = room.height * K + MARGIN;
  const stageWidth = (room.width - room.wallHeight + room.height) * K + 2 * MARGIN;
  const stageHeight = roy + ((room.width + room.height) * K) / 2 + FLOOR_SLAB + MARGIN;
  const project = (x: number, y: number, z = 0): P2 => [rox + (x - y) * K, roy + ((x + y) * K) / 2 - z];
  const unproject = (sx: number, sy: number) => {
    const u = (sx - rox) / K;
    const v = (sy - roy) / (K / 2);
    return { x: (u + v) / 2, y: (v - u) / 2 };
  };
  return { project, unproject, stageWidth, stageHeight };
}

export type RoomIso = ReturnType<typeof makeRoomIso>;

// 색 보정 도우미
const parse = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
export const mix = (a: string, b: string, t: number) => {
  const A = parse(a);
  const B = parse(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};
export const lighten = (hex: string, t: number) => mix(hex, "#ffffff", t);
export const darken = (hex: string, t: number) => mix(hex, "#3a2a20", t);
