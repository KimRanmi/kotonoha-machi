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

/**
 * 테마 단계 콘텐츠 하나를 보여주는 객관식 문제. `prompt`(한자 글자/단어·표현 표기/예문 문장/독해 지문)를
 * 보여주고 `options` 중 `correctAnswer`를 고르게 한다. 데이터가 부족하면 `options`가 4개보다 적을 수 있다.
 * `jlptLevel`은 예문(EXAMPLE) 단계에선 레벨 데이터가 없어 `null`이다.
 */
export interface QuizItem {
  prompt: string;
  options: string[];
  correctAnswer: string;
  jlptLevel: number | null;
}

/** 모든 테마를 로그인한 사용자 자신의 진행 상태와 함께 가져온다. */
export async function getThemes(): Promise<Theme[]> {
  const response = await apiFetch('/api/themes');
  return response.json();
}

/**
 * "오늘의 학습" 배너에 추천할 테마를 가져온다. 오늘(한국 시간) 안에 테마를 하나라도 완료했으면 `null`이다.
 */
export async function getTodayRecommendation(): Promise<Theme | null> {
  const response = await apiFetch('/api/themes/today-recommendation');
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

/** 테마의 한 단계에 나오는 항목들을 객관식 문제로 가져온다. */
export async function getStageContent(themeId: number, stage: ThemeStage): Promise<QuizItem[]> {
  const response = await apiFetch(`/api/themes/${themeId}/stages/${stage}/content`);
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
