// 마을 맵의 아이소메트릭(비스듬한 시점) 투영.
// 이동·충돌·배치 판정은 전부 "월드 좌표"(MAP_WIDTH x MAP_HEIGHT 평면)에서 하고, 화면에 그릴 때만
// project()로 비스듬한 화면 좌표로 바꾼다. 화면 클릭은 unproject()로 월드 좌표로 되돌린다.
// (월드 x가 커지면 화면 오른쪽 아래로, y가 커지면 왼쪽 아래로 간다.)
// 마을(걸어 다닐 수 있는 월드) 바깥으로도 EXT만큼 풍경(숲·호수)이 이어진다. 캐릭터는 나갈 수 없다.

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 640;

export const ISO_K = 1; // 월드 1px이 화면 가로로 차지하는 비율
export const ISO_SCALE = ISO_K / 0.6; // 건물·소품 높이 등 "서 있는" 그림의 배율
export const EXT = 300; // 월드 바깥으로 이어지는 풍경의 폭

const OX = (MAP_HEIGHT + 2 * EXT) * ISO_K;
const OY = EXT * ISO_K + 190; // 위쪽 여백: 가장 안쪽 건물·나무가 솟는 높이

export const STAGE_WIDTH = (MAP_WIDTH + MAP_HEIGHT + 4 * EXT) * ISO_K;
export const STAGE_HEIGHT = OY + ((MAP_WIDTH + MAP_HEIGHT + 2 * EXT) * ISO_K) / 2 + 90;

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
