import type { Avatar } from '../api/user';
import { PLAYER_RADIUS } from './villageBuildings';

/** 마을에 서 있는 주민 한 명. 위치(x, z)와 생김새는 코드에 고정한 값이다. */
export interface VillageResident {
  /** 주민 시트의 고유 키(DB `resident.slug`와 같다). */
  slug: string;
  /** 머리 위 이름표에 적히는 일본어 이름. */
  name: string;
  x: number;
  z: number;
  /** 5축 외형. 주민은 사용자가 꾸미지 않으므로 주민마다 미리 정한 값을 쓴다. */
  avatar: Avatar;
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

// 주민 20명은 광장 아래쪽 풀밭에 5열 × 4줄로 세운다(건물·나무와 겹치지 않는 자리).
// 돌아다니는 이동은 다음 단계에서 붙이므로 지금은 모두 제자리에 서 있다.
const COLUMNS = [-14, -7, 0, 7, 14];
const ROWS = [4, 8, 12, 17];

const RESIDENT_LOOKS: { slug: string; name: string; avatar: Avatar }[] = [
  { slug: 'r01', name: 'カイト', avatar: look('TAN', 'BLACK', 'SHORT', 'OVERALLS', 'SKY') },
  { slug: 'r02', name: 'ソラ', avatar: look('FAIR', 'BROWN', 'SHORT', 'PLAIN', 'YELLOW') },
  { slug: 'r03', name: 'ユイ', avatar: look('LIGHT', 'BROWN', 'BOB', 'ONEPIECE', 'PINK') },
  { slug: 'r04', name: 'ダイスケ', avatar: look('FAIR', 'BLACK', 'SHORT', 'STRIPES', 'CREAM') },
  { slug: 'r05', name: 'レイカ', avatar: look('LIGHT', 'BLACK', 'BUNS', 'ONEPIECE', 'CORAL') },
  { slug: 'r06', name: 'ハヤト', avatar: look('FAIR', 'BLACK', 'PONYTAIL', 'PLAIN', 'LAVENDER') },
  {
    slug: 'r07',
    name: 'ミク',
    avatar: look('LIGHT', 'BLONDE', 'BUNS', 'ONEPIECE', 'PINK', 'PINK'),
  },
  { slug: 'r08', name: 'ゲンゾウ', avatar: look('TAN', 'GRAY', 'SHORT', 'OVERALLS', 'MINT') },
  { slug: 'r09', name: 'ナナ', avatar: look('LIGHT', 'BROWN', 'BOB', 'CARDIGAN', 'MINT') },
  { slug: 'r10', name: 'ドウゲン', avatar: look('FAIR', 'BLACK', 'SHORT', 'PLAIN', 'LAVENDER') },
  { slug: 'r11', name: 'リク', avatar: look('TAN', 'BLACK', 'MOHAWK', 'STRIPES', 'SKY', 'SKY') },
  { slug: 'r12', name: 'マリエ', avatar: look('LIGHT', 'BROWN', 'BOB', 'ONEPIECE', 'LAVENDER') },
  { slug: 'r13', name: 'ショウタ', avatar: look('FAIR', 'BROWN', 'SHORT', 'PLAIN', 'PEACH') },
  { slug: 'r14', name: 'アカネ', avatar: look('FAIR', 'RED', 'PONYTAIL', 'OVERALLS', 'CORAL') },
  { slug: 'r15', name: 'セイジ', avatar: look('LIGHT', 'BROWN', 'PONYTAIL', 'CARDIGAN', 'CREAM') },
  { slug: 'r16', name: 'ハルカ', avatar: look('LIGHT', 'BLACK', 'BOB', 'CARDIGAN', 'CREAM') },
  { slug: 'r17', name: 'カツラ', avatar: look('FAIR', 'GRAY', 'BUNS', 'CARDIGAN', 'LAVENDER') },
  { slug: 'r18', name: 'レン', avatar: look('LIGHT', 'GRAY', 'BOB', 'PLAIN', 'SKY', 'SKY') },
  { slug: 'r19', name: 'サクラ', avatar: look('FAIR', 'BLACK', 'SHORT', 'PLAIN', 'CORAL') },
  { slug: 'r20', name: 'アキラ', avatar: look('LIGHT', 'BLACK', 'SHORT', 'PLAIN', 'CREAM') },
];

export const VILLAGE_RESIDENTS: VillageResident[] = RESIDENT_LOOKS.map((resident, index) => ({
  ...resident,
  x: COLUMNS[index % COLUMNS.length],
  z: ROWS[Math.floor(index / COLUMNS.length)],
}));

/** 캐릭터(원)가 (x, z)에 서 있을 때 어느 주민과든 겹치는지 검사한다. */
export function collidesWithResidents(x: number, z: number): boolean {
  return VILLAGE_RESIDENTS.some(
    (resident) => Math.hypot(x - resident.x, z - resident.z) < PLAYER_RADIUS + RESIDENT_RADIUS,
  );
}
