import { INTIMACY_STORAGE_KEY, loadFromStorage, saveToStorage } from "@/lib/storage";

// 친밀도 단계. minExchanges는 해당 단계에 도달하는 데 필요한 누적 대화 횟수(주고받기 1회 = 1).
// 사용자에게는 수치/게이지/단계명 없이 서술형 문구(description)만 보여준다 — 현실의 관계처럼
// "정확히 얼마나 남았는지" 알 수 없게 하는 것이 의도다. 마지막 단계가 상한이다.
const INTIMACY_LEVELS = [
  { minExchanges: 0, description: "아직 낯선 사이예요" },
  { minExchanges: 3, description: "얼굴은 알아보는 사이가 됐어요" },
  { minExchanges: 8, description: "요즘 자주 얘기해서 편해졌어요" },
  { minExchanges: 15, description: "서로 안부를 묻는 친구예요" },
  { minExchanges: 25, description: "속마음까지 나누는 사이예요" },
  { minExchanges: 40, description: "둘도 없는 친구가 됐어요" },
];

// villagerId -> 누적 대화 횟수
export type IntimacyRecord = Record<string, number>;

export function getIntimacyDescription(exchanges: number): string {
  let description = INTIMACY_LEVELS[0].description;
  for (const level of INTIMACY_LEVELS) {
    if (exchanges >= level.minExchanges) description = level.description;
  }
  return description;
}

export function loadIntimacy(): IntimacyRecord {
  return loadFromStorage<IntimacyRecord>(INTIMACY_STORAGE_KEY, {});
}

// 대화 1회가 성립했을 때 호출한다. 별도 알림 없이 조용히 저장만 한다.
export function recordExchange(villagerId: string): void {
  const record = loadIntimacy();
  saveToStorage(INTIMACY_STORAGE_KEY, { ...record, [villagerId]: (record[villagerId] ?? 0) + 1 });
}
