import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { getCompletedThemes, type CompletedTheme } from '../api/theme';
import styles from './CompletedThemesPage.module.css';

/** 완료 시각을 한국 시간 기준 `YYYY-MM-DD`로 바꾼다. */
function formatCompletedDate(completedAt: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(completedAt));
}

function CompletedThemesPage() {
  const [themes, setThemes] = useState<CompletedTheme[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCompletedThemes()
      .then((fetchedThemes) => {
        if (!cancelled) {
          setThemes(fetchedThemes);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : '학습을 불러오지 못했습니다.',
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
        <h1 className={styles.title}>완료한 학습</h1>

        {errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : themes === null ? (
          <p className={styles.message}>불러오는 중입니다…</p>
        ) : themes.length === 0 ? (
          <p className={styles.message}>아직 완료한 학습이 없어요.</p>
        ) : (
          <ul className={styles.list}>
            {themes.map((theme, index) => (
              <li key={theme.id}>
                <Link to={`/town/themes/${theme.id}`} className={styles.item}>
                  <span className={styles.itemTitle}>
                    {formatCompletedDate(theme.completedAt)} | {index + 1}일차 학습 완료[
                    {theme.levels.map((level) => `N${level}`).join(', ')}]
                  </span>
                  <span className={styles.itemCta}>다시 보기 →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export default CompletedThemesPage;
