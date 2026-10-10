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

// 테마를 처음 완료했지만 아직 마을에 배치하지 않은 건물 1건의 정보.
// 서버가 테마 완료 때 만들고, 배치할 때까지 유지한다.
export interface PendingBuilding {
  themeTitle: string;
  completedAt: number;
}

// 서버에 저장된, 마을에 배치된 테마 건물 (app/buildings.ts의 PlacedBuilding에서 주민 연결만 뺀 모양).
export interface StoredBuilding {
  id: string;
  themeTitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  placedAt: number;
}
