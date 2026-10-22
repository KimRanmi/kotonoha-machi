package com.kotonohamachi.auth.dto;

/**
 * 회원 탈퇴 요청 본문. {@code currentPassword}는 소셜 로그인만으로 가입해 비밀번호가 없는 계정이 빈
 * 값으로 보낼 수 있어야 하므로 검증 어노테이션을 두지 않는다.
 *
 * @param currentPassword 현재 비밀번호(비밀번호가 없는 계정은 비워서 보낼 수 있다)
 */
public record WithdrawRequest(String currentPassword) {}
