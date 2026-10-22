package com.kotonohamachi.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * 이메일 인증 코드 확인 요청 본문.
 *
 * @param email 인증할 이메일
 * @param code 이메일로 받은 인증 코드(숫자 6자리)
 */
public record VerifyEmailRequest(
    @NotBlank(message = "이메일을 입력해주세요.") @Email(message = "올바른 이메일 형식이 아닙니다.")
    String email,

    @NotBlank(message = "인증 코드를 입력해주세요.")
    @Pattern(regexp = "^[0-9]{6}$", message = "인증 코드는 숫자 6자리입니다.")
    String code) {}
