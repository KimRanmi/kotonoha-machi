// 마을 맵의 아이소메트릭(비스듬한 시점) 투영.
// 이동·충돌·배치 판정은 전부 "월드 좌표"(MAP_WIDTH x MAP_HEIGHT 평면)에서 하고, 화면에 그릴 때만
// project()로 비스듬한 화면 좌표로 바꾼다. 화면 클릭은 unproject()로 월드 좌표로 되돌린다.
// (월드 x가 커지면 화면 오른쪽 아래로, y가 커지면 왼쪽 아래로 간다.)

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 640;

export const ISO_K = 0.6; // 월드 1px이 화면 가로로 차지하는 비율
const OX = MAP_HEIGHT * ISO_K;
const OY = 110; // 건물·나무가 위로 솟는 높이를 담는 위쪽 여백
export const SLAB = 26; // 땅의 두께(흙 옆면)

export const STAGE_WIDTH = (MAP_WIDTH + MAP_HEIGHT) * ISO_K;
export const STAGE_HEIGHT = OY + ((MAP_WIDTH + MAP_HEIGHT) * ISO_K) / 2 + SLAB + 24;

export type P2 = [number, number];

export function project(x: number, y: number, z = 0): P2 {
  return [OX + (x - y) * ISO_K, OY + ((x + y) * ISO_K) / 2 - z];
}

// 화면 좌표(z=0 지면 기준) -> 월드 좌표
export function unproject(sx: number, sy: number): { x: number; y: number } {
  const u = (sx - OX) / ISO_K;
  const v = (sy - OY) / (ISO_K / 2);
  return { x: (u + v) / 2, y: (v - u) / 2 };
}

export const pts = (a: P2[]) => a.map((p) => `${p[0]},${p[1]}`).join(" ");
