package com.kotonohamachi.theme;

import java.util.Optional;

/** 테마 하나를 구성하는 학습 단계. 선언 순서가 그대로 진행 순서다(한자 → 단어 → 표현 → 예문 → 독해). */
public enum ThemeStage {
  KANJI,
  WORD,
  EXPRESSION,
  EXAMPLE,
  READING;

  /**
   * 이 단계 다음에 진행할 단계를 반환한다.
   *
   * @return 다음 단계(이 단계가 마지막 단계면 빈 Optional)
   */
  public Optional<ThemeStage> next() {
    ThemeStage[] stages = values();
    int nextIndex = ordinal() + 1;
    return nextIndex < stages.length ? Optional.of(stages[nextIndex]) : Optional.empty();
  }
}
