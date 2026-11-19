import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { getVocabulary, type VocabularyEntry } from '../api/vocabulary';
import styles from './VocabularyPage.module.css';

function VocabularyPage() {
  const [entries, setEntries] = useState<VocabularyEntry[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getVocabulary()
      .then((fetchedEntries) => {
        if (!cancelled) {
          setEntries(fetchedEntries);
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
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link to="/town" className={styles.backLink}>
          ← 마을로 돌아가기
        </Link>
        <h1 className={styles.title}>학습 단어장</h1>

        {errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : entries === null ? (
          <p className={styles.message}>불러오는 중입니다…</p>
        ) : entries.length === 0 ? (
          <p className={styles.message}>아직 저장한 단어가 없어요.</p>
        ) : (
          <ul className={styles.list}>
            {entries.map((entry) => (
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
        <p className={styles.message}>
          대화에서 저장한 단어의 읽는 법·영어 뜻은 JMdict(CC BY-SA 4.0)를 기반으로 하는
          jisho.org에서 조회하고, JLPT 레벨은 jisho.org가 붙인 JLPT 태그(Jonathan Waller의 JLPT
          Resources 기준)를 따릅니다. 한국어 뜻은 영어 뜻을 AI(Gemini)로 번역한 것이며, 번역하지
          못한 경우 영어 뜻이 그대로 저장됩니다. 사전·번역에는 오류가 있을 수 있습니다.
        </p>
      </div>
    </main>
  );
}

export default VocabularyPage;
