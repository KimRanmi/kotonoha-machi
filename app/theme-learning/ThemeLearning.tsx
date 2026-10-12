"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as wanakana from "wanakana";
import styles from "./theme-learning.module.css";
import type { Theme } from "./types";
import { getThemeById, isThemeUnlocked } from "./themes";
import { completeTheme, fetchCompletedThemes } from "@/lib/storage";

const MAX_WRONG_BEFORE_HINT = 3;
// "테마 완료!" 화면을 잠깐 보여준 뒤 마을로 자동 전환하기까지의 대기 시간.
// 실제 대기가 필요한 로직이 아니라 완료 피드백을 인지할 시간을 주기 위한 연출용 딜레이다.
const AUTO_REDIRECT_DELAY_MS = 1500;

type Stage = "rounds" | "review" | "complete";

function normalize(text: string): string {
  return text.replace(/\s+/g, "");
}

// 잠긴 테마는 주소로 직접 들어와도 시작할 수 없다. 서버의 완료 목록을 읽어 확인한 뒤에만 학습을 보여준다.
export default function ThemeLearning({ themeId }: { themeId: string }) {
  const theme = getThemeById(themeId);
  const [gate, setGate] = useState<"checking" | "open" | "locked" | "error">("checking");
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateAttempt, setGateAttempt] = useState(0);

  useEffect(() => {
    if (!theme) return;
    let cancelled = false;
    fetchCompletedThemes()
      .then((titles) => {
        if (cancelled) return;
        setGate(isThemeUnlocked(theme, new Set(titles)) ? "open" : "locked");
      })
      .catch((err) => {
        if (cancelled) return;
        setGateError(err instanceof Error ? err.message : "완료한 테마를 불러오지 못했습니다.");
        setGate("error");
      });
    return () => {
      cancelled = true;
    };
  }, [theme, gateAttempt]);

  if (!theme) return null;
  if (gate === "open") return <ThemeSession theme={theme} />;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.themeTitle}>테마: {theme.title}</div>
          <Link href="/theme-learning" className="pill">
            ← 테마 목록
          </Link>
        </div>
      </div>
      <div className={styles.completeScreen}>
        {gate === "checking" && <div>불러오는 중…</div>}
        {gate === "locked" && (
          <>
            <div className={styles.completeTitle}>아직 잠겨 있어요</div>
            <div>이 테마는 앞선 테마를 먼저 완료해야 시작할 수 있어요.</div>
            <Link href="/theme-learning" className={styles.nextButton}>
              테마 목록으로
            </Link>
          </>
        )}
        {gate === "error" && (
          <>
            <div role="alert">{gateError}</div>
            <button
              type="button"
              className={styles.nextButton}
              onClick={() => {
                setGate("checking");
                setGateAttempt((n) => n + 1);
              }}
            >
              다시 시도
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ThemeSession({ theme }: { theme: Theme }) {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("rounds");
  // 완료 시점에 한 번 정해진다: 이미 완료한 적 있는 테마를 다시 끝낸 것이면 복습(건물 없음).
  const [isReview, setIsReview] = useState(false);
  // 서버에 완료 기록이 저장됐는지. 저장 전에 마을로 가면 새 건물이 안 보일 수 있어 버튼을 막는다.
  const [saved, setSaved] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [reviewWrongCount, setReviewWrongCount] = useState(0);
  const [reviewFeedback, setReviewFeedback] = useState<
    "idle" | "correct" | "wrong"
  >("idle");
  const [reviewRevealed, setReviewRevealed] = useState(false);
  const reviewInputRef = useRef<HTMLTextAreaElement>(null);

  const round = theme.rounds[roundIndex];
  const item = round?.items[itemIndex];

  // 종합 복습 입력창도 대화창(ChatPanel)과 동일하게 로마자를 치면 바로 가나로
  // 변환되게 한다. wanakana가 DOM을 직접 다루므로 이 textarea는 비제어 컴포넌트로
  // 둔다 (value가 아니라 ref + onChange로 React 상태와 동기화).
  useEffect(() => {
    const el = reviewInputRef.current;
    if (!el || stage !== "review") return;
    wanakana.bind(el);
    return () => {
      wanakana.unbind(el);
    };
  }, [stage, reviewIndex]);

  // 테마 완료 화면에 들어서면 서버에 완료를 기록한다(첫 완료면 서버가 배치 대기 건물도 만든다, REQ-013).
  // 저장에 성공한 뒤에 짧은 딜레이를 두고 마을 맵으로 자동 전환한다. 실패하면 이동하지 않고
  // 에러와 다시 시도 버튼을 보여준다. 개발 모드(StrictMode)에서 효과가 두 번 돌아도 요청은 한 번만 보낸다.
  const completionRequestRef = useRef<Promise<boolean> | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [saveAttempt, setSaveAttempt] = useState(0);

  useEffect(() => {
    if (stage !== "complete") return;
    let cancelled = false;
    let timeoutId: number | undefined;
    completionRequestRef.current ??= completeTheme(theme.title);
    completionRequestRef.current
      .then((firstCompletion) => {
        if (cancelled) return;
        setIsReview(!firstCompletion);
        setSaved(true);
        setCompleteError(null);
        timeoutId = window.setTimeout(() => {
          router.push("/");
        }, AUTO_REDIRECT_DELAY_MS);
      })
      .catch((err) => {
        completionRequestRef.current = null; // 다시 시도하면 새로 요청한다.
        if (!cancelled) setCompleteError(err instanceof Error ? err.message : "테마 완료를 저장하지 못했습니다.");
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [stage, theme.title, router, saveAttempt]);

  function resetItemState() {
    setSelected(null);
    setRevealed(false);
    setWrongCount(0);
  }

  function goToNextItem() {
    if (!round) return;
    if (itemIndex + 1 < round.items.length) {
      setItemIndex(itemIndex + 1);
      resetItemState();
    } else if (roundIndex + 1 < theme.rounds.length) {
      setRoundIndex(roundIndex + 1);
      setItemIndex(0);
      resetItemState();
    } else {
      setStage("review");
    }
  }

  function handleChoice(choice: string) {
    if (!item || revealed) return;
    setSelected(choice);
    if (choice === item.correct) {
      window.setTimeout(() => {
        goToNextItem();
      }, 500);
    } else {
      setWrongCount((prev) => {
        const nextWrong = prev + 1;
        if (nextWrong >= MAX_WRONG_BEFORE_HINT) {
          setRevealed(true);
        }
        return nextWrong;
      });
    }
  }

  function goToNextReview() {
    if (reviewIndex + 1 < theme.review.length) {
      setReviewIndex(reviewIndex + 1);
      setReviewAnswer("");
      if (reviewInputRef.current) reviewInputRef.current.value = "";
      setReviewWrongCount(0);
      setReviewFeedback("idle");
      setReviewRevealed(false);
    } else {
      setStage("complete");
    }
  }

  function handleReviewSubmit() {
    const question = theme.review[reviewIndex];
    if (!question || reviewRevealed) return;
    const normalizedAnswer = normalize(reviewAnswer);
    const matched = question.keywords.some((keyword) =>
      normalizedAnswer.includes(normalize(keyword))
    );
    if (matched && normalizedAnswer.length > 0) {
      setReviewFeedback("correct");
      window.setTimeout(() => {
        goToNextReview();
      }, 600);
    } else {
      setReviewFeedback("wrong");
      setReviewWrongCount((prev) => {
        const nextWrong = prev + 1;
        if (nextWrong >= MAX_WRONG_BEFORE_HINT) {
          setReviewRevealed(true);
        }
        return nextWrong;
      });
    }
  }

  const roundProgressLabel =
    stage === "rounds"
      ? `${round.label} 라운드 (${itemIndex + 1}/${round.items.length})`
      : stage === "review"
        ? `종합 복습 (${reviewIndex + 1}/${theme.review.length})`
        : "완료";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.themeTitle}>테마: {theme.title}</div>
          <Link href="/theme-learning" className="pill">
            ← 테마 목록
          </Link>
        </div>
        <div className={styles.subtitle}>{roundProgressLabel}</div>
      </div>

      <div className={styles.progressBar}>
        {theme.rounds.map((r, i) => (
          <div
            key={r.id}
            className={
              stage === "rounds" && i === roundIndex
                ? `${styles.progressStep} ${styles.progressStepActive}`
                : stage !== "rounds" || i < roundIndex
                  ? `${styles.progressStep} ${styles.progressStepDone}`
                  : styles.progressStep
            }
          >
            {r.label}
          </div>
        ))}
        <div
          className={
            stage === "review"
              ? `${styles.progressStep} ${styles.progressStepActive}`
              : stage === "complete"
                ? `${styles.progressStep} ${styles.progressStepDone}`
                : styles.progressStep
          }
        >
          종합 복습
        </div>
      </div>

      {stage === "rounds" && item && (
        <div className={styles.card}>
          <div className={styles.itemProgress}>
            {round.label} {itemIndex + 1} / {round.items.length}
          </div>
          <div
            className={
              round.id === "example" ? styles.promptSentence : styles.prompt
            }
          >
            {item.prompt}
          </div>

          <div className={styles.choices}>
            {item.choices.map((choice) => {
              const isSelected = selected === choice;
              const isCorrectChoice = choice === item.correct;
              let className = styles.choiceButton;
              if (revealed && isCorrectChoice) {
                className = `${styles.choiceButton} ${styles.choiceCorrect}`;
              } else if (isSelected && isCorrectChoice) {
                className = `${styles.choiceButton} ${styles.choiceCorrect}`;
              } else if (isSelected && !isCorrectChoice) {
                className = `${styles.choiceButton} ${styles.choiceWrong}`;
              }
              return (
                <button
                  key={choice}
                  type="button"
                  className={className}
                  disabled={revealed || selected === item.correct}
                  onClick={() => handleChoice(choice)}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          {selected && selected !== item.correct && !revealed && (
            <div className={`${styles.feedback} ${styles.feedbackWrong}`}>
              틀렸어요, 다시 시도해 보세요. ({wrongCount}/{MAX_WRONG_BEFORE_HINT})
            </div>
          )}
          {selected === item.correct && (
            <div className={`${styles.feedback} ${styles.feedbackCorrect}`}>
              정답입니다!
            </div>
          )}

          {revealed && (
            <>
              <div className={styles.hintBox}>{item.hint}</div>
              <button
                type="button"
                className={styles.nextButton}
                onClick={goToNextItem}
              >
                다음으로
              </button>
            </>
          )}
        </div>
      )}

      {stage === "review" && theme.review[reviewIndex] && (
        <div className={styles.card}>
          <div className={styles.reviewLabel}>종합 복습 · 직접 답해보기</div>
          <div className={styles.promptSentence}>
            {theme.review[reviewIndex].prompt}
          </div>
          <textarea
            ref={reviewInputRef}
            className={styles.textAnswer}
            defaultValue=""
            disabled={reviewRevealed}
            onInput={(e) => setReviewAnswer((e.target as HTMLTextAreaElement).value)}
            placeholder="일본어로 답해 보세요 (로마자를 치면 자동으로 변환돼요)"
          />
          {reviewFeedback === "wrong" && !reviewRevealed && (
            <div className={`${styles.feedback} ${styles.feedbackWrong}`}>
              배운 표현을 조금 더 활용해 보세요. ({reviewWrongCount}/
              {MAX_WRONG_BEFORE_HINT})
            </div>
          )}
          {reviewFeedback === "correct" && (
            <div className={`${styles.feedback} ${styles.feedbackCorrect}`}>
              좋아요!
            </div>
          )}
          {reviewRevealed && (
            <div className={styles.hintBox}>
              예시 답안: {theme.review[reviewIndex].sampleAnswer}
            </div>
          )}
          {!reviewRevealed ? (
            <button
              type="button"
              className={styles.nextButton}
              onClick={handleReviewSubmit}
            >
              확인
            </button>
          ) : (
            <button
              type="button"
              className={styles.nextButton}
              onClick={goToNextReview}
            >
              다음으로
            </button>
          )}
        </div>
      )}

      {stage === "complete" && (
        <div className={styles.completeScreen}>
          {completeError ? (
            <>
              <div className={styles.completeTitle}>저장에 실패했어요</div>
              <div role="alert">{completeError}</div>
              <button
                type="button"
                className={styles.nextButton}
                onClick={() => setSaveAttempt((n) => n + 1)}
              >
                다시 시도
              </button>
            </>
          ) : (
            <>
              <div className={styles.completeTitle}>{isReview ? "복습 완료!" : "테마 완료!"}</div>
              <div>
                &quot;{theme.title}&quot; 테마 {isReview ? "복습을 마쳤어요." : "학습을 모두 마쳤어요."}
              </div>
              <div>{isReview ? "건물은 처음 완료할 때만 지어져요." : "마을에 새 건물이 지어져요!"}</div>
              <button
                type="button"
                className={styles.nextButton}
                disabled={!saved}
                onClick={() => router.push("/")}
              >
                {saved ? "← 마을로 돌아가기" : "저장 중…"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
