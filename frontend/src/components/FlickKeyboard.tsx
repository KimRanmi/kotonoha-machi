import { useState } from 'react';
import type { PointerEvent } from 'react';
import { toKatakana } from 'wanakana';
import styles from './JapaneseKeyboard.module.css';

/** [가운데, 왼쪽, 위, 오른쪽, 아래] 순서. 빈 문자열은 그 방향에 글자가 없다는 뜻이다. */
const FLICK_KEYS = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', '', 'ゆ', '', 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', 'を', 'ん', 'ー', ''],
  ['、', '。', '？', '！', ''],
];

/** 팝업(3x3 격자)에서 [가운데, 왼쪽, 위, 오른쪽, 아래]가 놓이는 [행, 열]. */
const POPUP_CELLS = [
  [2, 2],
  [2, 1],
  [1, 2],
  [2, 3],
  [3, 2],
];

/** 이 거리(px)보다 적게 움직이면 밀지 않은 것(탭)으로 본다. */
const FLICK_THRESHOLD = 18;

interface Pressed {
  keyIndex: number;
  direction: number;
  startX: number;
  startY: number;
}

interface FlickKeyboardProps {
  isKatakana: boolean;
  onKana: (kana: string) => void;
  onModify: () => void;
  onSpace: () => void;
  onDelete: () => void;
}

/** 스마트폰 일본어 키보드처럼 키를 눌러 밀어서(플릭) 글자를 고르는 12키 키보드. */
function FlickKeyboard({ isKatakana, onKana, onModify, onSpace, onDelete }: FlickKeyboardProps) {
  const [pressed, setPressed] = useState<Pressed | null>(null);

  function show(kana: string) {
    return isKatakana ? toKatakana(kana) : kana;
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, keyIndex: number) {
    // 손가락이 키 밖으로 나가도 이 키가 move/up 이벤트를 계속 받는다.
    event.currentTarget.setPointerCapture(event.pointerId);
    setPressed({ keyIndex, direction: 0, startX: event.clientX, startY: event.clientY });
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (pressed === null) {
      return;
    }
    const dx = event.clientX - pressed.startX;
    const dy = event.clientY - pressed.startY;
    let direction = 0;
    if (Math.hypot(dx, dy) >= FLICK_THRESHOLD) {
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx < 0 ? 1 : 3;
      } else {
        direction = dy < 0 ? 2 : 4;
      }
    }
    setPressed({ ...pressed, direction });
  }

  function handlePointerUp() {
    if (pressed === null) {
      return;
    }
    const chars = FLICK_KEYS[pressed.keyIndex];
    // 글자가 없는 방향으로 밀었으면 가운데 글자를 쓴다.
    onKana(chars[pressed.direction] || chars[0]);
    setPressed(null);
  }

  return (
    <div className={styles.flickGrid}>
      {FLICK_KEYS.map((chars, keyIndex) => (
        <button
          key={chars[0]}
          type="button"
          className={`${styles.key} ${styles.flickKey}`}
          style={{ gridArea: `k${keyIndex}` }}
          onPointerDown={(event) => handlePointerDown(event, keyIndex)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setPressed(null)}
        >
          {show(chars[0])}
          {pressed?.keyIndex === keyIndex && (
            <span className={styles.flickPopup}>
              {chars.map((kana, direction) =>
                kana === '' ? null : (
                  <span
                    key={direction}
                    className={
                      direction === pressed.direction
                        ? `${styles.flickChoice} ${styles.flickChoiceActive}`
                        : styles.flickChoice
                    }
                    style={{
                      gridRow: POPUP_CELLS[direction][0],
                      gridColumn: POPUP_CELLS[direction][1],
                    }}
                  >
                    {show(kana)}
                  </span>
                ),
              )}
            </span>
          )}
        </button>
      ))}
      <button
        type="button"
        className={`${styles.key} ${styles.sideKey}`}
        style={{ gridArea: 'modify' }}
        onClick={onModify}
      >
        小゛゜
      </button>
      <button
        type="button"
        className={`${styles.key} ${styles.sideKey}`}
        style={{ gridArea: 'delete' }}
        onClick={onDelete}
      >
        ⌫
      </button>
      <button
        type="button"
        className={`${styles.key} ${styles.sideKey}`}
        style={{ gridArea: 'space' }}
        onClick={onSpace}
      >
        공백
      </button>
    </div>
  );
}

export default FlickKeyboard;
