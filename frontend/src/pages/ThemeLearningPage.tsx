import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { speakJapanese, stopSpeaking } from '../lib/speechSynthesis';
import { calculateTextSimilarity, toHiragana, toKatakana } from '../lib/textSimilarity';
import {
  completeStage,
  getStageContent,
  getThemes,
  getTodayRecommendation,
  type QuizItem,
  type Theme,
  type ThemeStage,
} from '../api/theme';
import styles from './ThemeLearningPage.module.css';

const STAGE_ORDER: ThemeStage[] = ['KANJI', 'WORD', 'EXPRESSION', 'EXAMPLE', 'READING', 'REVIEW'];
const MAX_WRONG_ATTEMPTS = 3;
const SPEECH_PASS_THRESHOLD = 0.8;

const STAGE_LABELS: Record<ThemeStage, string> = {
  KANJI: '한자',
  WORD: '단어',
  EXPRESSION: '표현',
  EXAMPLE: '예문',
  READING: '독해',
  REVIEW: '복습',
};

/** 음성 인식 결과와 정답 문구를 비교하기 전에 공백 차이를 무시하도록 정리한다. */
function normalizeForSpeechComparison(text: string): string {
  return text.replace(/\s+/g, '').trim();
}

/**
 * 음성 인식 결과의 정확도를 계산한다. 정답 표기(한자 등)와 비교한 유사도, 읽는 법(가나)이 있다면
 * 그것과 비교한 유사도(가타카나는 히라가나로 맞춰서 비교) 중 더 높은 쪽을 쓴다 — 음성 인식이 같은
 * 발음을 한자로 돌려주든 가나로 돌려주든 둘 중 하나는 맞힌 걸로 보기 위해서다.
 */
function calculateSpeechAccuracy(transcript: string, quizItem: QuizItem): number {
  const normalizedTranscript = normalizeForSpeechComparison(transcript);
  const surfaceAccuracy = calculateTextSimilarity(
    normalizedTranscript,
    normalizeForSpeechComparison(quizItem.correctAnswer),
  );

  if (!quizItem.reading) {
    return surfaceAccuracy;
  }

  const readingAccuracy = calculateTextSimilarity(
    toHiragana(normalizedTranscript),
    toHiragana(normalizeForSpeechComparison(quizItem.reading)),
  );
  return Math.max(surfaceAccuracy, readingAccuracy);
}

/**
 * 소리로 읽어 줄 글자를 정한다. 한자 한 글자는 문맥이 없어 엔진이 잘못 읽기 쉬우니 읽는 법을 쓰고, 단어·표현·
 * 문장은 한자가 섞인 원문을 그대로 넘긴다 — 히라가나만 넘기면 단어 경계와 악센트 정보가 사라져 억양이 평평해진다.
 */
function getSpokenText(quizItem: QuizItem): string {
  const isSingleCharacter = Array.from(quizItem.prompt).length === 1;
  return isSingleCharacter ? (quizItem.reading ?? quizItem.prompt) : quizItem.prompt;
}

