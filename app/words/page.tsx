"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LearnedWord } from "@/lib/types";
import { fetchWords, removeWord as removeWordFromServer } from "@/lib/storage";

export default function WordsPage() {
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchWords()
      .then((loaded) => {
        if (!cancelled) setWords(loaded);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "학습 단어를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 화면에서는 바로 지우고 서버에 반영한다. 실패하면 되돌리고 에러를 보여준다.
  async function removeWord(word: string) {
    const removed = words.find((w) => w.word === word);
    setWords((prev) => prev.filter((w) => w.word !== word));
    setError(null);
    try {
      await removeWordFromServer(word);
    } catch (err) {
      if (removed) setWords((prev) => (prev.some((w) => w.word === word) ? prev : [...prev, removed]));
      setError(err instanceof Error ? err.message : "단어를 삭제하지 못했습니다.");
    }
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
        <div className="headerActions">
          <Link href="/villagers" className="pill">
            주민 목록
          </Link>
          <Link href="/" className="pill">
            ← 마을로 돌아가기
          </Link>
        </div>
      </header>

      <main className="wordListMain">
        {error && (
          <p className="emptyHint" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="emptyHint">불러오는 중…</p>
        ) : words.length === 0 ? (
          <p className="emptyHint">
            아직 담은 단어가 없어요. 마을에서 주민과 대화하며 주민의 말 중 궁금한 단어를 탭해보세요.
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
