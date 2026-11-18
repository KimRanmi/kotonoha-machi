package com.kotonohamachi.chat;

/** Gemini를 부르는 목적. 사용량 기록에서 호출을 종류별로 나누는 데 쓴다. */
public enum AiCallType {
  /** 주민의 대사 생성. */
  CHAT,
  /** 하루 대화 요약. */
  SUMMARY,
  /** 단어 뜻 번역. */
  TRANSLATE
}
