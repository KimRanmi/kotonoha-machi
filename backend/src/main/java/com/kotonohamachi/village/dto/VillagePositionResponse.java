package com.kotonohamachi.village.dto;

/**
 * 마을에서 마지막으로 서 있던 자리. 한 번도 저장한 적이 없으면 두 값 모두 null이다.
 *
 * @param x 가로(x) 좌표
 * @param z 세로(z) 좌표
 */
public record VillagePositionResponse(Double x, Double z) {}
