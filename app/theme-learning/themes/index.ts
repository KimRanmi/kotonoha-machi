import type { Theme } from "../types";
import { travelTheme } from "./travel";
import { foodTheme } from "./food";
import { shoppingTheme } from "./shopping";
import { workTheme } from "./work";
import { weatherTheme } from "./weather";
import { emotionTheme } from "./emotion";
import { assertThemesValid } from "./validate";

// 학습 목록에 보이는 순서(= 수준이 N3 → N1로 올라가는 순서)다.
// 해금 조건은 각 테마 파일의 requires 한 곳에서만 정한다.
export const THEMES: Theme[] = [
  travelTheme,
  foodTheme,
  shoppingTheme,
  workTheme,
  weatherTheme,
  emotionTheme,
];

assertThemesValid(THEMES);

export function getThemeById(id: string): Theme | undefined {
  return THEMES.find((t) => t.id === id);
}

// 서버는 완료한 테마를 "제목"으로 기록한다(기존 "여행" 기록과 호환).
export type ThemeStatus = "locked" | "available" | "completed";

export function getThemeStatus(theme: Theme, completedTitles: ReadonlySet<string>): ThemeStatus {
  if (completedTitles.has(theme.title)) return "completed";
  return isThemeUnlocked(theme, completedTitles) ? "available" : "locked";
}

export function isThemeUnlocked(theme: Theme, completedTitles: ReadonlySet<string>): boolean {
  return theme.requires.every((reqId) => {
    const req = getThemeById(reqId);
    return !!req && completedTitles.has(req.title);
  });
}
