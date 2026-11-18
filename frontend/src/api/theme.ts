import { apiFetch } from './client';

export type ThemeStage = 'KANJI' | 'WORD' | 'EXPRESSION' | 'EXAMPLE' | 'READING' | 'REVIEW';

/** 학습 목록에 나오는 학습 하나와 로그인한 사용자의 진행 상태. */
export interface Theme {
  id: number;
  title: string;
  currentStage: ThemeStage;
  completed: boolean;
}

/** 학습 단계 완료 처리 후 돌아오는 진행 상태. */
export interface ThemeProgress {
  themeId: number;
  currentStage: ThemeStage;
  completed: boolean;
}

/**
 * 학습 단계 콘텐츠 하나. `prompt`(한자 글자/단어·표현 표기/예문 문장)를 보여주고 `options` 중
 * `correctAnswer`를 고르게 하는 객관식이다. 데이터가 부족하면 `options`가 4개보다 적을 수 있다. `jlptLevel`은
 * 예문(EXAMPLE) 단계에선 레벨 데이터가 없어 `null`이다. REVIEW 단계는 예외적으로 선택지가 없는 말하기 연습이라
 * `options`가 항상 빈 배열이고, `correctAnswer`는 뜻이 아니라 `prompt`와 같은 값(음성 인식 결과와 비교할 기준
 * 문자열)이다. `reading`은 히라가나 읽는 법이다. 학습 화면에서 읽는 법을 보여주고 소리로 들려주는 데 쓰고, REVIEW에선
 * 음성 인식 결과가 한자 대신 가나로 나와도 맞힌 걸로 볼 수 있도록 `prompt`와 함께 비교한다. 독해(READING)
 * 단계는 읽는 법 데이터가 없어 `null`이다.
 */
export interface QuizItem {
  prompt: string;
  options: string[];
  correctAnswer: string;
  reading: string | null;
  jlptLevel: number | null;
  /** 한글 뜻/번역. 복습(REVIEW)에서만 채워진다. */
  meaning: string | null;
  /** 왜 그 보기가 정답인지 설명. 독해(READING) 이해 문제에서만 채워진다. */
  explanation?: string;
}

/** 독해(READING) 단계의 지문과 출처, 이해 문제. 문제는 다른 단계와 같은 객관식 항목이다(보기 순서는 저장된 그대로). */
export interface ReadingContent {
  passage: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
  license: string | null;
  /** 글의 일부(도입 단락)만 발췌했으면 true. */
  excerpt: boolean;
  questions: QuizItem[];
}

/** 모든 학습을 로그인한 사용자 자신의 진행 상태와 함께 가져온다. */
export async function getThemes(): Promise<Theme[]> {
  const response = await apiFetch('/api/themes');
  return response.json();
}

/** 완료한 학습 목록에 나오는 학습 하나. 완료한 순서(오래된 것부터)로 내려온다. */
export interface CompletedTheme {
  id: number;
  /** 완료한 시각(ISO 8601). */
  completedAt: string;
  /** 학습에 나오는 JLPT 레벨(5=N5 ~ 1=N1), 쉬운 레벨부터. */
  levels: number[];
}

/** 로그인한 사용자가 완료한 학습을 완료한 순서대로 가져온다. */
export async function getCompletedThemes(): Promise<CompletedTheme[]> {
  const response = await apiFetch('/api/themes/completed');
  return response.json();
}

/**
 * "오늘의 학습" 배너에 보여 줄 학습을 가져온다. 오늘(한국 시간) 안에 학습을 완료했으면 새 학습 대신 그
 * 완료한 학습(`completed: true`)을 돌려주고, 모든 학습을 끝냈으면 `null`이다.
 */
export async function getTodayRecommendation(): Promise<Theme | null> {
  const response = await apiFetch('/api/themes/today-recommendation');
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

/** 학습의 한 단계에 나오는 항목들을 객관식 문제로 가져온다. */
export async function getStageContent(themeId: number, stage: ThemeStage): Promise<QuizItem[]> {
  const response = await apiFetch(`/api/themes/${themeId}/stages/${stage}/content`);
  return response.json();
}

/**
 * 학습의 한 단계를 완료 처리하고 다음 단계로 진행한다. 지금 진행해야 할 단계가 아니면(건너뛰기나 이미 끝난 단계
 * 재요청) `ApiError`를 던진다.
 */
export async function completeStage(themeId: number, stage: ThemeStage): Promise<ThemeProgress> {
  const response = await apiFetch(`/api/themes/${themeId}/stages/${stage}/complete`, {
    method: 'POST',
  });
  return response.json();
}

/** 독해 단계의 지문과 이해 문제를 가져온다. 이해 문제가 없는 학습(독해를 건너뜀)이면 `null`이다. */
export async function getReading(themeId: number): Promise<ReadingContent | null> {
  const response = await apiFetch(`/api/themes/${themeId}/reading`);
  if (response.status === 204) {
    return null;
  }
  return response.json();
}
