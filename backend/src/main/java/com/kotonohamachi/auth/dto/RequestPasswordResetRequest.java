package com.kotonohamachi.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * 비밀번호 재설정 코드 요청 본문.
 *
 * @param email 재설정 코드를 받을 이메일
 */
public record RequestPasswordResetRequest(
    @NotBlank(message = "이메일을 입력해주세요.") @Email(message = "올바른 이메일 형식이 아닙니다.")
    String email) {}
