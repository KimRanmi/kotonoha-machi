package com.kotonohamachi.village.dto;

/**
 * 마을 땅 크기.
 *
 * @param halfSize 이동 가능한 정사각형 땅의 절반 크기. 원점이 땅의 가운데다
 * @param maxWalkCoordinate 캐릭터가 설 수 있는 가장 바깥 좌표(절대값). 위치 저장 검증과 같은 값이다
 */
public record VillageMapResponse(int halfSize, int maxWalkCoordinate) {}
