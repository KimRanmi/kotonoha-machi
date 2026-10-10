// 첫 시작 온보딩 단계 목록. 순서대로 진행하고, 끝낸 단계는 lib/storage.ts에 id로 남는다.
// 나중에 "캐릭터 만들기" 단계를 넣을 때는 "place-home" 앞에 id를 추가하고, 마을 페이지(app/page.tsx)의
// 단계 분기에 그 단계의 화면만 더하면 된다.
export const ONBOARDING_STEPS = ["place-home"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

// 아직 끝내지 않은 첫 단계. 모두 끝났으면 null.
export function getNextOnboardingStep(done: string[]): OnboardingStep | null {
  return ONBOARDING_STEPS.find((s) => !done.includes(s)) ?? null;
}
