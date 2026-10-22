package com.kotonohamachi.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 닉네임 변경 요청 본문.
 *
 * @param nickname 새 닉네임
 */
public record UpdateNicknameRequest(
    @NotBlank(message = "닉네임을 입력해주세요.") @Size(max = 20, message = "닉네임은 20자 이하로 입력해주세요.")
    String nickname) {}
