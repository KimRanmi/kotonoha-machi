import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { toKana } from 'wanakana';

type KanaMode = 'toHiragana' | 'toKatakana';

interface JapaneseInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * 영문 키보드로 친 로마자를 히라가나(또는 가타카나)로 바꿔 주는 입력란.
 * 히라가나/가타카나는 사용자가 버튼으로 직접 전환한다.
 */
function JapaneseInput({ value, onChange, placeholder }: JapaneseInputProps) {
  const [mode, setMode] = useState<KanaMode>('toHiragana');

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // IMEMode: 입력 도중의 "n"은 다음 글자를 볼 때까지 "ん"으로 바꾸지 않는다.
    onChange(toKana(event.target.value, { IMEMode: mode }));
  }

  return (
    <div>
      <input value={value} onChange={handleChange} placeholder={placeholder} />
      <button
        type="button"
        onClick={() => setMode(mode === 'toHiragana' ? 'toKatakana' : 'toHiragana')}
      >
        {mode === 'toHiragana' ? 'あ 히라가나' : 'ア 가타카나'}
      </button>
    </div>
  );
}

export default JapaneseInput;
