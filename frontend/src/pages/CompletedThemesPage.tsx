import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { getThemes, type Theme } from '../api/theme';
import styles from './CompletedThemesPage.module.css';

function CompletedThemesPage() {
  const [themes, setThemes] = useState<Theme[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getThemes()
      .then((fetchedThemes) => {
        if (!cancelled) {
          setThemes(fetchedThemes.filter((theme) => theme.completed));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : '테마를 불러오지 못했습니다.',
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
        <h1 className={styles.title}>완료한 테마</h1>

        {errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : themes === null ? (
          <p className={styles.message}>불러오는 중입니다…</p>
        ) : themes.length === 0 ? (
          <p className={styles.message}>아직 완료한 테마가 없어요.</p>
        ) : (
          <ul className={styles.list}>
            {themes.map((theme) => (
              <li key={theme.id}>
                <Link to={`/town/themes/${theme.id}`} className={styles.item}>
                  <span className={styles.itemTitle}>{theme.title}</span>
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
