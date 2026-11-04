import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { toKana, toKatakana } from 'wanakana';
import styles from './JapaneseInput.module.css';

type KanaMode = 'toHiragana' | 'toKatakana';

/** 가상 키보드 키. 공백 문자는 빈 칸이고, 히라가나로 적고 가타카나 모드에서 변환해 보여 준다. */
const KEY_ROWS = [
  'あいうえお',
  'かきくけこ',
  'さしすせそ',
  'たちつてと',
  'なにぬねの',
  'はひふへほ',
  'まみむめも',
  'やゆよ',
  'らりるれろ',
  'わをんー',
  'がぎぐげご',
  'ざじずぜぞ',
  'だぢづでど',
  'ばびぶべぼ',
  'ぱぴぷぺぽ',
  'ぁぃぅぇぉ',
  'ゃゅょっ',
];

interface JapaneseInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * 영문 키보드로 친 로마자를 히라가나(또는 가타카나)로 바꿔 주는 입력란.
 * 히라가나/가타카나는 사용자가 버튼으로 직접 전환한다. 화면 가상 키보드로도 입력할 수 있다.
 */
function JapaneseInput({ value, onChange, placeholder }: JapaneseInputProps) {
  const [mode, setMode] = useState<KanaMode>('toHiragana');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // IMEMode: 입력 도중의 "n"은 다음 글자를 볼 때까지 "ん"으로 바꾸지 않는다.
    onChange(toKana(event.target.value, { IMEMode: mode }));
  }

  function pressKey(kana: string) {
    onChange(value + (mode === 'toKatakana' ? toKatakana(kana) : kana));
  }

  function deleteLast() {
    // 이모지 등 서로게이트 쌍이 깨지지 않도록 문자 단위로 자른다.
    onChange(Array.from(value).slice(0, -1).join(''));
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
        />
        <button
          type="button"
          className={`${styles.toolButton} ${mode === 'toKatakana' ? styles.toolButtonActive : ''}`}
          onClick={() => setMode(mode === 'toHiragana' ? 'toKatakana' : 'toHiragana')}
        >
          {mode === 'toHiragana' ? 'あ 히라가나' : 'ア 가타카나'}
        </button>
        <button
          type="button"
          className={`${styles.toolButton} ${isKeyboardOpen ? styles.toolButtonActive : ''}`}
          onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
        >
          키보드
        </button>
      </div>
      {isKeyboardOpen && (
        <div className={styles.keyboard}>
          {KEY_ROWS.map((row) => (
            <div key={row} className={styles.keyRow}>
              {Array.from(row).map((kana) => (
                <button
                  key={kana}
                  type="button"
                  className={styles.key}
                  onClick={() => pressKey(kana)}
                >
                  {mode === 'toKatakana' ? toKatakana(kana) : kana}
                </button>
              ))}
            </div>
          ))}
          <button type="button" className={styles.deleteKey} onClick={deleteLast}>
            ⌫ 지우기
          </button>
        </div>
      )}
    </div>
  );
}

export default JapaneseInput;
