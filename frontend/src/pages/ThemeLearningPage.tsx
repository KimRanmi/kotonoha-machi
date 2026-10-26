import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import {
  completeStage,
  getStageContent,
  getThemes,
  type ExampleItem,
  type KanjiItem,
  type StageContentItem,
  type Theme,
  type ThemeStage,
  type VocabularyItem,
} from '../api/theme';
import styles from './ThemeLearningPage.module.css';

const STAGE_ORDER: ThemeStage[] = ['KANJI', 'WORD', 'EXPRESSION', 'EXAMPLE', 'READING'];

const STAGE_LABELS: Record<ThemeStage, string> = {
  KANJI: '한자',
  WORD: '단어',
  EXPRESSION: '표현',
  EXAMPLE: '예문',
  READING: '독해',
};

function renderStageContentItem(stage: ThemeStage, item: StageContentItem) {
  if (stage === 'KANJI') {
    const kanjiItem = item as KanjiItem;
    return (
      <>
        <div className={styles.itemHeader}>
          <span className={styles.itemSurface}>{kanjiItem.kanji}</span>
          <span className={styles.levelBadge}>N{kanjiItem.jlptLevel}</span>
        </div>
        <p className={styles.itemReading}>
          음독 {kanjiItem.onReading} · 훈독 {kanjiItem.kunReading}
        </p>
        <p className={styles.itemMeaning}>{kanjiItem.meaning}</p>
      </>
    );
  }

  if (stage === 'WORD' || stage === 'EXPRESSION') {
    const vocabularyItem = item as VocabularyItem;
    return (
      <>
        <div className={styles.itemHeader}>
          <span className={styles.itemSurface}>{vocabularyItem.surfaceForm}</span>
          <span className={styles.levelBadge}>N{vocabularyItem.jlptLevel}</span>
        </div>
        <p className={styles.itemReading}>{vocabularyItem.reading}</p>
        <p className={styles.itemMeaning}>{vocabularyItem.meaning}</p>
      </>
    );
  }

  const exampleItem = item as ExampleItem;
  return (
    <>
      <p className={styles.itemSurface}>{exampleItem.japaneseSentence}</p>
      <p className={styles.itemMeaning}>{exampleItem.translation}</p>
    </>
  );
}

function ThemeLearningPage() {
  const { themeId } = useParams<{ themeId: string }>();
  const numericThemeId = Number(themeId);

  const [theme, setTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceErrorMessage, setAdvanceErrorMessage] = useState<string | null>(null);
  const [stageItems, setStageItems] = useState<StageContentItem[] | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentErrorMessage, setContentErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getThemes()
      .then((themes) => {
        if (cancelled) {
          return;
        }
        const found = themes.find((candidate) => candidate.id === numericThemeId);
        if (!found) {
          setLoadErrorMessage('테마를 찾을 수 없습니다.');
        } else {
          setTheme(found);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadErrorMessage(
            error instanceof ApiError ? error.message : '테마를 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [numericThemeId]);

  useEffect(() => {
    if (!theme || theme.completed || theme.currentStage === 'READING') {
      setStageItems(null);
      return;
    }

    let cancelled = false;
    setIsContentLoading(true);
    setContentErrorMessage(null);

    getStageContent(theme.id, theme.currentStage)
      .then((items) => {
        if (!cancelled) {
          setStageItems(items);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setContentErrorMessage(
            error instanceof ApiError ? error.message : '콘텐츠를 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsContentLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [theme]);

  async function handleAdvance() {
    if (!theme) {
      return;
    }

    setAdvanceErrorMessage(null);
    setIsAdvancing(true);

    try {
      const progress = await completeStage(theme.id, theme.currentStage);
      setTheme({
        ...theme,
        currentStage: progress.currentStage,
        completed: progress.completed,
      });
    } catch (error) {
      setAdvanceErrorMessage(
        error instanceof ApiError ? error.message : '단계를 완료하지 못했습니다.',
      );
    } finally {
      setIsAdvancing(false);
    }
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <Link to="/town" className={styles.backLink}>
            ← 마을로 돌아가기
          </Link>
          <p className={styles.content}>불러오는 중입니다…</p>
        </div>
      </main>
    );
  }

  if (!theme || loadErrorMessage) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <Link to="/town" className={styles.backLink}>
            ← 마을로 돌아가기
          </Link>
          <p className={styles.error} role="alert">
            {loadErrorMessage ?? '테마를 찾을 수 없습니다.'}
          </p>
        </div>
      </main>
    );
  }

  const currentStageIndex = STAGE_ORDER.indexOf(theme.currentStage);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link to="/town" className={styles.backLink}>
          ← 마을로 돌아가기
        </Link>

        <ol className={styles.stepList}>
          {STAGE_ORDER.map((stage, index) => (
            <li
              key={stage}
              className={styles.step}
              data-active={theme.completed || index <= currentStageIndex}
            >
              {STAGE_LABELS[stage]}
            </li>
          ))}
        </ol>

        <div className={styles.card}>
          {theme.completed ? (
            <p className={styles.cardMessage}>테마를 모두 완료했습니다!</p>
          ) : theme.currentStage === 'READING' ? (
            <p className={styles.cardMessage}>콘텐츠 준비 중입니다.</p>
          ) : isContentLoading ? (
            <p className={styles.cardMessage}>콘텐츠를 불러오는 중입니다…</p>
          ) : contentErrorMessage ? (
            <p className={styles.error} role="alert">
              {contentErrorMessage}
            </p>
          ) : (
            <ul className={styles.contentList}>
              {stageItems?.map((item, index) => (
                <li key={index} className={styles.contentItem}>
                  {renderStageContentItem(theme.currentStage, item)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {advanceErrorMessage && (
          <p className={styles.error} role="alert">
            {advanceErrorMessage}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.hintButton}
            disabled
            title="정답 확인 기능은 아직 준비 중입니다"
          >
            힌트
          </button>
          {theme.completed ? (
            <Link to="/town" className={styles.nextButton}>
              마을로 돌아가기
            </Link>
          ) : (
            <button
              type="button"
              className={styles.nextButton}
              onClick={handleAdvance}
              disabled={isAdvancing}
            >
              다음
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default ThemeLearningPage;
