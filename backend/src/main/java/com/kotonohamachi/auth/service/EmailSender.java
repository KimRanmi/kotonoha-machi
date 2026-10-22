package com.kotonohamachi.auth.service;

/** 이메일 발송을 담당한다. 실제 발송 수단(SMTP 등)은 구현체에서 정한다. */
public interface EmailSender {

  /**
   * 이메일 인증 코드를 발송한다.
   *
   * @param email 받는 사람 이메일
   * @param code 인증 코드
   */
  void sendVerificationCode(String email, String code);

  /**
   * 비밀번호 재설정 코드를 발송한다.
   *
   * @param email 받는 사람 이메일
   * @param code 재설정 코드
   */
  void sendPasswordResetCode(String email, String code);
}
