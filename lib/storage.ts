import type { ChatMessage } from "@/lib/types";
import type { Furniture } from "@/app/interiors";

export const WORDS_STORAGE_KEY = "kotonoha:word-list";
// 테마 학습을 막 끝내고 마을로 넘어가는 중, 아직 배치되지 않은 건물 1건을 잠깐 들고 있는 키.
// town 페이지가 마운트 시 이 값을 읽고 나면 바로 지워서 배치 모드를 한 번만 트리거한다.
export const PENDING_BUILDING_STORAGE_KEY = "kotonoha:pending-building";
// 사용자가 마을 맵에 실제로 배치한 건물 목록(새로고침 후에도 유지).
export const PLACED_BUILDINGS_STORAGE_KEY = "kotonoha:placed-buildings";

// 한 번이라도 완료한 테마 제목 목록. 건물은 테마를 처음 완료할 때만 생기고, 다시 하면 복습으로 친다.
const COMPLETED_THEMES_STORAGE_KEY = "kotonoha:completed-themes";

export function hasCompletedTheme(themeTitle: string): boolean {
  return loadFromStorage<string[]>(COMPLETED_THEMES_STORAGE_KEY, []).includes(themeTitle);
}

export function markThemeCompleted(themeTitle: string): void {
  const done = loadFromStorage<string[]>(COMPLETED_THEMES_STORAGE_KEY, []);
  if (!done.includes(themeTitle)) saveToStorage(COMPLETED_THEMES_STORAGE_KEY, [...done, themeTitle]);
}

// 건물 내부에서 나와 마을로 돌아갈 때, 방금 나온 건물 id를 한 번만 넘겨주는 키.
// 마을이 읽으면 지운다(새로고침해도 캐릭터가 계속 그 자리로 되돌려지지 않게).
const TOWN_RETURN_STORAGE_KEY = "kotonoha:town-return-building";

export function setTownReturnBuilding(buildingId: string): void {
  saveToStorage(TOWN_RETURN_STORAGE_KEY, buildingId);
}

export function takeTownReturnBuilding(): string | null {
  const id = loadFromStorage<string | null>(TOWN_RETURN_STORAGE_KEY, null);
  if (id) removeFromStorage(TOWN_RETURN_STORAGE_KEY);
  return id;
}

// ---- 온보딩 / 내 집 ----
// 곧 서버 API로 옮길 데이터라서, 화면 코드는 localStorage를 직접 쓰지 않고 아래 함수만 쓴다.

// 끝낸 온보딩 단계 id 목록. 단계 목록 자체는 app/onboarding.ts에 있다.
const ONBOARDING_DONE_STORAGE_KEY = "kotonoha:onboarding-done";
// 내 집을 마을 맵에 배치한 자리(좌상단). 없으면 아직 배치하지 않은 것.
const HOME_POSITION_STORAGE_KEY = "kotonoha:home-position";
// 내 집 가구 배치: 방에 놓인 가구와 목록(보관함)에 있는 가구.
const HOME_FURNITURE_STORAGE_KEY = "kotonoha:home-furniture";

export interface HomePosition {
  x: number;
  y: number;
}

export interface HomeFurnitureState {
  placed: Furniture[];
  stored: Furniture[];
}

export function loadOnboardingDone(): string[] {
  return loadFromStorage<string[]>(ONBOARDING_DONE_STORAGE_KEY, []);
}

export function markOnboardingStepDone(stepId: string): void {
  const done = loadOnboardingDone();
  if (!done.includes(stepId)) saveToStorage(ONBOARDING_DONE_STORAGE_KEY, [...done, stepId]);
}

export function loadHomePosition(): HomePosition | null {
  return loadFromStorage<HomePosition | null>(HOME_POSITION_STORAGE_KEY, null);
}

export function saveHomePosition(position: HomePosition): void {
  saveToStorage(HOME_POSITION_STORAGE_KEY, position);
}

// 저장된 가구 배치. 아직 한 번도 저장한 적 없으면 null(호출하는 쪽이 기본 가구로 시작한다).
export function loadHomeFurniture(): HomeFurnitureState | null {
  return loadFromStorage<HomeFurnitureState | null>(HOME_FURNITURE_STORAGE_KEY, null);
}

