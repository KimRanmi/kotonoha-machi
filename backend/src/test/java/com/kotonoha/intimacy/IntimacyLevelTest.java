package com.kotonoha.intimacy;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class IntimacyLevelTest {

    @ParameterizedTest
    @CsvSource({
            "0, 0", "2, 0",
            "3, 3", "7, 3",
            "8, 8", "14, 8",
            "15, 15", "24, 15",
            "25, 25", "39, 25",
            "40, 40", "1000, 40"
    })
    void 단계_경계값(int exchanges, int expectedMin) {
        assertThat(IntimacyLevel.of(exchanges).minExchanges()).isEqualTo(expectedMin);
    }

    @ParameterizedTest
    @CsvSource({"-5"})
    void 음수는_가장_낮은_단계(int exchanges) {
        assertThat(IntimacyLevel.of(exchanges).minExchanges()).isZero();
    }
}
