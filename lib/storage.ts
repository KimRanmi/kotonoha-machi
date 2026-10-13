import type { ChatMessage, LearnedWord, PendingBuilding, StoredBuilding } from "@/lib/types";
import type { Furniture } from "@/app/interiors";

// 건물 내부에서 나와 마을로 돌아갈 때, 방금 나온 건물 id를 한 번만 넘겨주는 키.
// 마을이 읽으면 지운다(새로고침해도 캐릭터가 계속 그 자리로 되돌려지지 않게).
// 사용자 데이터가 아니라 화면 전환 중에만 쓰는 임시 값이라 서버가 아니라 브라우저에 둔다.
const TOWN_RETURN_STORAGE_KEY = "kotonoha:town-return-building";

export function setTownReturnBuilding(buildingId: string): void {
  saveToStorage(TOWN_RETURN_STORAGE_KEY, buildingId);
}

export function takeTownReturnBuilding(): string | null {
  const id = loadFromStorage<string | null>(TOWN_RETURN_STORAGE_KEY, null);
  if (id) removeFromStorage(TOWN_RETURN_STORAGE_KEY);
  return id;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage 사용이 불가능한 환경(프라이빗 모드 등)에서는 조용히 무시한다.
  }
}

function removeFromStorage(key: string): void {
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
    // navigator.locks.request는 콜백이 돌려준 Promise를 한 번 더 감싸므로 await로 풀어서 Promise<boolean>으로 맞춘다.
    const locked = (async (): Promise<boolean> => {
      if (typeof navigator !== "undefined" && navigator.locks) {
        return await navigator.locks.request("kotonoha-refresh", () => doRefresh());
      }
      return doRefresh();
    })();
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
  // 로그아웃하면 토큰이 사라져 저장할 수 없으니, 그 전에 마지막 위치를 한 번 저장한다(오래 걸리면 기다리지 않는다).
  await flushLastPosition();
  resetPositionState();
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
  // 방금 로그인했으니 마을에 들어갈 때 이 계정의 마지막 위치에서 시작한다.
  resetPositionState();
  restorePending = true;
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

// ---- 서버(API) 기반 저장소: 학습 단어 / 테마 / 건물 / 내 집 / 온보딩 ----
// 저장에 실패하면 Error(사용자에게 보여줄 메시지)를 던진다. 화면은 이를 잡아 화면에 표시해야 한다.

// 204(내용 없음)는 "아직 저장된 값이 없음"이라서 null로 돌려준다.
async function readJsonOrNull<T>(res: Response, fallbackError: string): Promise<T | null> {
  if (res.status === 204) return null;
  return readJson<T>(res, fallbackError);
}

async function expectOk(res: Response, fallbackError: string): Promise<void> {
  if (res.ok) return;
  const data = await res.json().catch(() => null);
  throw new Error(data?.error || fallbackError);
}

// 네트워크가 끊겨 fetch 자체가 실패하면 브라우저 기본 메시지(Failed to fetch) 대신 한국어 안내를 쓴다.
async function guarded<T>(action: () => Promise<T>, fallbackError: string): Promise<T> {
  try {
    return await action();
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof TypeError) throw new Error(`${fallbackError} 네트워크 연결을 확인해주세요.`);
    throw err;
  }
}

// -- 학습 단어 --

export function fetchWords(): Promise<LearnedWord[]> {
  return guarded(async () => {
    const res = await apiFetch("/api/words");
    return readJson<LearnedWord[]>(res, "학습 단어를 불러오지 못했습니다.");
  }, "학습 단어를 불러오지 못했습니다.");
}

export function addWord(word: string): Promise<LearnedWord> {
  return guarded(async () => {
    const res = await apiFetch("/api/words", { method: "POST", body: JSON.stringify({ word }) });
    return readJson<LearnedWord>(res, "단어를 저장하지 못했습니다.");
  }, "단어를 저장하지 못했습니다.");
}

export function removeWord(word: string): Promise<void> {
  return guarded(async () => {
    const res = await apiFetch(`/api/words?word=${encodeURIComponent(word)}`, { method: "DELETE" });
    await expectOk(res, "단어를 삭제하지 못했습니다.");
  }, "단어를 삭제하지 못했습니다.");
}

// -- 테마 완료 / 배치 대기 건물 / 배치한 건물 --

// 테마 완료를 기록한다. 처음 완료한 것이면 true(서버가 배치 대기 건물도 함께 만든다), 복습이면 false.
export function completeTheme(themeTitle: string): Promise<boolean> {
  return guarded(async () => {
    const res = await apiFetch("/api/themes/complete", {
      method: "POST",
      body: JSON.stringify({ themeTitle }),
    });
    const data = await readJson<{ firstCompletion: boolean }>(res, "테마 완료를 저장하지 못했습니다.");
    return data.firstCompletion;
  }, "테마 완료를 저장하지 못했습니다.");
}

