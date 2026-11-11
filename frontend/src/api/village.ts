import { apiFetch } from './client';

/** 마을 건물 하나. 위치(x, z)는 건물 중심, width는 x 방향, depth는 z 방향 길이다. 값의 원본은 서버(구글 시트)다. */
export interface VillageBuilding {
  id: string;
  /** 간판에 일본어로 적히는 이름. */
  label: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  /** 건물이 향한 방향(도). 0이면 문이 +z 쪽이고 three.js의 y축 회전 방향을 따른다. */
  rotation: number;
  color: string;
  /** 이 건물 안에 있는 모든 주민의 slug(등록된 순서). 주민이 없으면 빈 배열. */
  residentSlugs: string[];
}

/** 마을 땅의 크기. 값의 원본은 서버다. */
export interface VillageMap {
  /** 이동 가능한 정사각형 땅의 절반 크기. 원점이 땅의 가운데다. */
  halfSize: number;
  /** 캐릭터가 설 수 있는 가장 바깥 좌표(절대값). 서버의 위치 저장 검증과 같은 값이다. */
  maxWalkCoordinate: number;
}

/** 마을 땅의 크기를 가져온다. */
export async function getVillageMap(): Promise<VillageMap> {
  const response = await apiFetch('/api/village/map');
  return response.json();
}

/** 마을 건물 목록을 가져온다. 모든 건물이 처음부터 열려 있다. */
export async function getVillageBuildings(): Promise<VillageBuilding[]> {
  const response = await apiFetch('/api/village/buildings');
  return response.json();
}

/** 마을에서 서 있는 자리. 서버가 사용자별로 저장한다. */
export interface VillagePosition {
  x: number;
  z: number;
}

/** 마지막으로 서 있던 자리를 가져온다. 저장한 적이 없으면 null. */
export async function getVillagePosition(): Promise<VillagePosition | null> {
  const response = await apiFetch('/api/village/position');
  const body: { x: number | null; z: number | null } = await response.json();
  return body.x === null || body.z === null ? null : { x: body.x, z: body.z };
}

/**
 * 지금 서 있는 자리를 저장한다. 탭을 닫는 순간에도 요청이 끊기지 않도록 keepalive로 보낸다.
 * 실패해도 마을 이용을 막지 않으므로 호출하는 쪽에서 에러를 무시한다.
 */
export async function saveVillagePosition(position: VillagePosition): Promise<void> {
  await apiFetch('/api/village/position', {
    method: 'PUT',
    body: JSON.stringify(position),
    keepalive: true,
  });
}
