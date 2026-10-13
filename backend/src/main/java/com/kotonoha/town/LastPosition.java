package com.kotonoha.town;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// 마지막으로 있던 곳. place는 "town"(마을) 또는 건물 id, x/y는 그 장소 안의 좌표.
public record LastPosition(
        @NotNull(message = "장소가 올바르지 않습니다.")
        @Size(min = 1, max = 64, message = "장소가 올바르지 않습니다.")
        @Pattern(regexp = "[A-Za-z0-9_-]+", message = "장소가 올바르지 않습니다.")
        String place,
        @DecimalMin(value = "0", message = "좌표가 올바르지 않습니다.") @DecimalMax(value = "10000", message = "좌표가 올바르지 않습니다.") double x,
        @DecimalMin(value = "0", message = "좌표가 올바르지 않습니다.") @DecimalMax(value = "10000", message = "좌표가 올바르지 않습니다.") double y) {}
