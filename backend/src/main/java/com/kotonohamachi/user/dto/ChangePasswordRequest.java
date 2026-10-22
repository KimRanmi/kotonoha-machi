package com.kotonohamachi.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 비밀번호 변경 요청 본문. {@code currentPassword}는 소셜 로그인만으로 가입해 비밀번호가 없는 계정이 빈
 * 값으로 보낼 수 있어야 하므로 검증 어노테이션을 두지 않는다.
 *
 * @param currentPassword 현재 비밀번호(비밀번호가 없는 계정은 비워서 보낼 수 있다)
 * @param newPassword 새로 설정할 비밀번호
 */
public record ChangePasswordRequest(
    String currentPassword,

    @NotBlank(message = "새 비밀번호를 입력해주세요.")
    @Size(min = 8, max = 100, message = "비밀번호는 8자 이상 100자 이하로 입력해주세요.")
    String newPassword) {}
