// 카페 주문 메뉴와 대사. 주문하면 직원이 준비해서 플레이어 쪽으로 서빙해 준다(방 화면: useRoomNpcs의 serve).
// 일본어 학습용이라 주문할 때 쓰는 일본어 문장을 함께 보여준다.

export type OrderItemId = "coffee" | "tea" | "cake-strawberry" | "cake-cheese";

export interface OrderItem {
  id: OrderItemId;
  ja: string;
  ko: string;
  emoji: string;
  phrase: string; // 주문할 때 하는 말
  phraseKo: string;
  station: "machine" | "showcase"; // 직원이 준비하는 곳
  verb: "drink" | "eat";
}

export const ORDER_ITEMS: OrderItem[] = [
  { id: "coffee", ja: "コーヒー", ko: "커피", emoji: "☕", phrase: "コーヒーをひとつください。", phraseKo: "커피 하나 주세요.", station: "machine", verb: "drink" },
  { id: "tea", ja: "紅茶", ko: "홍차", emoji: "🍵", phrase: "紅茶をひとつください。", phraseKo: "홍차 하나 주세요.", station: "machine", verb: "drink" },
  { id: "cake-strawberry", ja: "いちごのショートケーキ", ko: "딸기 쇼트케이크", emoji: "🍰", phrase: "いちごのショートケーキをください。", phraseKo: "딸기 쇼트케이크 주세요.", station: "showcase", verb: "eat" },
  { id: "cake-cheese", ja: "チーズケーキ", ko: "치즈케이크", emoji: "🧀", phrase: "チーズケーキをください。", phraseKo: "치즈케이크 주세요.", station: "showcase", verb: "eat" },
];

export const getOrderItem = (id: string) => ORDER_ITEMS.find((i) => i.id === id) ?? null;

// 직원 대사
export const LINE_ACCEPT = { ja: "かしこまりました！少々お待ちください。", ko: "알겠습니다! 잠시만 기다려 주세요." };
export const LINE_SERVE = { ja: "お待たせしました！どうぞ。", ko: "기다리셨습니다! 드세요." };
export const LINE_BUSY = { ja: "ただいま準備中です。少々お待ちください。", ko: "지금 준비 중이에요. 잠시만 기다려 주세요." };
export const LINE_ENJOY: Record<"drink" | "eat", { ja: string; ko: string }> = {
  drink: { ja: "ごちそうさまでした！おいしかったです。", ko: "잘 마셨습니다! 맛있었어요." },
  eat: { ja: "ごちそうさまでした！おいしかったです。", ko: "잘 먹었습니다! 맛있었어요." },
};

// ───────── 일본어로 말해서 주문하기 ─────────
// 플레이어가 카페 직원과의 대화(AI)에서 일본어로 주문하면, 문장에서 메뉴를 알아듣고 서빙을 시작한다.
// 가타카나/히라가나, 전각/반각 차이는 무시한다. 일부 말을 틀리거나 줄여도 메뉴 단어와 "부탁하는 말"이
// 들어 있으면 알아듣는다. 실제 응답(말투·되묻기)은 AI가 하고, 여기서는 "주문이 접수됐는지"만 판정한다.

const toHira = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s、。！？!?,.\-ー〜~]/g, (c) => (c === "ー" ? "ー" : ""));

const MENU_WORDS: Record<OrderItemId, string[]> = {
  coffee: ["こーひー", "珈琲", "coffee", "らて", "えすぷれっそ", "あめりかーの", "かふぇおれ", "かふぇらて"],
  tea: ["こうちゃ", "紅茶", "てぃー", "おちゃ", "お茶", "れもんてぃー", "みるくてぃー"],
  "cake-strawberry": ["いちご", "苺", "しょーとけーき", "ショートケーキ", "しょーと"],
  "cake-cheese": ["ちーず"],
};
// 주문하는 말(부탁·희망·결정)
const ASK_WORDS = ["ください", "下さい", "くださる", "おねがい", "お願い", "ほしい", "欲しい", "いただ", "頂", "ちょうだい", "もらえ", "もらい", "にします", "にする", "にしたい", "のみたい", "飲みたい", "たべたい", "食べたい", "ひとつ", "一つ", "いっこ", "1つ", "ふたつ"];
const REFUSE_WORDS = ["いらない", "ほしくない", "結構", "けっこう", "やめ", "いりません", "いらん"];

export function parseOrderFromJapanese(text: string): OrderItemId | null {
  const t = toHira(text);
  if (REFUSE_WORDS.some((w) => t.includes(toHira(w)))) return null;
  // "주문하는 말"이 하나도 없으면 메뉴 단어만 말한 것(예: 좋아해요)으로 보고 무시. 단어만 단독으로 말한 경우는 허용.
  const asked = ASK_WORDS.some((w) => t.includes(toHira(w))) || t.length <= 14;
  if (!asked) return null;
  for (const item of ORDER_ITEMS) {
    if (MENU_WORDS[item.id].some((w) => t.includes(toHira(w)))) return item.id;
  }
  return null;
}

// 직원의 답에서 "접수했다"는 뜻인지(되묻기·거절이 아닌지) 판정한다.
const ACCEPT_WORDS = ["かしこまり", "承知", "少々", "お待ち", "すぐ", "了解", "準備", "お持ち", "持って", "用意", "お作り", "作り", "淹れ", "いれ", "どうぞ", "はい"];
const DENY_WORDS = ["申し訳", "すみません", "ございません", "ありません", "売り切れ", "できません", "ごめん", "品切れ"];

export function isOrderAccepted(reply: string): boolean {
  if (DENY_WORDS.some((w) => reply.includes(w))) return false;
  return ACCEPT_WORDS.some((w) => reply.includes(w));
}

// 대화창에 보여줄 주문 힌트
export const ORDER_CHAT_HINT = "💡 일본어로 주문해 보세요. 메뉴: コーヒー · 紅茶 · いちごのショートケーキ · チーズケーキ (예: 「コーヒーをください」)";
