package com.kotonoha.town;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record HomePosition(
        @DecimalMin(value = "0", message = "좌표가 올바르지 않습니다.") @DecimalMax(value = "10000", message = "좌표가 올바르지 않습니다.") double x,
        @DecimalMin(value = "0", message = "좌표가 올바르지 않습니다.") @DecimalMax(value = "10000", message = "좌표가 올바르지 않습니다.") double y) {}
