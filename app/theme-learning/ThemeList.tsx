"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./theme-learning.module.css";
import { THEMES, getThemeStatus, getThemeById, type ThemeStatus } from "./themes";
import { fetchCompletedThemes } from "@/lib/storage";

const STATUS_LABEL: Record<ThemeStatus, string> = {
  locked: "🔒 잠김",
  available: "도전 가능",
  completed: "✔ 완료",
};

export default function ThemeList() {
  // null이면 아직 서버에서 읽는 중이다(읽기 전에는 잠금을 판단할 수 없으므로 시작을 막는다).
  const [completed, setCompleted] = useState<ReadonlySet<string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchCompletedThemes()
      .then((titles) => {
        if (!cancelled) setCompleted(new Set(titles));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "완료한 테마를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.themeTitle}>학습하기</div>
          <Link href="/" className="pill">
            ← 마을로 돌아가기
          </Link>
        </div>
        <div className={styles.subtitle}>
          테마를 순서대로 열어 가요. 처음 끝내면 마을에 건물이 생기고, 다시 하면 복습이에요.
        </div>
      </div>

      {error && (
        <div role="alert" className={styles.listNotice}>
          {error}{" "}
          <button
            type="button"
            className="pill"
            onClick={() => {
              setError(null);
              setAttempt((n) => n + 1);
            }}
          >
            다시 시도
          </button>
        </div>
      )}
      {!completed && !error && <div className={styles.listNotice}>불러오는 중…</div>}

      <ul className={styles.themeList}>
        {THEMES.map((theme) => {
          const status = completed ? getThemeStatus(theme, completed) : "locked";
          const needs = theme.requires
            .map((id) => getThemeById(id)?.title)
            .filter((t): t is string => !!t);
          const body = (
            <>
              <span className={styles.levelBadge}>{theme.level}</span>
              <span className={styles.themeName}>{theme.title}</span>
              <span
                className={
                  status === "completed"
                    ? `${styles.statusBadge} ${styles.statusDone}`
                    : status === "available"
                      ? `${styles.statusBadge} ${styles.statusOpen}`
                      : styles.statusBadge
                }
              >
                {completed ? STATUS_LABEL[status] : "…"}
              </span>
              {completed && status === "locked" && (
                <span className={styles.lockHint}>먼저 &quot;{needs.join(", ")}&quot; 테마를 완료하세요</span>
              )}
              {status === "completed" && <span className={styles.lockHint}>다시 하면 복습이에요</span>}
            </>
          );
          return (
            <li key={theme.id}>
              {status === "locked" ? (
                <div className={`${styles.themeItem} ${styles.themeItemLocked}`} aria-disabled="true">
                  {body}
                </div>
              ) : (
                <Link href={`/theme-learning/${theme.id}`} className={styles.themeItem}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
