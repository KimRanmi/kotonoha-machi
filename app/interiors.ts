import type { Building } from "./buildings";

// 건물 내부 방 데이터. 방 하나 = 크기 + 벽 + 문 + 가구 목록 + 주민이 서는 자리.
// 가구는 모두 "x/y/크기/모양/색"으로만 표현된 데이터라서, 주민 건물처럼 템플릿에 고정된 방도
// (ROOM_TEMPLATES), 나중에 사용자가 가구를 옮기는 방(내 집)도 같은 Room 구조로 표현할 수 있다.
// 내 집은 가구를 저장소에서 읽어 Room.furniture에 채우고, 가구마다 movable을 true로 두면 된다.

export type InteriorKind = "cafe" | "shop" | "hall" | "learning" | "home";

export interface Furniture {
  id: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: "rect" | "round";
  color: string;
  emoji?: string;
  // 충돌하지 않는 장식(칠판처럼 벽에 붙은 것 등)은 false. 기본은 통과 불가.
  solid?: boolean;
  // 사용자가 옮길 수 있는 가구인지. 주민 건물 템플릿은 모두 false(미리 배치, 변경 불가).
  movable?: boolean;
}

export interface Room {
  id: string;
  width: number;
  height: number;
  // 위쪽 벽의 두께. 벽 영역은 걸어 들어갈 수 없다.
  wallHeight: number;
  floorColor: string;
  wallColor: string;
  // 문(입구). 캐릭터가 이 영역에 닿으면 방을 나간다.
  door: { x: number; y: number; width: number; height: number };
  // 캐릭터가 방에 들어왔을 때 서는 자리(문 근처). 캐릭터 좌상단 기준.
  spawn: { x: number; y: number };
  // 주민이 서는 자리(캐릭터 좌상단 기준). 주민이 없는 방이면 무시된다.
  residentSpot: { x: number; y: number };
  furniture: Furniture[];
}

// 방 크기. 캐릭터(CHAR_SIZE)는 그대로라서 방이 커질수록 상대적으로 넓은 공간이 된다.
// 아래 템플릿의 좌표는 예전 기준(640x480)으로 적혀 있고, baseRoom이 ROOM_SCALE만큼 키워서 쓴다.
export const ROOM_SCALE = 1.25;
const ROOM_W = 640 * ROOM_SCALE;
const ROOM_H = 480 * ROOM_SCALE;

export function scaleFurniture(list: Furniture[]): Furniture[] {
  return list.map((f) => ({ ...f, x: f.x * ROOM_SCALE, y: f.y * ROOM_SCALE, width: f.width * ROOM_SCALE, height: f.height * ROOM_SCALE }));
}

// 모든 템플릿이 공유하는 뼈대: 같은 크기, 아래쪽 가운데 문, 문 바로 위 스폰.
function baseRoom(
  id: string,
  floorColor: string,
  wallColor: string,
  residentSpot: { x: number; y: number },
  furniture: Furniture[]
): Room {
  return {
    id,
    width: ROOM_W,
    height: ROOM_H,
    wallHeight: 80 * ROOM_SCALE,
    floorColor,
    wallColor,
    door: { x: ROOM_W / 2 - 50, y: ROOM_H - 20, width: 100, height: 20 },
    spawn: { x: ROOM_W / 2 - 16, y: ROOM_H - 120 },
    residentSpot: { x: residentSpot.x * ROOM_SCALE, y: residentSpot.y * ROOM_SCALE },
    furniture: scaleFurniture(furniture),
  };
}

const fixed = { movable: false } as const;

