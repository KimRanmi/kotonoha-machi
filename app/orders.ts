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
