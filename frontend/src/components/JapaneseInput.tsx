import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { toHiragana, toKana, toKatakana } from 'wanakana';
import FlickKeyboard from './FlickKeyboard';
import QwertyKeyboard from './QwertyKeyboard';
import styles from './JapaneseInput.module.css';

type KanaMode = 'toHiragana' | 'toKatakana';

/** `゛゜` 키가 직전 글자를 순서대로 바꿀 때 쓰는 묶음(か → が → か, は → ば → ぱ → は ...). */
const MODIFY_CYCLES = [
  'あぁ',
  'いぃ',
  'うぅ',
  'えぇ',
  'おぉ',
  'かが',
  'きぎ',
  'くぐ',
  'けげ',
  'こご',
  'さざ',
  'しじ',
  'すず',
  'せぜ',
  'そぞ',
  'ただ',
  'ちぢ',
  'つっづ',
  'てで',
  'とど',
  'はばぱ',
  'ひびぴ',
  'ふぶぷ',
  'へべぺ',
  'ほぼぽ',
  'やゃ',
  'ゆゅ',
  'よょ',
];

type KeyboardType = 'flick' | 'qwerty';

interface JapaneseInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  keyboard?: KeyboardType;
}

/**
 * 영문 키보드로 친 로마자를 히라가나(또는 가타카나)로 바꿔 주는 입력란.
 * 히라가나/가타카나는 사용자가 버튼으로 직접 전환한다. 화면 가상 키보드로도 입력할 수 있다.
 */
function JapaneseInput({ value, onChange, placeholder, keyboard = 'flick' }: JapaneseInputProps) {
  const [mode, setMode] = useState<KanaMode>('toHiragana');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // IMEMode: 입력 도중의 "n"은 다음 글자를 볼 때까지 "ん"으로 바꾸지 않는다.
    onChange(toKana(event.target.value, { IMEMode: mode }));
  }

  function appendKana(kana: string) {
    onChange(value + kana);
  }

  function appendLetter(letter: string) {
    onChange(toKana(value + letter, { IMEMode: mode }));
  }

  function modifyLast() {
    const chars = Array.from(value);
    const last = chars.pop();
    if (last === undefined) {
      return;
    }
    const hiragana = toHiragana(last);
    const cycle = MODIFY_CYCLES.find((group) => group.includes(hiragana));
    if (cycle === undefined) {
      return;
    }
    const next = cycle[(cycle.indexOf(hiragana) + 1) % cycle.length];
    onChange(chars.join('') + (mode === 'toKatakana' ? toKatakana(next) : next));
  }

  function appendSpace() {
    onChange(`${value} `);
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
          {keyboard === 'flick' ? (
            <FlickKeyboard
              isKatakana={mode === 'toKatakana'}
              onKana={appendKana}
              onModify={modifyLast}
              onSpace={appendSpace}
              onDelete={deleteLast}
            />
          ) : (
            <QwertyKeyboard onLetter={appendLetter} onSpace={appendSpace} onDelete={deleteLast} />
          )}
        </div>
      )}
    </div>
  );
}

export default JapaneseInput;
