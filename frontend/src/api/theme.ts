import { apiFetch } from './client';

export type ThemeStage = 'KANJI' | 'WORD' | 'EXPRESSION' | 'EXAMPLE' | 'READING';

/** 테마 학습 목록에 나오는 테마 하나와 로그인한 사용자의 진행 상태. */
export interface Theme {
  id: number;
  title: string;
  currentStage: ThemeStage;
  completed: boolean;
}

/** 테마 단계 완료 처리 후 돌아오는 진행 상태. */
export interface ThemeProgress {
  themeId: number;
  currentStage: ThemeStage;
  completed: boolean;
}

/** 모든 테마를 로그인한 사용자 자신의 진행 상태와 함께 가져온다. */
export async function getThemes(): Promise<Theme[]> {
  const response = await apiFetch('/api/themes');
  return response.json();
}

/**
 * 테마의 한 단계를 완료 처리하고 다음 단계로 진행한다. 지금 진행해야 할 단계가 아니면(건너뛰기나 이미 끝난 단계
 * 재요청) `ApiError`를 던진다.
 */
export async function completeStage(themeId: number, stage: ThemeStage): Promise<ThemeProgress> {
  const response = await apiFetch(`/api/themes/${themeId}/stages/${stage}/complete`, {
    method: 'POST',
  });
  return response.json();
}
