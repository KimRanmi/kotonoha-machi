import type { Building } from "./buildings";
import styles from "./town.module.css";

// 건물 한 채를 그리는 컴포넌트. 건물별 기능(해금 상태 표시, 아이콘, 클릭 시 동작 등)을
// 추가할 때는 이 파일만 수정하면 되고, 마을 오픈맵/이동 로직(page.tsx)은 건드릴 필요 없다.
// isNear는 캐릭터가 건물에 들어갈 수 있는 거리에 들어왔는지를 나타내며, true일 때
// 건물 위에 상호작용 힌트(문 아이콘)를 띄운다.
export function BuildingMarker({
  building,
  isNear,
  isConstructing,
}: {
  building: Building;
  isNear: boolean;
  isConstructing?: boolean;
}) {
  return (
    <div
      className={
        isConstructing
          ? `${styles.building} ${styles.constructing}`
          : styles.building
      }
      style={{
        left: building.x,
        top: building.y,
        width: building.width,
        height: building.height,
        background: building.color,
      }}
    >
      {isNear && <div className={styles.interactionHint}>🚪</div>}
      {isConstructing && <div className={styles.interactionHint}>🚧</div>}
      {building.label}
    </div>
  );
}
