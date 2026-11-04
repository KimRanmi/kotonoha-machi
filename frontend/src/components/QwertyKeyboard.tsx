import styles from './JapaneseKeyboard.module.css';

const LETTER_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

interface QwertyKeyboardProps {
  onLetter: (letter: string) => void;
  onSpace: () => void;
  onDelete: () => void;
}

/** PC 키보드 배열 그대로 로마자를 눌러 입력하는 키보드. 변환은 입력란이 한다. */
function QwertyKeyboard({ onLetter, onSpace, onDelete }: QwertyKeyboardProps) {
  return (
    <div className={styles.qwerty}>
      {LETTER_ROWS.map((row) => (
        <div key={row} className={styles.qwertyRow}>
          {Array.from(row).map((letter) => (
            <button
              key={letter}
              type="button"
              className={`${styles.key} ${styles.letterKey}`}
              onClick={() => onLetter(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
      ))}
      <div className={styles.qwertyRow}>
        <button
          type="button"
          className={`${styles.key} ${styles.letterKey}`}
          onClick={() => onLetter('-')}
        >
          ー
        </button>
        <button type="button" className={`${styles.key} ${styles.spaceKey}`} onClick={onSpace}>
          공백
        </button>
        <button type="button" className={`${styles.key} ${styles.letterKey}`} onClick={onDelete}>
          ⌫
        </button>
      </div>
    </div>
  );
}

export default QwertyKeyboard;
