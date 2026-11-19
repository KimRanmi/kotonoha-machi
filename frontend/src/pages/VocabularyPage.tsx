import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { getVocabulary, type VocabularyLevel, type VocabularyPageResult } from '../api/vocabulary';
import styles from './VocabularyPage.module.css';

const LEVEL_TABS: { level: VocabularyLevel; label: string }[] = [
  { level: 'N1', label: 'N1' },
  { level: 'N2', label: 'N2' },
  { level: 'N3', label: 'N3' },
  { level: 'OTHER', label: '그 외' },
];

function VocabularyPage() {
  const [level, setLevel] = useState<VocabularyLevel>('N1');
  const [pageNumber, setPageNumber] = useState(0);
  const [result, setResult] = useState<VocabularyPageResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getVocabulary(level, pageNumber)
      .then((fetched) => {
        if (!cancelled) {
          setResult(fetched);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : '단어장을 불러오지 못했습니다.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [level, pageNumber]);

  function selectLevel(next: VocabularyLevel) {
    if (next === level) {
      return;
    }
    setLevel(next);
    setPageNumber(0);
    setResult(null);
    setErrorMessage(null);
  }

  function selectPage(next: number) {
    setPageNumber(next);
    setResult(null);
    setErrorMessage(null);
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link to="/town" className={styles.backLink}>
          ← 마을로 돌아가기
        </Link>
        <h1 className={styles.title}>학습 단어장</h1>

        <div className={styles.tabs} role="tablist">
          {LEVEL_TABS.map((tab) => (
            <button
              key={tab.level}
              type="button"
              role="tab"
              aria-selected={tab.level === level}
              className={tab.level === level ? styles.tabActive : styles.tab}
              onClick={() => selectLevel(tab.level)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : result === null ? (
          <p className={styles.message}>불러오는 중입니다…</p>
        ) : result.items.length === 0 ? (
          <p className={styles.message}>이 레벨에 저장한 단어가 없어요.</p>
        ) : (
          <ul className={styles.list}>
            {result.items.map((entry) => (
              <li key={entry.id} className={styles.item}>
                <div className={styles.word}>
                  <span className={styles.surface}>{entry.surfaceForm}</span>
                  <span className={styles.reading}>{entry.reading}</span>
                </div>
                <span className={styles.meaning}>{entry.meaning}</span>
                {entry.jlptLevel !== null && (
                  <span className={styles.level}>N{entry.jlptLevel}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {result !== null && result.totalPages > 1 && (
          <nav className={styles.pagination} aria-label="단어장 페이지">
            <button
              type="button"
              className={styles.pageButton}
              disabled={result.page === 0}
              onClick={() => selectPage(result.page - 1)}
              aria-label="이전 페이지"
            >
              ‹
            </button>
            {Array.from({ length: result.totalPages }, (_, index) => (
              <button
                key={index}
                type="button"
                className={index === result.page ? styles.pageButtonActive : styles.pageButton}
                aria-current={index === result.page ? 'page' : undefined}
                onClick={() => selectPage(index)}
              >
                {index + 1}
              </button>
            ))}
            <button
              type="button"
              className={styles.pageButton}
              disabled={result.page >= result.totalPages - 1}
              onClick={() => selectPage(result.page + 1)}
              aria-label="다음 페이지"
            >
              ›
            </button>
          </nav>
        )}
        <p className={styles.message}>
          대화에서 저장한 단어의 읽는 법·JLPT·영어 뜻은 JMdict(CC BY-SA 4.0, jisho.org 제공)에서
          가져오며, 한국어 뜻은 영어 뜻을 AI로 번역한 것입니다.
        </p>
      </div>
    </main>
  );
}

export default VocabularyPage;