export function saveHomeFurniture(state: HomeFurnitureState): void {
  saveToStorage(HOME_FURNITURE_STORAGE_KEY, state);
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage 사용이 불가능한 환경(프라이빗 모드 등)에서는 조용히 무시한다.
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // localStorage 사용이 불가능한 환경(프라이빗 모드 등)에서는 조용히 무시한다.
  }
}

// ---- 로그인 (access 토큰 + refresh 쿠키) ----
// - access 토큰(15분, JWT): JS 메모리에만 둔다. localStorage에 두지 않으므로 XSS로 오래 쓸 수 있는 자격 증명이 새지 않는다.
// - refresh 토큰(14일): 서버가 httpOnly 쿠키로 관리한다(JS는 읽을 수 없음). 새로고침하면 메모리의 access 토큰이
//   사라지므로, 쿠키로 /api/auth/refresh를 호출해 새 access 토큰을 받아 복구한다.
// - 세션 힌트: "로그인한 적이 있다"는 비밀이 아닌 표시. 없으면 불필요한 refresh 요청을 건너뛴다.

const SESSION_HINT_KEY = "kotonoha:session-hint";
// 이전 방식(localStorage에 토큰 저장)의 잔재. 남아 있으면 지운다.
const LEGACY_AUTH_KEYS = ["kotonoha:auth-token", "kotonoha:auth-email"];
// 만료 직전(30초 이내)에는 미리 갱신한다.
const EXPIRY_MARGIN_MS = 30_000;

export class UnauthorizedError extends Error {
  constructor() {
    super("로그인이 필요합니다.");
  }
}

interface AuthResponse {
  accessToken: string;
  email: string;
  // 닉네임 도입 전에 가입한 계정은 null (설정 화면으로 보낸다).
  nickname: string | null;
}

let accessToken: string | null = null;
let accessExpiresAt = 0;
let authEmail: string | null = null;
let authNickname: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

function jwtExpiryMs(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp * 1000;
  } catch {
    return Date.now() + 10 * 60_000;
  }
}

function applySession(data: AuthResponse): void {
  accessToken = data.accessToken;
  accessExpiresAt = jwtExpiryMs(data.accessToken);
  authEmail = data.email;
  authNickname = data.nickname ?? null;
  saveToStorage(SESSION_HINT_KEY, true);
}

function clearSession(): void {
  accessToken = null;
  accessExpiresAt = 0;
  authEmail = null;
  authNickname = null;
  removeFromStorage(SESSION_HINT_KEY);
}

function hasFreshAccessToken(): boolean {
  return accessToken !== null && Date.now() < accessExpiresAt - EXPIRY_MARGIN_MS;
}

// 현재 메모리에 로그인 정보가 있는지(동기). 화면 표시용이며, 판단은 restoreSession()으로 한다.
export function getAuthEmail(): string | null {
  return accessToken ? authEmail : null;
}

// 주민들이 사용자를 부르는 이름. 아직 정하지 않았으면 null.
export function getAuthNickname(): string | null {
  return accessToken ? authNickname : null;
}

// 같은 사용자가 탭 여러 개로 동시에 갱신하면 refresh 토큰이 교체되는 중에 겹쳐 재사용으로 오인될 수 있다.
// 탭 안에서는 진행 중인 요청 하나를 공유하고, 탭 사이에서는 Web Locks로 순서대로 실행한다.
function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    const run = () => doRefresh();
    const locked =
      typeof navigator !== "undefined" && navigator.locks
        ? navigator.locks.request("kotonoha-refresh", run)
        : run();
    refreshInFlight = locked.finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST", cache: "no-store" });
    if (res.status === 401) {
      clearSession(); // refresh 토큰이 없거나 만료/폐기됨 → 다시 로그인해야 한다.
      return false;
    }
    if (!res.ok) return false; // 서버 일시 오류: 로그인 정보는 유지한 채 이번 시도만 실패로 둔다.
    applySession((await res.json()) as AuthResponse);
    return true;
  } catch {
    return false; // 네트워크 오류
  }
}

// 로그인 상태를 확인하고, 필요하면 refresh 쿠키로 복구한다. 로그인 상태면 true.
export async function restoreSession(): Promise<boolean> {
  if (hasFreshAccessToken()) return true;
  if (!loadFromStorage<boolean>(SESSION_HINT_KEY, false)) return false;
  return refreshSession();
}

export async function logout(): Promise<void> {
  // 서버에서 refresh 토큰을 폐기하고 쿠키를 지운다. 네트워크가 실패해도 이 브라우저의 로그인 정보는 지운다.
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  clearSession();
}