// 지금까지 완료한 테마 제목 목록(서버가 제목을 키로 기록한다).
export function fetchCompletedThemes(): Promise<string[]> {
  return guarded(async () => {
    const res = await apiFetch("/api/themes/completed");
    return readJson<string[]>(res, "완료한 테마를 불러오지 못했습니다.");
  }, "완료한 테마를 불러오지 못했습니다.");
}

// 배치 대기 건물. 없으면 null. 배치할 때까지 서버에 남는다.
export function fetchPendingBuilding(): Promise<PendingBuilding | null> {
  return guarded(async () => {
    const res = await apiFetch("/api/buildings/pending");
    return readJsonOrNull<PendingBuilding>(res, "배치할 건물을 불러오지 못했습니다.");
  }, "배치할 건물을 불러오지 못했습니다.");
}

export function fetchPlacedBuildings(): Promise<StoredBuilding[]> {
  return guarded(async () => {
    const res = await apiFetch("/api/buildings");
    return readJson<StoredBuilding[]>(res, "건물 목록을 불러오지 못했습니다.");
  }, "건물 목록을 불러오지 못했습니다.");
}

export interface BuildingPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
}

// 배치 대기 건물을 마을에 놓는다. 건물 id와 테마는 서버가 대기 건물에서 정해 돌려준다.
export function placePendingBuilding(placement: BuildingPlacement): Promise<StoredBuilding> {
  return guarded(async () => {
    const res = await apiFetch("/api/buildings", { method: "POST", body: JSON.stringify(placement) });
    return readJson<StoredBuilding>(res, "건물을 저장하지 못했습니다.");
  }, "건물을 저장하지 못했습니다.");
}

// -- 내 집 / 온보딩 --

export interface HomePosition {
  x: number;
  y: number;
}

export interface HomeFurnitureState {
  placed: Furniture[];
  stored: Furniture[];
}

// 끝낸 온보딩 단계 id 목록. 단계 목록 자체는 app/onboarding.ts에 있다.
export function fetchOnboardingDone(): Promise<string[]> {
  return guarded(async () => {
    const res = await apiFetch("/api/onboarding");
    return readJson<string[]>(res, "진행 상태를 불러오지 못했습니다.");
  }, "진행 상태를 불러오지 못했습니다.");
}

export function markOnboardingStepDone(stepId: string): Promise<void> {
  return guarded(async () => {
    const res = await apiFetch(`/api/onboarding/${encodeURIComponent(stepId)}`, { method: "PUT" });
    await expectOk(res, "진행 상태를 저장하지 못했습니다.");
  }, "진행 상태를 저장하지 못했습니다.");
}

// 내 집을 마을 맵에 배치한 자리(좌상단). 없으면 아직 배치하지 않은 것.
export function fetchHomePosition(): Promise<HomePosition | null> {
  return guarded(async () => {
    const res = await apiFetch("/api/home/position");
    return readJsonOrNull<HomePosition>(res, "내 집 위치를 불러오지 못했습니다.");
  }, "내 집 위치를 불러오지 못했습니다.");
}

export function saveHomePosition(position: HomePosition): Promise<void> {
  return guarded(async () => {
    const res = await apiFetch("/api/home/position", { method: "PUT", body: JSON.stringify(position) });
    await expectOk(res, "내 집 위치를 저장하지 못했습니다.");
  }, "내 집 위치를 저장하지 못했습니다.");
}

// 저장된 가구 배치. 아직 한 번도 저장한 적 없으면 null(호출하는 쪽이 기본 가구로 시작한다).
export function fetchHomeFurniture(): Promise<HomeFurnitureState | null> {
  return guarded(async () => {
    const res = await apiFetch("/api/home/furniture");
    return readJsonOrNull<HomeFurnitureState>(res, "가구 배치를 불러오지 못했습니다.");
  }, "가구 배치를 불러오지 못했습니다.");
}

// 가구 저장은 조작할 때마다 호출되므로 요청을 순서대로 이어서 보낸다(응답이 뒤바뀌어 옛 상태로
// 덮어써지는 것을 막음). 호출하는 쪽은 기다리지 않고 화면을 먼저 바꾸고, 실패만 처리하면 된다.
let furnitureSaveChain: Promise<unknown> = Promise.resolve();

export function saveHomeFurniture(state: HomeFurnitureState): Promise<void> {
  const run = () =>
    guarded(async () => {
      const res = await apiFetch("/api/home/furniture", { method: "PUT", body: JSON.stringify(state) });
      await expectOk(res, "가구 배치를 저장하지 못했습니다.");
    }, "가구 배치를 저장하지 못했습니다.");
  const result = furnitureSaveChain.then(run, run);
  furnitureSaveChain = result.catch(() => undefined);
  return result;
}

// ---- 마지막 위치 이어하기 ----
// 장소는 "town" 또는 건물 id. 좌표는 그 장소 안의 월드 좌표(캐릭터 좌상단).
export interface LastPosition {
  place: string;
  x: number;
  y: number;
}

export const TOWN_PLACE = "town";
// 로그아웃 때 마지막 위치 저장을 기다려주는 최대 시간.
const LOGOUT_SAVE_WAIT_MS = 1500;

