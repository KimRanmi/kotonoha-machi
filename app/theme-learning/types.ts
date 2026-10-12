export type RoundId = "kanji" | "word" | "expression" | "example";

export interface QuizItem {
  id: string;
  prompt: string;
  choices: string[];
  correct: string;
  hint: string;
}

export interface Round {
  id: RoundId;
  label: string;
  items: QuizItem[];
}

export interface ReviewQuestion {
  id: string;
  prompt: string;
  keywords: string[];
  sampleAnswer: string;
}

export type ThemeLevel = "N3" | "N2" | "N1";

export interface Theme {
  id: string;
  // 서버가 완료 기록의 키로 쓰는 이름이다. 이미 저장된 기록이 있으므로 바꾸면 안 된다.
  title: string;
  level: ThemeLevel;
  // 이 테마를 시작하려면 먼저 완료해야 하는 테마 id들. 해금 규칙은 여기 한 곳에서만 바꾼다.
  requires: string[];
  rounds: Round[];
  review: ReviewQuestion[];
}
