package com.kotonohamachi.auth.dto;

/**
 * 로그인에 성공한 사용자 정보 응답 본문.
 *
 * @param id 사용자 ID
 * @param email 이메일
 * @param nickname 닉네임
 */
public record AuthUserResponse(Long id, String email, String nickname) {}
