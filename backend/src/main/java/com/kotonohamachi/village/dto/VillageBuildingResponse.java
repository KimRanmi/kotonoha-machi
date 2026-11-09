package com.kotonohamachi.village.dto;

/**
 * 마을 건물 하나의 열림 상태.
 *
 * @param id 건물 ID(home, cafe, shop)
 * @param unlocked 이 사용자에게 열려 있는지 여부
 */
public record VillageBuildingResponse(String id, boolean unlocked) {}
