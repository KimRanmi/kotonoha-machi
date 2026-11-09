package com.kotonohamachi.village.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/**
 * 마을에서 마지막으로 서 있던 자리 저장 요청 본문. 이동 가능한 땅 범위 안의 좌표만 받는다. ±17은 프런트
 * {@code VillageScene}의 {@code MAP_HALF_SIZE - 1}과 같아야 하므로, 땅 크기를 바꾸면 함께 바꾼다.
 *
 * @param x 가로(x) 좌표
 * @param z 세로(z) 좌표
 */
public record VillagePositionRequest(
    @NotNull(message = "x 좌표가 필요합니다.")
    @DecimalMin(value = "-17", message = "x 좌표가 마을 범위를 벗어났습니다.")
    @DecimalMax(value = "17", message = "x 좌표가 마을 범위를 벗어났습니다.")
    Double x,

    @NotNull(message = "z 좌표가 필요합니다.")
    @DecimalMin(value = "-17", message = "z 좌표가 마을 범위를 벗어났습니다.")
    @DecimalMax(value = "17", message = "z 좌표가 마을 범위를 벗어났습니다.")
    Double z) {}