function ThemeLearningPage() {
  const { themeId } = useParams<{ themeId: string }>();
  const numericThemeId = Number(themeId);
  const navigate = useNavigate();

  const [theme, setTheme] = useState<Theme | null>(null);
  // 완료한 테마를 다시 볼 때 고른 단계. 완료 전에는 쓰이지 않는다.
  const [viewStage, setViewStage] = useState<ThemeStage>('KANJI');
  // 오늘의 테마(오늘 완료했으면 그 테마, 아니면 추천 테마). 오늘은 이 테마만 진행할 수 있다.
  // `null`은 오늘의 테마가 없다는 뜻이고, `undefined`는 아직 모르는 상태(조회 전·실패)다.
  const [todayTheme, setTodayTheme] = useState<Theme | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  // 마지막 단계를 막 끝낸 직후에만 true. 완료 확인 화면을 보여 주고 확인하면 /town으로 보낸다.
  const [justCompleted, setJustCompleted] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceErrorMessage, setAdvanceErrorMessage] = useState<string | null>(null);

  const [quizItems, setQuizItems] = useState<QuizItem[] | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentErrorMessage, setContentErrorMessage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const {
    isSupported: speechSupported,
    isListening,
    errorMessage: speechErrorMessage,
    start: startListening,
    cancel: cancelSpeechRecognition,
    clearError: clearSpeechError,
  } = useSpeechRecognition();
  const [speechAccuracy, setSpeechAccuracy] = useState<number | null>(null);
  const [isReadingHintShown, setIsReadingHintShown] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 오늘의 테마 조회는 보조 정보라 실패해도 학습 화면은 열어 준다(서버가 단계 완료 시점에 한 번 더 막는다).
    Promise.all([getThemes(), getTodayRecommendation().catch(() => undefined)])
      .then(([themes, fetchedTodayTheme]) => {
        if (cancelled) {
          return;
        }
        setTodayTheme(fetchedTodayTheme);
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

  // 진행 중이면 지금 단계, 완료한 테마면 사용자가 고른 단계의 내용을 보여 준다.
  const activeStage = theme ? (theme.completed ? viewStage : theme.currentStage) : null;
  // 완료한 테마는 오늘의 테마가 아니어도 다시 볼 수 있다(완료 목록에서 들어온다).
  const isNotTodayTheme =
    theme !== null && !theme.completed && todayTheme !== undefined && todayTheme?.id !== theme.id;

  useEffect(() => {
    stopSpeaking();
    // 단계를 바꿀 때 이전 단계에서 듣고 있던 마이크 인식이 새 단계 문제에 반영되지 않게 멈춘다.
    cancelSpeechRecognition();
    if (!theme || !activeStage || isNotTodayTheme) {
      setQuizItems(null);
      return;
    }

    let cancelled = false;
    setIsContentLoading(true);
    setContentErrorMessage(null);

    getStageContent(theme.id, activeStage)
      .then((fetchedItems) => {
        if (!cancelled) {
          // 복습(말하기)에선 한 글자짜리 항목(한자 등)은 읽기 연습에서 뺀다.
          const items =
            activeStage === 'REVIEW'
              ? fetchedItems.filter((item) => Array.from(item.prompt).length > 1)
              : fetchedItems;
          setQuizItems(items);
          setCurrentIndex(0);
          setWrongCount(0);
          setIsRevealed(false);
          setFeedback(null);
          clearSpeechError();
          setSpeechAccuracy(null);
          setIsReadingHintShown(false);
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
  }, [theme, activeStage, isNotTodayTheme, cancelSpeechRecognition, clearSpeechError]);

  // 페이지를 떠날 때 재생 중인 소리를 멈춘다(마이크 인식은 useSpeechRecognition이 멈춘다).
  useEffect(() => stopSpeaking, []);

  const currentQuizItem =
    quizItems && currentIndex < quizItems.length ? quizItems[currentIndex] : null;
  const allQuizItemsAnswered = quizItems !== null && currentIndex >= quizItems.length;
  const canAdvanceStage = allQuizItemsAnswered;

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
    stopSpeaking();
    setCurrentIndex((index) => index + 1);
    setWrongCount(0);
    setIsRevealed(false);
    setFeedback(null);
    clearSpeechError();
    setSpeechAccuracy(null);
    setIsReadingHintShown(false);
  }

  /** "分からない"(모르겠어요): 읽는 법을 보여 주고 소리로 들려준다. 읽는 법이 없으면 표기 자체를 읽는다. */
  function handleShowReadingHint() {
    if (!currentQuizItem) {
      return;
    }

    cancelSpeechRecognition();
    setIsReadingHintShown(true);
    speakJapanese(getSpokenText(currentQuizItem));
  }

  function handleStartListening() {
    if (!currentQuizItem || feedback === 'correct' || isListening) {
      return;
    }

    startListening((transcript) => {
      const accuracy = calculateSpeechAccuracy(transcript, currentQuizItem);
      setSpeechAccuracy(accuracy);
      setFeedback(accuracy >= SPEECH_PASS_THRESHOLD ? 'correct' : 'incorrect');
    });
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
      if (progress.completed) {
        setJustCompleted(true);
      }
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

  if (justCompleted) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <p className={styles.cardMessage}>오늘 테마를 완료했습니다! 🎉</p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.nextButton} onClick={() => navigate('/town')}>
              확인
            </button>
          </div>
        </div>
      </main>
    );
  }

  const currentStageIndex = STAGE_ORDER.indexOf(theme.currentStage);
  const isReviewStage = activeStage === 'REVIEW';

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
              data-active={theme.completed ? stage === viewStage : index <= currentStageIndex}
            >
              {theme.completed ? (
                <button
                  type="button"
                  className={styles.stepButton}
                  onClick={() => setViewStage(stage)}
                >
                  {STAGE_LABELS[stage]}
                </button>
              ) : (
                STAGE_LABELS[stage]
              )}
            </li>
          ))}
        </ol>

        {theme.completed && (
          <p className={styles.completedNotice}>
            테마를 모두 완료했습니다! 오늘은 단계를 눌러 다시 볼 수 있어요.
          </p>
        )}

        {isNotTodayTheme && (
          <div className={styles.limitNotice} role="status">
            <p className={styles.limitNoticeText}>
              오늘의 테마가 아닙니다.{' '}
              {todayTheme?.completed
                ? `오늘은 이미 "${todayTheme.title}" 테마를 완료했어요. 이 테마는 내일 진행할 수 있어요.`
                : todayTheme
                  ? `오늘의 테마는 "${todayTheme.title}"예요.`
                  : '모든 테마를 완료했어요.'}
            </p>
            {todayTheme && (
              <Link to={`/town/themes/${todayTheme.id}`} className={styles.limitNoticeLink}>
                {todayTheme.completed ? '오늘 완료한 테마 다시 보기' : '오늘의 테마로 가기'}
              </Link>
            )}
          </div>
        )}

        <div className={styles.card}>
          {isNotTodayTheme ? (
            <p className={styles.cardMessage}>이 테마는 오늘 진행할 수 없어요.</p>
          ) : isContentLoading ? (
            <p className={styles.cardMessage}>콘텐츠를 불러오는 중입니다…</p>
          ) : contentErrorMessage ? (
            <p className={styles.error} role="alert">
              {contentErrorMessage}
            </p>
          ) : allQuizItemsAnswered ? (
            <p className={styles.cardMessage}>
              {theme.completed
                ? '이 단계를 모두 마쳤습니다! 위에서 다른 단계를 골라 다시 볼 수 있어요.'
                : '이 단계의 문제를 모두 맞혔습니다! 아래 "다음" 버튼으로 진행하세요.'}
            </p>
          ) : currentQuizItem ? (
            <div className={styles.quiz}>
              {currentQuizItem.jlptLevel !== null && (
                <span className={styles.levelBadge}>N{currentQuizItem.jlptLevel}</span>
              )}
              <p className={styles.prompt}>{currentQuizItem.prompt}</p>

              {!isReviewStage && (
                <div className={styles.promptTools}>
                  <button
                    type="button"
                    className={styles.listenButton}
                    onClick={() => speakJapanese(getSpokenText(currentQuizItem))}
                  >
                    🔊 듣기
                  </button>
                  {currentQuizItem.reading && (
                    <button
                      type="button"
                      className={styles.listenButton}
                      onClick={() => setIsReadingHintShown((shown) => !shown)}
                    >
                      あ/ア 읽는 법
                    </button>
                  )}
                </div>
              )}
              {!isReviewStage && isReadingHintShown && currentQuizItem.reading && (
                <p className={styles.readingText}>
                  {toHiragana(currentQuizItem.reading)} / {toKatakana(currentQuizItem.reading)}
                </p>
              )}

              {isReviewStage ? (
                <div className={styles.speechPractice}>
                  {feedback !== 'correct' && (
                    <button
                      type="button"
                      className={styles.unknownButton}
                      onClick={handleShowReadingHint}
                    >
                      分からない 🥺
                    </button>
                  )}
                  {isReadingHintShown && feedback !== 'correct' && (
                    <div className={styles.readingHint}>
                      <span className={styles.readingText}>
                        {currentQuizItem.reading
                          ? `${toHiragana(currentQuizItem.reading)} / ${toKatakana(currentQuizItem.reading)}`
                          : currentQuizItem.prompt}
                      </span>
                      <button
                        type="button"
                        className={styles.listenButton}
                        onClick={handleShowReadingHint}
                      >
                        🔊 다시 듣기
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className={styles.speakButton}
                    disabled={!speechSupported || isListening || feedback === 'correct'}
                    onClick={handleStartListening}
                  >
                    {isListening ? '듣고 있어요…' : '🎤 말하기'}
                  </button>
                  {isListening && (
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={cancelSpeechRecognition}
                    >
                      ✕ 취소
                    </button>
                  )}
                  {!speechSupported && (
                    <p className={styles.error} role="alert">
                      이 브라우저는 음성 인식을 지원하지 않습니다. Chrome에서 이용해주세요.
                    </p>
                  )}
                  {speechErrorMessage && (
                    <p className={styles.quizFeedbackIncorrect}>{speechErrorMessage}</p>
                  )}
                  {feedback === 'incorrect' && speechAccuracy !== null && (
                    <p className={styles.quizFeedbackIncorrect}>
                      정확도 {Math.round(speechAccuracy * 100)}%였습니다.{' '}
                      {Math.round(SPEECH_PASS_THRESHOLD * 100)}% 이상이어야 통과합니다. 다시
                      말해보세요.
                    </p>
                  )}
                </div>
              ) : (
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
              )}

              {!isReviewStage && feedback === 'incorrect' && !isRevealed && (
                <p className={styles.quizFeedbackIncorrect}>
                  틀렸습니다. 다시 선택해보세요. ({wrongCount}/{MAX_WRONG_ATTEMPTS})
                </p>
              )}
              {!isReviewStage && isRevealed && feedback !== 'correct' && (
                <p className={styles.quizFeedbackHint}>
                  정답은 "{currentQuizItem.correctAnswer}"입니다. 위에서 정답을 선택해주세요.
                </p>
              )}
              {feedback === 'correct' && (
                <div className={styles.quizFeedbackCorrectRow}>
                  <p className={styles.quizFeedbackCorrect}>
                    {isReviewStage && speechAccuracy !== null
                      ? `정확도 ${Math.round(speechAccuracy * 100)}%로 정답입니다!`
                      : '정답입니다!'}
                  </p>
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
          {theme.completed || isNotTodayTheme ? (
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
