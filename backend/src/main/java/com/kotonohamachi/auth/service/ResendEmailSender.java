package com.kotonohamachi.auth.service;

import com.kotonohamachi.auth.AuthErrorCode;
import com.kotonohamachi.common.ApiException;
import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Resend API로 이메일 인증 코드를 실제로 발송하는 구현체. */
@Component
public class ResendEmailSender implements EmailSender {

  private static final Logger log = LoggerFactory.getLogger(ResendEmailSender.class);

  private final Resend resend;
  private final String fromAddress;

  /**
   * 생성자.
   *
   * @param apiKey Resend API 키
   * @param fromAddress 발신자 이메일 주소
   */
  public ResendEmailSender(
      @Value("${app.email.resend-api-key}") String apiKey,
      @Value("${app.email.from-address}") String fromAddress) {
    this.resend = new Resend(apiKey);
    this.fromAddress = fromAddress;
  }

  @Override
  public void sendVerificationCode(String email, String code) {
    send(email, "[kotonoha-machi] 이메일 인증 코드", "인증 코드: " + code + " (10분 이내에 입력해주세요)");
  }

  @Override
  public void sendPasswordResetCode(String email, String code) {
    send(email, "[kotonoha-machi] 비밀번호 재설정 코드", "재설정 코드: " + code + " (10분 이내에 입력해주세요)");
  }

  private void send(String email, String subject, String text) {
    CreateEmailOptions params = CreateEmailOptions.builder()
        .from(fromAddress)
        .to(email)
        .subject(subject)
        .text(text)
        .build();

    try {
      resend.emails().send(params);
    } catch (ResendException e) {
      log.error("이메일 발송 실패: {}", email, e);
      throw new ApiException(AuthErrorCode.EMAIL_SEND_FAILED);
    }
  }
}
