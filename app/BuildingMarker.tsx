import type { Building } from "./buildings";
import { BuildingArt } from "./BuildingArt";
import styles from "./town.module.css";

// 건물 한 채를 그리는 컴포넌트. 건물별 기능(해금 상태 표시, 아이콘, 클릭 시 동작 등)을
// 추가할 때는 이 파일만 수정하면 되고, 마을 오픈맵/이동 로직(page.tsx)은 건드릴 필요 없다.
// isNear는 캐릭터가 건물에 들어갈 수 있는 거리에 들어왔는지를 나타내며, true일 때
// 건물 위에 상호작용 힌트(문 아이콘)를 띄운다.
// 그림은 building.kind로 정해진다(app/BuildingArt.tsx). 건물 영역 자체는 그대로 쓰므로
// 충돌/입장 판정에는 영향이 없다.
export function BuildingMarker({
  building,
  isNear,
  isConstructing,
  mapHeight,
}: {
  building: Building;
  isNear: boolean;
  isConstructing?: boolean;
  mapHeight: number;
}) {
  const classes = [styles.building];
  if (isConstructing) classes.push(styles.constructing);
  // 맵 아래쪽 끝에 붙은 건물은 이름표가 잘리지 않게 위쪽에 단다.
  const labelAbove = building.y + building.height + 16 > mapHeight;
  const labelClasses = [styles.buildingLabel];
  if (labelAbove) labelClasses.push(styles.labelAbove);
  if (building.isHome) labelClasses.push(styles.homeLabel);
  if (isNear) labelClasses.push(styles.labelNear);
  return (
    <div
      className={classes.join(" ")}
      style={{
        left: building.x,
        top: building.y,
        width: building.width,
        height: building.height,
      }}
    >
      <BuildingArt kind={building.kind} w={building.width} h={building.height} />
      {isNear && <div className={styles.interactionHint}>🚪</div>}
      {isConstructing && <div className={styles.interactionHint}>🚧</div>}
      <span className={labelClasses.join(" ")}>{building.label}</span>
    </div>
  );
}