// 복원은 "전체 페이지를 새로 불러온 경우"(또는 방금 로그인한 경우)에만 한 번 한다. 앱 안의 이동(건물 입장/퇴장,
// 링크)은 복원하지 않는다. 마을("/")이나 건물 내부로 열렸을 때만 복원 대상이고, 다른 화면으로 열린 뒤
// 앱 안에서 마을로 오는 경우는 대상이 아니다. 모듈 변수라서 새로고침하면 다시 켜지고, 화면 전환으로는 유지된다.
let restorePending =
  typeof window !== "undefined" &&
  (window.location.pathname === "/" || window.location.pathname.startsWith("/inside/"));

export function isRestorePending(): boolean {
  return restorePending;
}

// 복원 결과를 반영한 뒤에 호출한다(반영 전에 부르면 개발 모드의 effect 재실행에서 복원이 사라진다).
export function consumeRestore(): void {
  restorePending = false;
}

// 마을에서 건물 내부로 복원 이동할 때, 좌표를 내부 화면에 넘겨주는 값.
let roomRestore: LastPosition | null = null;

export function setRoomRestore(position: LastPosition): void {
  roomRestore = position;
}

export function peekRoomRestore(buildingId: string): LastPosition | null {
  return roomRestore?.place === buildingId ? roomRestore : null;
}

export function clearRoomRestore(): void {
  roomRestore = null;
}

// 마을에서 다른 화면(단어 목록 등)으로 나갈 때의 자리. 링크로 마을에 돌아오면 그 자리에서 이어간다(메모리에만 둔다).
let townResume: { x: number; y: number } | null = null;

export function setTownResume(p: { x: number; y: number }): void {
  townResume = p;
}

export function getTownResume(): { x: number; y: number } | null {
  return townResume;
}

let lastSentKey: string | null = null;
let positionSaveChain: Promise<unknown> = Promise.resolve();
let positionProvider: (() => LastPosition | null) | null = null;

function positionKey(p: LastPosition): string {
  return `${p.place}|${p.x}|${p.y}`;
}

// 계정이 바뀔 수 있는 시점(로그인/로그아웃)에 이전 계정의 저장 상태를 버린다.
function resetPositionState(): void {
  lastSentKey = null;
  roomRestore = null;
  townResume = null;
  positionProvider = null;
}

// 저장된 마지막 위치. 없으면 null.
export function fetchLastPosition(): Promise<LastPosition | null> {
  return guarded(async () => {
    const res = await apiFetch("/api/position");
    return readJsonOrNull<LastPosition>(res, "마지막 위치를 불러오지 못했습니다.");
  }, "마지막 위치를 불러오지 못했습니다.");
}

// 마지막 위치를 저장한다. 걷는 도중에 자주 부르는 보조 기능이라 실패해도 조용히 넘어간다
// (에러를 던지거나 로그인 화면으로 보내지 않고, 재시도도 하지 않는다). 요청은 순서대로 이어서 보낸다.
export function saveLastPosition(position: LastPosition): Promise<void> {
  const key = positionKey(position);
  if (key === lastSentKey) return Promise.resolve();
  lastSentKey = key; // 같은 값이 연달아 들어와도 한 번만 보내도록 미리 표시하고, 실패하면 되돌린다.
  const run = async () => {
    try {
      if (!(await restoreSession())) throw new Error("not signed in");
      let res = await send("/api/position", { method: "PUT", body: JSON.stringify(position) });
      if (res.status === 401 && (await refreshSession())) {
        res = await send("/api/position", { method: "PUT", body: JSON.stringify(position) });
      }
      if (!res.ok) throw new Error("save failed");
    } catch {
      if (lastSentKey === key) lastSentKey = null;
    }
  };
  const result = positionSaveChain.then(run, run);
  positionSaveChain = result;
  return result;
}

// 탭을 닫거나 숨길 때 쓰는 저장. keepalive 요청은 페이지가 닫힌 뒤에도 전송된다
// (sendBeacon은 Authorization 헤더를 보낼 수 없어 쓰지 않는다). 토큰 갱신을 기다릴 수 없으므로 메모리의 토큰을 그대로 쓴다.
export function saveLastPositionOnExit(position: LastPosition): void {
  const key = positionKey(position);
  if (key === lastSentKey || !accessToken) return;
  lastSentKey = key;
  send("/api/position", { method: "PUT", body: JSON.stringify(position), keepalive: true }).catch(() => {
    if (lastSentKey === key) lastSentKey = null;
  });
}

// 지금 화면이 현재 위치를 알려주는 함수를 등록한다(로그아웃 직전 저장용). 화면이 사라지면 null로 해제한다.
export function setLastPositionProvider(provider: (() => LastPosition | null) | null): void {
  positionProvider = provider;
}

async function flushLastPosition(): Promise<void> {
  const current = positionProvider?.();
  if (!current || !accessToken) return;
  await Promise.race([
    saveLastPosition(current),
    new Promise<void>((resolve) => setTimeout(resolve, LOGOUT_SAVE_WAIT_MS)),
  ]);
}
