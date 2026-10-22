package com.kotonohamachi.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 비밀번호 재설정 확인 요청 본문.
 *
 * @param email 재설정할 계정의 이메일
 * @param code 이메일로 받은 재설정 코드(숫자 6자리)
 * @param newPassword 새로 설정할 비밀번호
 */
public record ConfirmPasswordResetRequest(
    @NotBlank(message = "이메일을 입력해주세요.") @Email(message = "올바른 이메일 형식이 아닙니다.")
    String email,

    @NotBlank(message = "재설정 코드를 입력해주세요.")
    @Pattern(regexp = "^[0-9]{6}$", message = "재설정 코드는 숫자 6자리입니다.")
    String code,

    @NotBlank(message = "새 비밀번호를 입력해주세요.")
    @Size(min = 8, max = 100, message = "비밀번호는 8자 이상 100자 이하로 입력해주세요.")
    String newPassword) {}
