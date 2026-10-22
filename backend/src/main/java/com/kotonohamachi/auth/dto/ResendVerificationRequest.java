package com.kotonohamachi.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * 인증 코드 재전송 요청 본문.
 *
 * @param email 인증 코드를 다시 받을 이메일
 */
public record ResendVerificationRequest(
    @NotBlank(message = "이메일을 입력해주세요.") @Email(message = "올바른 이메일 형식이 아닙니다.")
    String email) {}
