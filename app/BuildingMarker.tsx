import type { Building } from "./buildings";
import { BuildingArt, buildingHeights } from "./BuildingArt";
import { project } from "./iso";
import styles from "./town.module.css";

// 건물 한 채를 그리는 컴포넌트. 건물별 기능(해금 상태 표시, 아이콘, 클릭 시 동작 등)을
// 추가할 때는 이 파일만 수정하면 되고, 마을 오픈맵/이동 로직(page.tsx)은 건드릴 필요 없다.
// 그림은 SVG(<g>)로 마을 SVG 안에서 깊이 순서대로 그려지고(BuildingMarker),
// 이름표와 "들어갈 수 있어요" 힌트는 그 위에 얹는 HTML이다(BuildingTag).
// 건물 영역(월드 좌표) 자체는 그대로이므로 충돌/입장 판정에는 영향이 없다.

// 깊이 정렬용 값: 건물의 가장 앞쪽 모서리(월드 x+y가 가장 큰 점)
export function buildingDepth(b: Building) {
  return b.x + b.width + b.y + b.height;
}

export function BuildingMarker({ building, isConstructing }: { building: Building; isConstructing?: boolean }) {
  return (
    <g className={isConstructing ? styles.constructing : undefined}>
      <BuildingArt b={building} />
    </g>
  );
}

export function BuildingTag({
  building,
  isNear,
  isConstructing,
}: {
  building: Building;
  isNear: boolean;
  isConstructing?: boolean;
}) {
  const { wall, roof } = buildingHeights(building.kind);
  // 이름표: 가장 앞쪽 모서리 아래. 힌트: 지붕 위.
  const [lx, ly] = project(building.x + building.width, building.y + building.height, 0);
  const [hx, hy] = project(building.x + building.width / 2, building.y + building.height / 2, wall + roof);
  const labelClasses = [styles.buildingLabel];
  if (building.isHome) labelClasses.push(styles.homeLabel);
  if (isNear) labelClasses.push(styles.labelNear);
  return (
    <>
      <span className={labelClasses.join(" ")} style={{ left: lx, top: ly + 2 }}>
        {building.label}
      </span>
      {(isNear || isConstructing) && (
        <div className={styles.interactionHint} style={{ left: hx, top: hy - 40 }}>
          {isConstructing ? "🚧" : "🚪"}
        </div>
      )}
    </>
  );
}
