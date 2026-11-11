package com.kotonohamachi.resident.dto;

/**
 * 주민 한 명과의 친밀도.
 *
 * @param residentSlug 주민 고유 키(예: r01)
 * @param level 친밀도(0~100)
 */
public record FriendshipResponse(String residentSlug, int level) {}
