package com.kotonohamachi.auth.dto;

/**
 * 닉네임 중복 확인 응답 본문.
 *
 * @param available 사용 가능하면 true
 */
public record NicknameAvailabilityResponse(boolean available) {}
