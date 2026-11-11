import { apiFetch } from './client';

/** 주민(slug)별 친밀도(0~100). 대화한 적 없는 주민도 0으로 들어 있다. */
export type Friendships = Record<string, number>;

/** 모든 주민과의 친밀도를 가져온다. */
export async function getFriendships(): Promise<Friendships> {
  const response = await apiFetch('/api/residents/friendships');
  const items: { residentSlug: string; level: number }[] = await response.json();
  return Object.fromEntries(items.map((item) => [item.residentSlug, item.level]));
}
