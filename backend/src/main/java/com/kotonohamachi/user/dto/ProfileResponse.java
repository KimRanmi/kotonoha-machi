package com.kotonohamachi.user.dto;

/**
 * 프로필(이메일, 닉네임) 응답 본문.
 *
 * @param id 사용자 ID
 * @param email 이메일
 * @param nickname 닉네임
 * @param hasPassword 비밀번호 로그인 수단이 있는지 여부(소셜 로그인만으로 가입한 계정은 false)
 */
public record ProfileResponse(Long id, String email, String nickname, boolean hasPassword) {}
