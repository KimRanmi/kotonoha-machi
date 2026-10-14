// 주민(villager)용 응답 생성 모델. 비용 효율적인 모델을 기본값으로 쓰되,
// 필요하면 .env.local의 GEMINI_MODEL로 교체할 수 있게 분리해둔다.
export const VILLAGER_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

// 화면에 보여줄 주민 정보(이름/아바타/설명)만 둔다. 실제 대화용 페르소나 프롬프트는
// 서버(backend/.../villager/Villagers.java)에만 있다 — 말투를 바꾸려면 그쪽을 수정한다.
export interface VillagerProfile {
  id: string;
  name: string;
  avatar: string;
  description: string;
}

// 마을에 사는 주민들. app/buildings.ts의 건물 id와 이 레코드의 key를 맞춰서
// 건물마다 담당 주민을 1:1로 연결한다.
// 건물 담당 주민(건물 id와 같은 id)
const CORE_VILLAGERS: Record<string, VillagerProfile> = {
  cafe: {
    id: "cafe",
    name: "미유(美優)",
    avatar: "☕",
    description: "마을 카페를 운영하는 친절한 주민",
  },
  shop: {
    id: "shop",
    name: "타쿠미(匠)",
    avatar: "🛍️",
    description: "마을 상점을 운영하는 활기찬 주민",
  },
  hall: {
    id: "hall",
    name: "하나(花)",
    avatar: "📋",
    description: "마을회관에서 일하는 야무진 주민",
  },
  travel: {
    id: "travel",
    name: "린(凛)",
    avatar: "🧳",
    description: "여행 학습관에서 여행 이야기를 들려주는 주민",
  },
};

// 건물 안에서 만나는 사람들(직원·손님·학생). 건물 담당 주민과 똑같이 대화하고 친밀도가 쌓인다.
// 방 데이터(app/interiors.ts)의 사람 id, 서버(Villagers.java)의 주민 id와 같은 id를 쓴다.
const ROOM_VILLAGERS: Record<string, VillagerProfile> = {
  "cafe-owner2": {
    id: "cafe-owner2",
    name: "켄타(健太)",
    avatar: "🥐",
    description: "카페를 함께 운영하는 과묵한 제빵사",
  },
  "cafe-guest1": {
    id: "cafe-guest1",
    name: "사쿠라(さくら)",
    avatar: "📚",
    description: "카페 단골인 호기심 많은 대학생",
  },
  "cafe-guest2": {
    id: "cafe-guest2",
    name: "다이스케(大輔)",
    avatar: "💼",
    description: "퇴근길에 카페에 들르는 느긋한 직장인",
  },
  "shop-clerk": {
    id: "shop-clerk",
    name: "모모카(桃花)",
    avatar: "🍑",
    description: "상점에서 일하는 밝은 점원",
  },
  "shop-stocker": {
    id: "shop-stocker",
    name: "소타(颯太)",
    avatar: "📦",
    description: "상점에서 물건을 정리하는 과묵한 점원",
  },
  "shop-guest": {
    id: "shop-guest",
    name: "요시코(良子)",
    avatar: "🧺",
    description: "장을 보러 온 다정한 할머니",
  },
  "hall-clerk1": {
    id: "hall-clerk1",
    name: "히로시(宏)",
    avatar: "🗂️",
    description: "마을회관의 꼼꼼한 직원",
  },
  "hall-clerk2": {
    id: "hall-clerk2",
    name: "미나(美奈)",
    avatar: "📮",
    description: "마을회관의 상냥한 직원",
  },
  "hall-guest": {
    id: "hall-guest",
    name: "이와오(巌)",
    avatar: "🍵",
    description: "마을 일에 밝은 어르신",
  },
  "student1": {
    id: "student1",
    name: "유이(結衣)",
    avatar: "✏️",
    description: "학습관에서 공부하는 성실한 학생",
  },
  "student2": {
    id: "student2",
    name: "료(涼)",
    avatar: "🎧",
    description: "학습관에서 공부하는 장난기 많은 학생",
  },
  "student3": {
    id: "student3",
    name: "아오이(葵)",
    avatar: "🎨",
    description: "학습관에서 공부하는 그림 좋아하는 학생",
  },
};

export const VILLAGERS: Record<string, VillagerProfile> = { ...CORE_VILLAGERS, ...ROOM_VILLAGERS };

// 테마 학습을 완료해 지어진 건물에 살게 되는 주민. 테마 제목 -> 주민 id(VILLAGERS 키).
// 같은 테마 건물을 여러 채 지어도 같은 주민(대화 기록/친밀도 공유)이 담당한다.
export const THEME_RESIDENTS: Record<string, string> = {
  여행: "travel",
  // 새 주민을 만들지 않고 기존 학습관 사람들(유이=student1, 료=student2, 아오이=student3)을 연결한다.
  "음식·식사": "student2",
  "쇼핑·가게": "student1",
  "직장·업무": "student1",
  "날씨·계절": "student3",
  "감정·인간관계": "student3",
};

export const DEFAULT_VILLAGER_ID = "cafe";

export function getVillager(id?: string | null): VillagerProfile {
  if (id && VILLAGERS[id]) return VILLAGERS[id];
  return VILLAGERS[DEFAULT_VILLAGER_ID];
}

// 주민의 일본어 응답을 학습자를 위해 한국어로 번역할 때 쓰는 시스템 프롬프트.
// 대화 응답 생성과는 별도의 호출로 처리해 페르소나 응답 품질에 영향을 주지 않는다.
export const TRANSLATOR_SYSTEM_PROMPT = `주어진 일본어 문장을 자연스러운 한국어로 번역하세요.
번역문만 출력하고, 설명이나 원문, 따옴표는 덧붙이지 마세요.`;