async function authenticate(mode: "login" | "signup", body: Record<string, string>): Promise<void> {
  const res = await fetch(`/api/auth/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  applySession(await readJson<AuthResponse>(res, "로그인에 실패했습니다."));
}

export function login(email: string, password: string): Promise<void> {
  return authenticate("login", { email, password });
}

export function signup(email: string, password: string, nickname: string): Promise<void> {
  return authenticate("signup", { email, password, nickname });
}

// ---- 닉네임 ----
// 규칙은 백엔드(Nicknames.java)와 같아야 한다: 글자·숫자·밑줄만 2~12자.
const NICKNAME_PATTERN = /^[\p{L}\p{N}_]{2,12}$/u;
export const NICKNAME_RULE_MESSAGE = "닉네임은 2~12자의 글자, 숫자, 밑줄(_)만 쓸 수 있어요.";

export function validateNickname(nickname: string): string | null {
  return NICKNAME_PATTERN.test(nickname) ? null : NICKNAME_RULE_MESSAGE;
}

// 중복 확인 (로그인 전에도 호출하는 공개 API).
export async function checkNickname(nickname: string): Promise<{ available: boolean; message: string }> {
  const res = await fetch(`/api/auth/nickname-available?nickname=${encodeURIComponent(nickname)}`, {
    cache: "no-store",
  });
  return readJson(res, "닉네임을 확인하지 못했습니다.");
}

// 닉네임 설정/변경. 이후 모든 주민이 이 이름으로 부른다.
export async function setNickname(nickname: string): Promise<void> {
  const res = await apiFetch("/api/auth/nickname", {
    method: "PUT",
    body: JSON.stringify({ nickname }),
  });
  const data = await readJson<{ nickname: string }>(res, "닉네임을 저장하지 못했습니다.");
  authNickname = data.nickname;
}

// 로그인/닉네임 설정 후 돌아갈 경로는 같은 사이트 안의 경로만 허용한다 (open redirect 방지).
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

// 로그인이 필요한 상태(갱신도 실패)면 로그인 화면으로 보낸다. 화면 코드는 신경 쓰지 않아도 된다.
function redirectToLogin(): never {
  clearSession();
  if (typeof window !== "undefined") {
    window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  throw new UnauthorizedError();
}

if (typeof window !== "undefined") LEGACY_AUTH_KEYS.forEach(removeFromStorage);

// ---- 서버(API) 기반 저장소: 대화 기록 / 친밀도 ----
// 화면 코드는 fetch를 직접 쓰지 않고 아래 함수들만 사용한다.

async function send(path: string, init: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!(await restoreSession())) redirectToLogin();
  let res = await send(path, init);
  // 확인과 요청 사이에 access 토큰이 만료됐다면 한 번만 갱신해서 다시 시도한다.
  if (res.status === 401 && (await refreshSession())) res = await send(path, init);
  if (res.status === 401) redirectToLogin();
  return res;
}

async function readJson<T>(res: Response, fallbackError: string): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || fallbackError);
  return data as T;
}

export interface ChatReply {
  reply: string;
  translation: string;
}

// 주민별 대화 기록 (오래된 순).
export async function fetchChatHistory(villagerId: string): Promise<ChatMessage[]> {
  const res = await apiFetch(`/api/villagers/${encodeURIComponent(villagerId)}/messages`);
  return readJson<ChatMessage[]>(res, "대화 기록을 불러오지 못했습니다.");
}

// 대화를 보내고 주민의 답변을 받는다. 저장과 친밀도 증가는 서버가 처리한다.
export async function sendChat(
  villagerId: string,
  messages: { role: string; content: string }[],
): Promise<ChatReply> {
  const res = await apiFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ villagerId, messages }),
  });
  return readJson<ChatReply>(res, "알 수 없는 오류가 발생했습니다.");
}

// 주민별 친밀도 서술형 문구. 아직 만난 적 없으면 met=false, description=null.
export interface VillagerIntimacy {
  villagerId: string;
  met: boolean;
  description: string | null;
}

export async function fetchIntimacy(): Promise<VillagerIntimacy[]> {
  const res = await apiFetch("/api/intimacy");
  return readJson<VillagerIntimacy[]>(res, "친밀도를 불러오지 못했습니다.");
}
