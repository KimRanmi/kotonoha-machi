import type { Avatar } from '../api/user';
import type { VillageBuilding } from '../api/village';
import { PLAYER_RADIUS } from './villageBuildings';
import { spotsAlongRoads } from './villageScenery';
import type { Accessory } from './residentAccessories';
import type { VoiceProfile } from './speechSynthesis';

/** 주민 한 명의 생김새. 위치는 서버의 소속 장소(건물)에서 정하므로 여기에 두지 않는다. */
export interface VillageResident {
  /** 주민 시트의 고유 키(DB `resident.slug`와 같다). */
  slug: string;
  /** 머리 위 이름표에 적히는 일본어 이름. */
  name: string;
  /** 5축 외형. 주민은 사용자가 꾸미지 않으므로 주민마다 미리 정한 값을 쓴다. */
  avatar: Avatar;
  /** 체형 배율. 키(height)와 통통함(width)을 기본 캐릭터 대비 비율로 준다. 없으면 1. */
  build?: { height: number; width: number };
  /** 직업·특징을 드러내는 소품. */
  accessories?: Accessory[];
  /** 대화에서 주민 답장을 읽을 때의 목소리. 음높이(pitch)와 속도(rate)로 성별·나이·성격 차이를 낸다. */
  voice: VoiceProfile;
}

/** 마을에 놓인 주민: 생김새와 서 있는 자리. */
export interface PlacedResident extends VillageResident {
  x: number;
  z: number;
}

/** 주민 몸통의 충돌 반지름. 내 캐릭터가 주민을 통과하지 못하게 한다. */
export const RESIDENT_RADIUS = 0.3;

function look(
  skinColor: string,
  hairColor: string,
  hairStyle: Avatar['hairStyle'],
  clothesStyle: Avatar['clothesStyle'],
  clothesColor: string,
  shoesColor = 'WHITE',
): Avatar {
  return { skinColor, hairColor, hairStyle, clothesStyle, clothesColor, shoesColor };
}

const accessory = (kind: Accessory['kind'], color?: string): Accessory => ({ kind, color });

