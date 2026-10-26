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

/** 한자(KANJI) 단계 콘텐츠 항목. */
export interface KanjiItem {
  kanji: string;
  onReading: string;
  kunReading: string;
  meaning: string;
  jlptLevel: number;
}

/** 단어(WORD) 또는 표현(EXPRESSION) 단계 콘텐츠 항목. */
export interface VocabularyItem {
  surfaceForm: string;
  reading: string;
  meaning: string;
  jlptLevel: number;
}

/** 예문(EXAMPLE) 단계 콘텐츠 항목. */
export interface ExampleItem {
  japaneseSentence: string;
  translation: string;
}

/** 단계별 콘텐츠 조회 응답. 실제 항목 모양은 호출에 넘긴 단계로 결정된다. */
export type StageContentItem = KanjiItem | VocabularyItem | ExampleItem;

/** 모든 테마를 로그인한 사용자 자신의 진행 상태와 함께 가져온다. */
export async function getThemes(): Promise<Theme[]> {
  const response = await apiFetch('/api/themes');
  return response.json();
}

/**
 * 테마의 한 단계에 나오는 실제 콘텐츠를 가져온다. KANJI는 {@link KanjiItem}, WORD·EXPRESSION은
 * {@link VocabularyItem}, EXAMPLE은 {@link ExampleItem} 목록이다. READING은 아직 백엔드에
 * 콘텐츠가 없어 호출하면 `ApiError`를 던진다.
 */
export async function getStageContent(
  themeId: number,
  stage: ThemeStage,
): Promise<StageContentItem[]> {
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
