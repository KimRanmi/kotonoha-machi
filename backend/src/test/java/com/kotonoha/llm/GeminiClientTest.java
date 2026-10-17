package com.kotonoha.llm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.kotonoha.llm.GeminiException.Kind;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

// Gemini는 실제로 부르지 않는다. 재시도 간격은 0으로 두어 테스트가 실제로 기다리지 않는다.
class GeminiClientTest {

    static final String OK = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"{\\\"reply\\\":\\\"やあ\\\",\\\"translation\\\":\\\"안녕\\\"}\"}]}}]}";
    static final List<GeminiClient.Turn> TURNS = List.of(new GeminiClient.Turn("user", "hi"));

    MockRestServiceServer server;

    GeminiClient client(List<Duration> delays, Duration total) {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        return new GeminiClient(new GeminiProperties("test-key", "m", "http://gemini.test", delays, total), builder);
    }

    GeminiClient client() {
        return client(List.of(Duration.ZERO, Duration.ZERO), Duration.ofSeconds(10));
    }

    @Test
    void 정상_응답은_재시도_없이_본문을_돌려준다() {
        GeminiClient client = client();
        server.expect(ExpectedCount.once(), requestTo("http://gemini.test/v1beta/models/m:generateContent"))
                .andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

        assertThat(client.generateJson("sys", TURNS)).contains("やあ");
        server.verify();
    }

    @Test
    void 일시_장애_503_후_성공하면_재시도로_복구된다() {
        GeminiClient client = client();
        server.expect(ExpectedCount.times(2), requestTo("http://gemini.test/v1beta/models/m:generateContent"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        server.expect(ExpectedCount.once(), requestTo("http://gemini.test/v1beta/models/m:generateContent"))
                .andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

        assertThat(client.generateJson("sys", TURNS)).contains("やあ");
        server.verify();
    }

    @Test
    void 일시_장애가_계속되면_재시도_상한_후_TRANSIENT로_실패한다() {
        GeminiClient client = client();
        // 최초 1회 + 재시도 2회 = 정확히 3번만 부른다.
        server.expect(ExpectedCount.times(3), requestTo("http://gemini.test/v1beta/models/m:generateContent"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> client.generateJson("sys", TURNS))
                .isInstanceOfSatisfying(GeminiException.class, e -> {
                    assertThat(e.kind()).isEqualTo(Kind.TRANSIENT);
                    assertThat(e.upstreamStatus()).isEqualTo(503);
                });
        server.verify();
    }

    @Test
    void 한도_초과_429도_재시도한다() {
        GeminiClient client = client();
        server.expect(ExpectedCount.once(), requestTo("http://gemini.test/v1beta/models/m:generateContent"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        server.expect(ExpectedCount.once(), requestTo("http://gemini.test/v1beta/models/m:generateContent"))
                .andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

        assertThat(client.generateJson("sys", TURNS)).contains("やあ");
        server.verify();
    }

    @Test
    void 키_오류_401과_403은_재시도_없이_CONFIG로_실패한다() {
        for (HttpStatus status : new HttpStatus[] {HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN}) {
            GeminiClient client = client();
            server.expect(ExpectedCount.once(), requestTo("http://gemini.test/v1beta/models/m:generateContent"))
                    .andRespond(withStatus(status));

            assertThatThrownBy(() -> client.generateJson("sys", TURNS))
                    .isInstanceOfSatisfying(GeminiException.class,
                            e -> assertThat(e.kind()).isEqualTo(Kind.CONFIG));
            server.verify(); // 한 번만 불렀다
        }
    }

    @Test
    void 본문이_비었거나_JSON이_아니면_재시도_없이_FORMAT으로_실패한다() {
        GeminiClient client = client();
        server.expect(ExpectedCount.once(), requestTo("http://gemini.test/v1beta/models/m:generateContent"))
                .andRespond(withSuccess("{\"candidates\":[]}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.generateJson("sys", TURNS))
                .isInstanceOfSatisfying(GeminiException.class, e -> assertThat(e.kind()).isEqualTo(Kind.FORMAT));
        server.verify();

        GeminiClient client2 = client();
        server.expect(ExpectedCount.once(), requestTo("http://gemini.test/v1beta/models/m:generateContent"))
                .andRespond(withSuccess("<html>oops</html>", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client2.generateJson("sys", TURNS))
                .isInstanceOfSatisfying(GeminiException.class, e -> assertThat(e.kind()).isEqualTo(Kind.FORMAT));
        server.verify();
    }

    @Test
    void 총_제한_시간을_넘기게_되면_남은_재시도를_포기한다() {
        // 재시도 간격(1시간)이 총 제한(1초)을 넘으므로 기다리지 않고 바로 실패한다.
        GeminiClient client = client(List.of(Duration.ofHours(1), Duration.ofHours(1)), Duration.ofSeconds(1));
        server.expect(ExpectedCount.once(), requestTo("http://gemini.test/v1beta/models/m:generateContent"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> client.generateJson("sys", TURNS))
                .isInstanceOfSatisfying(GeminiException.class, e -> assertThat(e.kind()).isEqualTo(Kind.TRANSIENT));
        server.verify();
    }
}