// 외모는 주민 시트의 "외모·직업" 설명을 따른다. 색·머리·옷은 서버가 주는 선택지 안에서만 고를 수 있어,
// 설명에 있지만 선택지에 없는 것(파란 머리, 삭발, 가죽 재킷 등)은 체형과 소품으로 살린다.
export const VILLAGE_RESIDENTS: VillageResident[] = [
  // 항구 하역 노동자: 180cm 거구
  {
    slug: 'r01',
    name: 'カイト',
    voice: { pitch: 0.6, rate: 0.8 },
    avatar: look('TAN', 'BLACK', 'SHORT', 'OVERALLS', 'SKY'),
    build: { height: 1.15, width: 1.2 },
    accessories: [accessory('bandana', '#e8e2d0')],
  },
  // 중학생 배달부 소년: 작고 노란 후드티
  {
    slug: 'r02',
    name: 'ソラ',
    voice: { pitch: 1.5, rate: 0.95 },
    avatar: look('FAIR', 'BROWN', 'SHORT', 'PLAIN', 'YELLOW'),
    build: { height: 0.78, width: 0.9 },
  },
  // 꽃집 점원: 단발에 앞치마
  {
    slug: 'r03',
    name: 'ユイ',
    voice: { pitch: 1.4, rate: 0.85 },
    avatar: look('LIGHT', 'BROWN', 'BOB', 'ONEPIECE', 'PINK'),
    accessories: [accessory('apron', '#fff6e8')],
  },
  // 라면 가게 견습생: 통통하고 동그란 안경
  {
    slug: 'r04',
    name: 'ダイスケ',
    voice: { pitch: 0.9, rate: 0.85 },
    avatar: look('FAIR', 'BLACK', 'SHORT', 'STRIPES', 'CREAM'),
    build: { height: 0.95, width: 1.3 },
    accessories: [accessory('glasses'), accessory('bandana', '#f6f3ee')],
  },
  // 찻집 여주인: 긴 흑발, 키 크고 성숙
  {
    slug: 'r05',
    name: 'レイカ',
    voice: { pitch: 1.0, rate: 0.7 },
    avatar: look('LIGHT', 'BLACK', 'PONYTAIL', 'ONEPIECE', 'CORAL'),
    build: { height: 1.1, width: 0.95 },
  },
  // 검도부 주장: 포니테일에 도복
  {
    slug: 'r06',
    name: 'ハヤト',
    voice: { pitch: 1.1, rate: 0.9 },
    avatar: look('FAIR', 'BLACK', 'PONYTAIL', 'PLAIN', 'CREAM'),
    build: { height: 1.05, width: 0.95 },
    accessories: [accessory('bandana', '#2f3a6b')],
  },
  // 신인 아이돌: 트윈테일
  {
    slug: 'r07',
    name: 'ミク',
    voice: { pitch: 1.8, rate: 0.95 },
    avatar: look('LIGHT', 'BLONDE', 'BUNS', 'ONEPIECE', 'PINK', 'PINK'),
    build: { height: 0.95, width: 0.9 },
  },
  // 마을 최고령 농부: 굽은 허리, 하얀 수염, 밀짚모자
  {
    slug: 'r08',
    name: 'ゲンゾウ',
    voice: { pitch: 0.5, rate: 0.6 },
    avatar: look('TAN', 'GRAY', 'SHORT', 'OVERALLS', 'MINT'),
    build: { height: 0.82, width: 1.0 },
    accessories: [accessory('strawHat'), accessory('beard')],
  },
  // 도서관 사서: 둥근 안경, 큰 숄더백
  {
    slug: 'r09',
    name: 'ナナ',
    voice: { pitch: 1.0, rate: 0.7 },
    avatar: look('LIGHT', 'BROWN', 'BOB', 'CARDIGAN', 'MINT'),
    accessories: [accessory('glasses'), accessory('bag')],
  },
  // 젊은 주지 승려: 검은 승복
  {
    slug: 'r10',
    name: 'ドウゲン',
    voice: { pitch: 0.7, rate: 0.65 },
    avatar: look('FAIR', 'BLACK', 'SHORT', 'PLAIN', 'LAVENDER'),
    accessories: [accessory('robe')],
  },
  // 거리 댄서: 헤드폰, 뾰족한 머리
  {
    slug: 'r11',
    name: 'リク',
    voice: { pitch: 1.3, rate: 1.0 },
    avatar: look('TAN', 'BLACK', 'MOHAWK', 'STRIPES', 'SKY', 'SKY'),
    build: { height: 1.05, width: 0.9 },
    accessories: [accessory('headphones', '#3b82f6')],
  },
  // 패션 잡지 편집장: 큰 키에 정장
  {
    slug: 'r12',
    name: 'マリエ',
    voice: { pitch: 0.8, rate: 0.9 },
    avatar: look('LIGHT', 'BROWN', 'BOB', 'ONEPIECE', 'LAVENDER'),
    build: { height: 1.12, width: 0.9 },
  },
  // 빵집 아르바이트 대학생: 앞치마
  {
    slug: 'r13',
    name: 'ショウタ',
    voice: { pitch: 1.2, rate: 0.9 },
    avatar: look('FAIR', 'BROWN', 'SHORT', 'PLAIN', 'PEACH'),
    accessories: [accessory('apron', '#fff6e8')],
  },
  // 타코야끼 장인: 주황 앞치마와 머리 손수건
  {
    slug: 'r14',
    name: 'アカネ',
    voice: { pitch: 0.6, rate: 0.85 },
    avatar: look('FAIR', 'RED', 'PONYTAIL', 'PLAIN', 'CORAL'),
    accessories: [accessory('apron', '#f08a24'), accessory('bandana', '#f08a24')],
  },
  // 방랑 음유시인: 묶은 머리에 기타 케이스
  {
    slug: 'r15',
    name: 'セイジ',
    voice: { pitch: 1.0, rate: 0.75 },
    avatar: look('LIGHT', 'BROWN', 'PONYTAIL', 'CARDIGAN', 'CREAM'),
    build: { height: 1.08, width: 0.9 },
    accessories: [accessory('case')],
  },
  // 보건교사: 하얀 가운
  {
    slug: 'r16',
    name: 'ハルカ',
    voice: { pitch: 1.1, rate: 0.75 },
    avatar: look('LIGHT', 'BLACK', 'BOB', 'CARDIGAN', 'CREAM'),
    accessories: [accessory('apron', '#ffffff')],
  },
  // 할머니 점술가: 작은 체구, 보랏빛 숄
  {
    slug: 'r17',
    name: 'カツラ',
    voice: { pitch: 0.7, rate: 0.6 },
    avatar: look('FAIR', 'GRAY', 'BUNS', 'CARDIGAN', 'LAVENDER'),
    build: { height: 0.78, width: 0.95 },
    accessories: [accessory('shawl')],
  },
  // 버추얼 가수: 은색 단발, 가냘픈 체형
  {
    slug: 'r18',
    name: 'レン',
    voice: { pitch: 1.9, rate: 0.9 },
    avatar: look('LIGHT', 'GRAY', 'BOB', 'PLAIN', 'SKY', 'SKY'),
    build: { height: 1.05, width: 0.85 },
  },
  // 오토바이 정비사: 짧은 머리, 작업 손수건
  {
    slug: 'r19',
    name: 'サクラ',
    voice: { pitch: 0.65, rate: 0.85 },
    avatar: look('FAIR', 'BLACK', 'SHORT', 'OVERALLS', 'BEIGE'),
    accessories: [accessory('bandana', '#555a66')],
  },
  // 재즈바 바텐더: 금테 안경
  {
    slug: 'r20',
    name: 'アキラ',
    voice: { pitch: 0.6, rate: 0.7 },
    avatar: look('LIGHT', 'BLACK', 'SHORT', 'PLAIN', 'CREAM'),
    build: { height: 1.08, width: 0.9 },
    accessories: [accessory('glasses', '#c9a227')],
  },
];

/**
 * 마을 길 위에 서 있는 주민을 정한다. 건물의 `residentSlugs`에 이름이 있는 주민은 건물 안에 있으므로(입장해야 만난다)
 * 마을에는 세우지 않는다. 어느 건물에도 속하지 않은 주민(장소가 '거리' 등)만 마을 길 위에 고르게 퍼뜨려 세운다.
 * 장소 값은 서버(구글 시트)에서 오므로 주민이 어디 사는지는 코드에 적지 않는다.
 */
export function placeResidents(buildings: VillageBuilding[]): PlacedResident[] {
  const insideSlugs = new Set(buildings.flatMap((building) => building.residentSlugs));
  const outdoor = VILLAGE_RESIDENTS.filter((resident) => !insideSlugs.has(resident.slug));
  const spots = spotsAlongRoads(outdoor.length);
  return outdoor.map((resident, index) => ({ ...resident, ...spots[index] }));
}

/** 캐릭터(원)가 (x, z)에 서 있을 때 어느 주민과든 겹치는지 검사한다. */
export function collidesWithResidents(residents: PlacedResident[], x: number, z: number): boolean {
  return residents.some(
    (resident) => Math.hypot(x - resident.x, z - resident.z) < PLAYER_RADIUS + RESIDENT_RADIUS,
  );
}
