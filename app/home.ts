import { NEW_BUILDING_SIZE, type Building } from "./buildings";
import type { Furniture, Room } from "./interiors";
import { CHAR_SIZE, rectsOverlap, type Point, type Rect } from "@/lib/walk";
import type { HomeFurnitureState, HomePosition } from "@/lib/storage";

// 내 집: 게임 시작부터 존재하고, 마을 맵 위치만 온보딩에서 사용자가 정한다.
export const HOME_BUILDING_ID = "home";

export function makeHomeBuilding(position: HomePosition): Building {
  return {
    id: HOME_BUILDING_ID,
    x: position.x,
    y: position.y,
    ...NEW_BUILDING_SIZE,
    label: "내 집",
    color: "#d9577a",
    kind: "home",
    isHome: true,
  };
}

const m = { movable: true } as const;

// 처음부터 제공되는 기본 가구. 이번 구현에서는 이게 전부다(추가 획득 방식은 미정).
const DEFAULT_PLACED: Furniture[] = [
  { id: "bed", label: "침대", x: 40, y: 110, width: 90, height: 130, shape: "rect", color: "#c9a0dc", emoji: "🛏️", ...m },
  { id: "table", label: "테이블", x: 400, y: 200, width: 64, height: 64, shape: "round", color: "#b98a5a", ...m },
  { id: "chair", label: "의자", x: 480, y: 214, width: 36, height: 36, shape: "rect", color: "#8a6a45", emoji: "🪑", ...m },
  { id: "shelf", label: "책장", x: 400, y: 96, width: 150, height: 40, shape: "rect", color: "#7a5a3a", emoji: "📚", ...m },
];

export function defaultHomeFurniture(): HomeFurnitureState {
  return { placed: DEFAULT_PLACED.map((f) => ({ ...f })), stored: [] };
}

// 문 앞 통로: 문 폭 그대로 문에서 스폰 지점 위까지. 여기에는 가구를 놓을 수 없다.
export function getDoorClearZone(room: Room): Rect {
  const top = room.spawn.y - CHAR_SIZE;
  return { x: room.door.x, y: top, width: room.door.width, height: room.height - top };
}

export type PlaceFailure = "wall" | "furniture" | "door" | "character";

// 가구 rect를 놓을 수 있는지. 놓을 수 없으면 이유를 돌려준다. ignoreId는 옮기는 가구 자신.
export function checkFurniturePlacement(
  room: Room,
  rect: Rect,
  placed: Furniture[],
  character: Point,
  ignoreId?: string
): PlaceFailure | null {
  if (
    rect.x < 0 ||
    rect.y < room.wallHeight ||
    rect.x + rect.width > room.width ||
    rect.y + rect.height > room.height
  ) {
    return "wall";
  }
  const c = getDoorClearZone(room);
  if (rectsOverlap(rect.x, rect.y, rect.width, rect.height, c.x, c.y, c.width, c.height)) {
    return "door";
  }
  if (
    placed.some(
      (f) =>
        f.id !== ignoreId &&
        rectsOverlap(rect.x, rect.y, rect.width, rect.height, f.x, f.y, f.width, f.height)
    )
  ) {
    return "furniture";
  }
  // 캐릭터 발밑에 놓으면 꾸미기를 끝낸 뒤 움직일 수 없게 되므로 막는다.
  if (rectsOverlap(rect.x, rect.y, rect.width, rect.height, character.x, character.y, CHAR_SIZE, CHAR_SIZE)) {
    return "character";
  }
  return null;
}

export const PLACE_FAILURE_MESSAGE: Record<PlaceFailure, string> = {
  wall: "벽이나 방 밖에는 놓을 수 없어요.",
  furniture: "다른 가구와 겹쳐요.",
  door: "문 앞 통로는 비워 두어야 해요.",
  character: "캐릭터가 서 있는 자리예요. 조금 비켜서 놓아 보세요.",
};
