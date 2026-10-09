package com.kotonoha.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-1234";

    JwtService service(String secret, Duration expiration) {
        return new JwtService(new JwtProperties(secret, expiration));
    }

    @Test
    void 발급한_토큰은_검증되고_user_id가_나온다() {
        JwtService jwt = service(SECRET, Duration.ofHours(1));
        assertThat(jwt.verify(jwt.issue(42))).contains(42L);
    }

    @Test
    void 다른_키로_서명한_토큰은_거부한다() {
        String token = service(SECRET, Duration.ofHours(1)).issue(1);
        assertThat(service("another-secret-another-secret-123456", Duration.ofHours(1)).verify(token)).isEmpty();
    }

    @Test
    void 만료된_토큰은_거부한다() {
        JwtService jwt = service(SECRET, Duration.ofSeconds(-5));
        assertThat(jwt.verify(jwt.issue(1))).isEmpty();
    }

    @Test
    void 깨진_토큰은_거부한다() {
        JwtService jwt = service(SECRET, Duration.ofHours(1));
        assertThat(jwt.verify("garbage")).isEmpty();
        assertThat(jwt.verify(jwt.issue(1) + "x")).isEmpty();
    }

    @Test
    void 너무_짧은_키는_시작을_막는다() {
        assertThatThrownBy(() -> service("short", Duration.ofHours(1))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 키가_없으면_임의_키로_동작한다() {
        JwtService jwt = service("", Duration.ofHours(1));
        assertThat(jwt.verify(jwt.issue(7))).contains(7L);
    }
}
