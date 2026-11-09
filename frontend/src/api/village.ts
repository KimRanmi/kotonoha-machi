import { apiFetch } from './client';

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
