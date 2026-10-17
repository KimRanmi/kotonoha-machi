// 주문(카페)·구매(상점) 메뉴와 대사. 일본어로 말해서 주문하면 직원이 준비해서 플레이어 쪽으로 가져다준다
// (방 화면: useRoomNpcs의 serve). 일본어 학습용이라 주문할 때 쓰는 문장을 함께 보여주고,
// 주문에 쓴 단어는 단어 목록에 자동으로 담는다.

export type OrderKind = "cafe" | "shop";
export type StationKind = "machine" | "showcase" | "shelf" | "cooler";

export interface OrderItem {
  id: string;
  kind: OrderKind;
  ja: string;
  ko: string;
  emoji: string;
  phrase: string; // 주문할 때 하는 말
  phraseKo: string;
  station: StationKind; // 직원이 가지러/만들러 가는 곳
  verb: "drink" | "eat";
  keywords: string[]; // 말에서 이 품목을 알아듣는 단어들
  words: string[]; // 주문하면 단어 목록에 담는 단어들
  price?: number; // 엔
}

export const ORDER_ITEMS: OrderItem[] = [
  { id: "coffee", kind: "cafe", ja: "コーヒー", ko: "커피", emoji: "☕", phrase: "コーヒーをひとつください。", phraseKo: "커피 하나 주세요.", station: "machine", verb: "drink", keywords: ["こーひー", "珈琲", "coffee", "らて", "えすぷれっそ", "あめりかーの", "かふぇおれ"], words: ["コーヒー"], price: 400 },
  { id: "tea", kind: "cafe", ja: "紅茶", ko: "홍차", emoji: "🍵", phrase: "紅茶をひとつください。", phraseKo: "홍차 하나 주세요.", station: "machine", verb: "drink", keywords: ["こうちゃ", "紅茶", "てぃー", "おちゃ", "お茶"], words: ["紅茶"], price: 400 },
  { id: "cake-strawberry", kind: "cafe", ja: "いちごのショートケーキ", ko: "딸기 쇼트케이크", emoji: "🍰", phrase: "いちごのショートケーキをください。", phraseKo: "딸기 쇼트케이크 주세요.", station: "showcase", verb: "eat", keywords: ["いちご", "苺", "しょーとけーき", "しょーと"], words: ["いちご", "ショートケーキ"], price: 550 },
  { id: "cake-cheese", kind: "cafe", ja: "チーズケーキ", ko: "치즈케이크", emoji: "🧀", phrase: "チーズケーキをください。", phraseKo: "치즈케이크 주세요.", station: "showcase", verb: "eat", keywords: ["ちーず"], words: ["チーズケーキ"], price: 500 },
  { id: "apple", kind: "shop", ja: "りんご", ko: "사과", emoji: "🍎", phrase: "りんごをふたつください。", phraseKo: "사과 두 개 주세요.", station: "shelf", verb: "eat", keywords: ["りんご", "林檎", "あっぷる"], words: ["りんご"], price: 150 },
  { id: "bread", kind: "shop", ja: "パン", ko: "빵", emoji: "🍞", phrase: "パンをひとつください。", phraseKo: "빵 하나 주세요.", station: "shelf", verb: "eat", keywords: ["ぱん", "しょくぱん"], words: ["パン"], price: 200 },
  { id: "milk", kind: "shop", ja: "牛乳", ko: "우유", emoji: "🥛", phrase: "牛乳をください。", phraseKo: "우유 주세요.", station: "cooler", verb: "drink", keywords: ["ぎゅうにゅう", "牛乳", "みるく"], words: ["牛乳"], price: 180 },
  { id: "greentea", kind: "shop", ja: "お茶", ko: "차(페트병)", emoji: "🍶", phrase: "お茶をください。", phraseKo: "차 주세요.", station: "cooler", verb: "drink", keywords: ["おちゃ", "お茶", "りょくちゃ", "緑茶"], words: ["お茶"], price: 130 },
];

export const getOrderItem = (id: string) => ORDER_ITEMS.find((i) => i.id === id) ?? null;

// 방 종류별 설정: 누가 서빙하는지, 누구와 대화해서 주문하는지, 안내 문구
export interface RoomMenu {
  kind: OrderKind;
  server: string; // 서빙하는 직원(방 데이터의 사람 id)
  chatIds: string[]; // 이 사람들과의 대화에서 주문할 수 있다
  button: string; // 헤더 버튼 이름
  title: string;
  hint: string; // 대화창 안내
  chatButton: string;
}

