package com.kotonohamachi.resident.dto;

/**
 * 대화 한 번으로 바뀐 친밀도.
 *
 * @param level 바뀐 뒤의 친밀도(0~100)
 * @param gain 이번에 오른 양(하루 한도에 막히면 0)
 */
public record FriendshipChange(int level, int gain) {}
