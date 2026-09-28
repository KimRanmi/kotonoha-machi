"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./theme-learning.module.css";
import { travelTheme } from "./data";
import { saveToStorage, PENDING_BUILDING_STORAGE_KEY } from "@/lib/storage";
import type { PendingBuilding } from "@/lib/types";

const MAX_WRONG_BEFORE_HINT = 3;
// "테마 완료!" 화면을 잠깐 보여준 뒤 마을로 자동 전환하기까지의 대기 시간.
// 실제 대기가 필요한 로직이 아니라 완료 피드백을 인지할 시간을 주기 위한 연출용 딜레이다.
const AUTO_REDIRECT_DELAY_MS = 1500;

type Stage = "rounds" | "review" | "complete";

function normalize(text: string): string {
  return text.replace(/\s+/g, "");
}

export default function ThemeLearning() {
  const theme = travelTheme;
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("rounds");
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

  const round = theme.rounds[roundIndex];
  const item = round?.items[itemIndex];

  // 테마 완료 화면에 들어서면, 새로 지어질 건물 정보를 저장해두고 짧은 딜레이 후
  // 마을 맵으로 자동 전환한다(REQ-013). 실시간 건설 대기는 town 페이지에서 연출로만 처리한다.
  useEffect(() => {
    if (stage !== "complete") return;
    const pending: PendingBuilding = {
      themeTitle: theme.title,
      completedAt: Date.now(),
    };
    saveToStorage(PENDING_BUILDING_STORAGE_KEY, pending);
    const timeoutId = window.setTimeout(() => {
      router.push("/town");
    }, AUTO_REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [stage, theme.title, router]);

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
          <Link href="/town" className={styles.navLink}>
            마을로 가기
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
            className={styles.textAnswer}
            value={reviewAnswer}
            disabled={reviewRevealed}
            onChange={(e) => setReviewAnswer(e.target.value)}
            placeholder="일본어로 답해 보세요"
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
          <div className={styles.completeTitle}>테마 완료!</div>
          <div>&quot;{theme.title}&quot; 테마 학습을 모두 마쳤어요.</div>
          <div>마을에 새 건물이 지어져요!</div>
          <button
            type="button"
            className={styles.nextButton}
            onClick={() => router.push("/town")}
          >
            마을로 가기
          </button>
        </div>
      )}
    </div>
  );
}