export const ROOM_MENUS: Partial<Record<string, RoomMenu>> = {
  cafe: {
    kind: "cafe",
    server: "cafe-owner2",
    chatIds: ["cafe", "cafe-owner2", "cafe-staff"],
    button: "주문하기",
    title: "メニュー · 메뉴",
    hint: "💡 일본어로 주문해 보세요. 메뉴: コーヒー · 紅茶 · いちごのショートケーキ · チーズケーキ (예: 「コーヒーをください」)",
    chatButton: "🗣 일본어로 직접 주문하기 (추천)",
  },
  shop: {
    kind: "shop",
    server: "shop-clerk",
    chatIds: ["shop", "shop-clerk", "shop-stocker"],
    button: "사기",
    title: "お品書き · 상품",
    hint: "💡 일본어로 사고 싶은 걸 말해 보세요. 상품: りんご · パン · 牛乳 · お茶 (예: 「りんごをふたつください」)",
    chatButton: "🗣 일본어로 직접 사기 (추천)",
  },
};

export const menuItemsFor = (kind: OrderKind) => ORDER_ITEMS.filter((i) => i.kind === kind);

// 직원 대사
export const LINE_ACCEPT = { ja: "かしこまりました！少々お待ちください。", ko: "알겠습니다! 잠시만 기다려 주세요." };
export const LINE_SERVE = { ja: "お待たせしました！どうぞ。", ko: "기다리셨습니다! 드세요." };
export const LINE_BUSY = { ja: "ただいま準備中です。少々お待ちください。", ko: "지금 준비 중이에요. 잠시만 기다려 주세요." };
export const LINE_ENJOY: Record<"drink" | "eat", { ja: string; ko: string }> = {
  drink: { ja: "ごちそうさまでした！おいしかったです。", ko: "잘 마셨습니다! 맛있었어요." },
  eat: { ja: "ごちそうさまでした！おいしかったです。", ko: "잘 먹었습니다! 맛있었어요." },
};
// 서빙할 때 값을 말해 준다(숫자 듣기 연습)
export const lineServe = (item: OrderItem) =>
  item.price ? { ja: `お待たせしました！${item.ja}、${item.price}円です。どうぞ。`, ko: `기다리셨습니다! ${item.ko}, ${item.price}엔입니다. 드세요.` } : LINE_SERVE;

// ───────── 일본어로 말해서 주문하기 ─────────
// 플레이어가 직원과의 대화(AI)에서 일본어로 주문하면, 문장에서 품목을 알아듣고 서빙을 시작한다.
// 가타카나/히라가나, 전각/반각 차이는 무시한다. 일부 말을 틀리거나 줄여도 품목 단어와 "부탁하는 말"이
// 들어 있으면 알아듣는다. 실제 응답(말투·되묻기)은 AI가 하고, 여기서는 "주문이 접수됐는지"만 판정한다.

const toHira = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s、。！？!?,.\-〜~]/g, "");

// 주문하는 말(부탁·희망·결정)
const ASK_WORDS = ["ください", "下さい", "くださる", "おねがい", "お願い", "ほしい", "欲しい", "いただ", "頂", "ちょうだい", "もらえ", "もらい", "にします", "にする", "にしたい", "のみたい", "飲みたい", "たべたい", "食べたい", "かいたい", "買いたい", "ひとつ", "一つ", "いっこ", "1つ", "ふたつ", "二つ", "2つ", "みっつ"];
const REFUSE_WORDS = ["いらない", "ほしくない", "結構", "けっこう", "やめ", "いりません", "いらん"];

export function parseOrderFromJapanese(text: string, kind: OrderKind): OrderItem | null {
  const t = toHira(text);
  if (REFUSE_WORDS.some((w) => t.includes(toHira(w)))) return null;
  // "주문하는 말"이 하나도 없으면 품목 단어만 말한 것(예: 좋아해요)으로 보고 무시. 단어만 단독으로 말한 경우는 허용.
  const asked = ASK_WORDS.some((w) => t.includes(toHira(w))) || t.length <= 14;
  if (!asked) return null;
  for (const item of menuItemsFor(kind)) {
    if (item.keywords.some((w) => t.includes(toHira(w)))) return item;
  }
  return null;
}

// 직원의 답에서 "접수했다"는 뜻인지(되묻기·거절이 아닌지) 판정한다.
const ACCEPT_WORDS = ["かしこまり", "承知", "少々", "お待ち", "すぐ", "了解", "準備", "お持ち", "持って", "用意", "お作り", "作り", "淹れ", "いれ", "どうぞ", "はい", "お取り", "取って"];
const DENY_WORDS = ["申し訳", "すみません", "ございません", "ありません", "売り切れ", "できません", "ごめん", "品切れ"];

export function isOrderAccepted(reply: string): boolean {
  if (DENY_WORDS.some((w) => reply.includes(w))) return false;
  return ACCEPT_WORDS.some((w) => reply.includes(w));
}