export const ROOM_TEMPLATES: Record<InteriorKind, Room> = {
  cafe: baseRoom("cafe", "#e8d5b5", "#a8683a", { x: 290, y: 112 }, [
    { id: "counter", label: "카운터", x: 40, y: 110, width: 220, height: 44, shape: "rect", color: "#7a4a28", emoji: "☕", ...fixed },
    { id: "table1", x: 380, y: 200, width: 64, height: 64, shape: "round", color: "#b98a5a", ...fixed },
    { id: "table2", x: 500, y: 310, width: 64, height: 64, shape: "round", color: "#b98a5a", ...fixed },
    { id: "table3", x: 110, y: 300, width: 64, height: 64, shape: "round", color: "#b98a5a", ...fixed },
  ]),
  shop: baseRoom("shop", "#d9dfe8", "#4a638a", { x: 304, y: 112 }, [
    { id: "shelf1", label: "선반", x: 50, y: 100, width: 170, height: 40, shape: "rect", color: "#8a6a45", emoji: "🥫", ...fixed },
    { id: "shelf2", label: "선반", x: 420, y: 100, width: 170, height: 40, shape: "rect", color: "#8a6a45", emoji: "🧺", ...fixed },
    { id: "display1", x: 90, y: 230, width: 60, height: 100, shape: "rect", color: "#a88b63", ...fixed },
    { id: "display2", x: 200, y: 230, width: 60, height: 100, shape: "rect", color: "#a88b63", ...fixed },
    { id: "register", label: "계산대", x: 420, y: 280, width: 150, height: 44, shape: "rect", color: "#5b4636", emoji: "💴", ...fixed },
  ]),
  hall: baseRoom("hall", "#dde5cf", "#5f7f45", { x: 304, y: 112 }, [
    { id: "desk1", label: "책상", x: 70, y: 110, width: 150, height: 50, shape: "rect", color: "#8a7350", emoji: "📋", ...fixed },
    { id: "desk2", label: "책상", x: 420, y: 110, width: 150, height: 50, shape: "rect", color: "#8a7350", emoji: "🗂️", ...fixed },
    { id: "meeting", label: "회의 테이블", x: 170, y: 250, width: 300, height: 56, shape: "rect", color: "#7a6544", ...fixed },
    { id: "plant", x: 560, y: 380, width: 40, height: 40, shape: "round", color: "#4f8a4a", emoji: "🪴", ...fixed },
  ]),
  // 내 집: 가구는 비어 있고, 실제 가구는 저장소(HomeFurnitureState)에서 읽어 채운다(app/home.ts).
  home: baseRoom("home", "#f0dfc8", "#b5566b", { x: 0, y: 0 }, []),
  // 테마로 지은 학습관 공통 템플릿(테마마다 방을 새로 디자인하지 않는다).
  learning: baseRoom("learning", "#ead9c1", "#6a5a8a", { x: 304, y: 100 }, [
    { id: "board", label: "칠판", x: 180, y: 14, width: 280, height: 56, shape: "rect", color: "#2f4a3a", emoji: "✏️", solid: false, ...fixed },
    { id: "desk1", label: "책상", x: 90, y: 240, width: 90, height: 40, shape: "rect", color: "#a07a4c", ...fixed },
    { id: "desk2", label: "책상", x: 275, y: 240, width: 90, height: 40, shape: "rect", color: "#a07a4c", ...fixed },
    { id: "desk3", label: "책상", x: 460, y: 240, width: 90, height: 40, shape: "rect", color: "#a07a4c", ...fixed },
    { id: "desk4", label: "책상", x: 90, y: 330, width: 90, height: 40, shape: "rect", color: "#a07a4c", ...fixed },
    { id: "desk5", label: "책상", x: 460, y: 330, width: 90, height: 40, shape: "rect", color: "#a07a4c", ...fixed },
  ]),
};

// 건물이 어떤 템플릿을 쓰는지. 정적 건물은 Building.kind를 직접 갖고, 테마로 지은 건물
// (저장소에서 읽은, kind가 없는 건물)은 모두 공통 학습관 템플릿을 쓴다.
export function getInteriorKind(building: Building): InteriorKind {
  return building.kind ?? "learning";
}

export function getRoomTemplate(building: Building): Room {
  return ROOM_TEMPLATES[getInteriorKind(building)];
}

// 방에서 캐릭터가 통과할 수 없는 영역들: 위쪽 벽 + solid 가구(+ 주민이 서 있는 자리).
export function getRoomObstacles(room: Room): { x: number; y: number; width: number; height: number }[] {
  return [
    { x: 0, y: 0, width: room.width, height: room.wallHeight },
    ...room.furniture.filter((f) => f.solid !== false),
  ];
}
