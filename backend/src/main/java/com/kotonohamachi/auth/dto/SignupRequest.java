package com.kotonohamachi.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 회원가입 요청 본문.
 *
 * @param email 가입할 이메일
 * @param password 가입할 비밀번호(평문, 서버에서 BCrypt로 해싱한다)
 * @param nickname 가입할 닉네임
 */
public record SignupRequest(
    @NotBlank(message = "이메일을 입력해주세요.") @Email(message = "올바른 이메일 형식이 아닙니다.")
    String email,

    @NotBlank(message = "비밀번호를 입력해주세요.")
    @Size(min = 8, max = 100, message = "비밀번호는 8자 이상 100자 이하로 입력해주세요.")
    String password,

    @NotBlank(message = "닉네임을 입력해주세요.") @Size(max = 20, message = "닉네임은 20자 이하로 입력해주세요.")
    String nickname) {}
