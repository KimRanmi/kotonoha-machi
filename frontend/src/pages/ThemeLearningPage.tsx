import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import {
  completeStage,
  getStageContent,
  getThemes,
  type QuizItem,
  type Theme,
  type ThemeStage,
} from '../api/theme';
import styles from './ThemeLearningPage.module.css';

const STAGE_ORDER: ThemeStage[] = ['KANJI', 'WORD', 'EXPRESSION', 'EXAMPLE', 'READING'];
const MAX_WRONG_ATTEMPTS = 3;

const STAGE_LABELS: Record<ThemeStage, string> = {
  KANJI: '한자',
  WORD: '단어',
  EXPRESSION: '표현',
  EXAMPLE: '예문',
  READING: '독해',
};

function ThemeLearningPage() {
  const { themeId } = useParams<{ themeId: string }>();
  const numericThemeId = Number(themeId);

  const [theme, setTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceErrorMessage, setAdvanceErrorMessage] = useState<string | null>(null);

  const [quizItems, setQuizItems] = useState<QuizItem[] | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentErrorMessage, setContentErrorMessage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

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
      setQuizItems(null);
      return;
    }

    let cancelled = false;
    setIsContentLoading(true);
    setContentErrorMessage(null);

    getStageContent(theme.id, theme.currentStage)
      .then((items) => {
        if (!cancelled) {
          setQuizItems(items);
          setCurrentIndex(0);
          setWrongCount(0);
          setIsRevealed(false);
          setFeedback(null);
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

  const currentQuizItem =
    quizItems && currentIndex < quizItems.length ? quizItems[currentIndex] : null;
  const allQuizItemsAnswered = quizItems !== null && currentIndex >= quizItems.length;
  const canAdvanceStage = theme?.currentStage === 'READING' || allQuizItemsAnswered;

  function handleSelectOption(option: string) {
    if (!currentQuizItem || feedback === 'correct') {
      return;
    }

    if (option === currentQuizItem.correctAnswer) {
      setFeedback('correct');
      return;
    }

    if (isRevealed) {
      return;
    }

    const nextWrongCount = wrongCount + 1;
    setWrongCount(nextWrongCount);
    setFeedback('incorrect');
    if (nextWrongCount >= MAX_WRONG_ATTEMPTS) {
      setIsRevealed(true);
    }
  }

  function handleNextQuizItem() {
    setCurrentIndex((index) => index + 1);
    setWrongCount(0);
    setIsRevealed(false);
    setFeedback(null);
  }

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
          ) : allQuizItemsAnswered ? (
            <p className={styles.cardMessage}>
              이 단계의 문제를 모두 맞혔습니다! 아래 "다음" 버튼으로 진행하세요.
            </p>
          ) : currentQuizItem ? (
            <div className={styles.quiz}>
              {currentQuizItem.jlptLevel !== null && (
                <span className={styles.levelBadge}>N{currentQuizItem.jlptLevel}</span>
              )}
              <p className={styles.prompt}>{currentQuizItem.prompt}</p>

              <div className={styles.optionList}>
                {currentQuizItem.options.map((option) => {
                  const isCorrectOption = option === currentQuizItem.correctAnswer;
                  const variant =
                    feedback === 'correct' && isCorrectOption
                      ? 'correct'
                      : isRevealed && isCorrectOption
                        ? 'hint'
                        : undefined;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={styles.optionButton}
                      data-variant={variant}
                      disabled={feedback === 'correct'}
                      onClick={() => handleSelectOption(option)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {feedback === 'incorrect' && !isRevealed && (
                <p className={styles.quizFeedbackIncorrect}>
                  틀렸습니다. 다시 선택해보세요. ({wrongCount}/{MAX_WRONG_ATTEMPTS})
                </p>
              )}
              {isRevealed && feedback !== 'correct' && (
                <p className={styles.quizFeedbackHint}>
                  정답은 "{currentQuizItem.correctAnswer}"입니다. 위에서 정답을 선택해주세요.
                </p>
              )}
              {feedback === 'correct' && (
                <div className={styles.quizFeedbackCorrectRow}>
                  <p className={styles.quizFeedbackCorrect}>정답입니다!</p>
                  <button
                    type="button"
                    className={styles.nextQuestionButton}
                    onClick={handleNextQuizItem}
                  >
                    {currentIndex + 1 < quizItems!.length ? '다음 문제' : '완료'}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {advanceErrorMessage && (
          <p className={styles.error} role="alert">
            {advanceErrorMessage}
          </p>
        )}

        <div className={styles.actions}>
          {theme.completed ? (
            <Link to="/town" className={styles.nextButton}>
              마을로 돌아가기
            </Link>
          ) : (
            <button
              type="button"
              className={styles.nextButton}
              onClick={handleAdvance}
              disabled={isAdvancing || !canAdvanceStage}
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
