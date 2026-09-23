"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LearnedWord } from "@/lib/types";
import { WORDS_STORAGE_KEY, loadFromStorage, saveToStorage } from "@/lib/storage";

export default function WordsPage() {
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // localStorage는 서버에 없으므로 클라이언트 마운트 후 한 번만 읽어와 하이드레이션한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWords(loadFromStorage<LearnedWord[]>(WORDS_STORAGE_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveToStorage(WORDS_STORAGE_KEY, words);
  }, [words, hydrated]);

  function removeWord(word: string) {
    setWords((prev) => prev.filter((w) => w.word !== word));
  }

  return (
    <div className="page">
      <header className="header">
        <div className="villagerInfo">
          <div>
            <div className="villagerName">학습 목록</div>
            <div className="villagerDesc">대화 중 탭해서 담은 단어들</div>
          </div>
        </div>
        <Link href="/" className="navLink">
          ← 대화로 돌아가기
        </Link>
      </header>

      <main className="wordListMain">
        {words.length === 0 ? (
          <p className="emptyHint">
            아직 담은 단어가 없어요. 대화 화면에서 주민의 말 중 궁금한 단어를 탭해보세요.
          </p>
        ) : (
          <ul className="wordList">
            {[...words]
              .sort((a, b) => b.addedAt - a.addedAt)
              .map((w) => (
                <li key={w.word} className="wordListItem">
                  <span className="wordListText">{w.word}</span>
                  <button
                    type="button"
                    className="wordRemoveButton"
                    onClick={() => removeWord(w.word)}
                    aria-label={`${w.word} 삭제`}
                  >
                    ✕
                  </button>
                </li>
              ))}
          </ul>
        )}
      </main>
    </div>
  );
}
