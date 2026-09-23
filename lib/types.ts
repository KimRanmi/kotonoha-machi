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
