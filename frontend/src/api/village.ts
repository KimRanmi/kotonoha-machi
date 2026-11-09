import { apiFetch } from './client';

/** 마을 건물 하나의 열림 상태. 서버가 사용자별로 저장한 값이다. */
export interface VillageBuildingStatus {
  id: string;
  unlocked: boolean;
}

/** 로그인한 사용자의 마을 건물(집, 카페, 상점) 열림 상태를 가져온다. */
export async function getVillageBuildings(): Promise<VillageBuildingStatus[]> {
  const response = await apiFetch('/api/village/buildings');
  return response.json();
}
