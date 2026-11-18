import { useEffect, useRef } from 'react';
import { touchMove } from '../lib/touchMove';
import styles from './Joystick.module.css';

const RADIUS = 40; // 손잡이가 움직일 수 있는 최대 거리(px). 바닥(112px) 안에 손잡이(48px)가 머무는 크기
const DEAD_ZONE = 0.25; // 반지름의 이 비율 안쪽은 살짝 건드린 것으로 보고 움직이지 않는다

/**
 * 가상 조이스틱. 누르고 끌면 그 방향으로 캐릭터가 걷는다(세기와 상관없이 같은 속도).
 * 방향은 키보드와 같은 쿼터뷰 기준으로 바꿔 touchMove에 쓴다. 터치와 마우스 모두 쓸 수 있다.
 */
function Joystick() {
  const knobRef = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<number | null>(null);

  const release = () => {
    activePointerRef.current = null;
    touchMove.x = 0;
    touchMove.z = 0;
    if (knobRef.current) {
      knobRef.current.style.transform = '';
    }
  };

  // 조이스틱이 사라질 때(채팅창이 열려 화면에서 빠질 때 등) 이동 입력이 남아 있지 않게 한다.
  useEffect(() => release, []);

  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // 화면 기준: 오른쪽이 +x, 아래가 +y
    let sx = event.clientX - (rect.left + rect.width / 2);
    let sy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(sx, sy);
    if (distance > RADIUS) {
      sx = (sx / distance) * RADIUS;
      sy = (sy / distance) * RADIUS;
    }
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${sx}px, ${sy}px)`;
    }
    if (Math.hypot(sx, sy) < RADIUS * DEAD_ZONE) {
      touchMove.x = 0;
      touchMove.z = 0;
      return;
    }
    // 화면 위쪽은 월드 (-1, -1), 오른쪽은 (+1, -1)이다(sceneCommon의 KEY_DIRECTIONS와 같다).
    touchMove.x = sx + sy;
    touchMove.z = sy - sx;
  };

  return (
    <div
      className={styles.base}
      onPointerDown={(event) => {
        if (activePointerRef.current !== null) {
          return;
        }
        activePointerRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
      }}
      onPointerMove={(event) => {
        if (event.pointerId === activePointerRef.current) {
          update(event);
        }
      }}
      onPointerUp={(event) => {
        if (event.pointerId === activePointerRef.current) {
          release();
        }
      }}
      onPointerCancel={(event) => {
        if (event.pointerId === activePointerRef.current) {
          release();
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
      aria-hidden="true"
    >
      <div ref={knobRef} className={styles.knob} />
    </div>
  );
}

export default Joystick;
