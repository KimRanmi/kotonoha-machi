export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  translation?: string;
  createdAt: number;
}

export interface LearnedWord {
  word: string;
  addedAt: number;
}

// 테마 학습 완료 직후, 마을 맵으로 넘어가 사용자가 배치할 건물 1건의 정보.
// theme-learning에서 저장하고, town 페이지가 마운트 시 한 번 읽어 소비한다.
export interface PendingBuilding {
  themeTitle: string;
  completedAt: number;
}
