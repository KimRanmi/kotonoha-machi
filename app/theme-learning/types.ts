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

export interface Theme {
  title: string;
  rounds: Round[];
  review: ReviewQuestion[];
}
