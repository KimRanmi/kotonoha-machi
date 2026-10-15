package com.kotonoha.llm;

import com.kotonoha.llm.GeminiException.Kind;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    public record Turn(String role, String text) {}

    private final GeminiProperties properties;
    private final RestClient restClient;
    // 한 번의 시도가 남은 시간을 넘기면 끊을 수 있도록 호출을 별도 가상 스레드에서 돌린다.
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public GeminiClient(GeminiProperties properties, RestClient.Builder builder) {
        this.properties = properties;
        this.restClient = builder.baseUrl(properties.baseUrl()).build();
    }

    public boolean isConfigured() {
        return properties.hasApiKey();
    }

    // 응답 생성과 번역을 한 번의 호출에서 JSON({reply, translation})으로 받는다.
    // 호출을 둘로 나누면 번역 호출만 호출 빈도 제한에 걸려 번역이 자주 누락됐다.
    public String generateJson(String systemPrompt, List<Turn> turns) {
        return generate(body(systemPrompt, turns, Map.of(
                "responseMimeType", "application/json",
                "responseSchema", Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "reply", Map.of("type", "STRING"),
                                "translation", Map.of("type", "STRING")),
                        "required", List.of("reply", "translation")))));
    }

    // 부가 호출(번역 다시 시도 등)용. 형식 지정 없이 텍스트만 받는다.
    public String generateText(String systemPrompt, List<Turn> turns) {
        return generate(body(systemPrompt, turns, Map.of()));
    }

    private static Map<String, Object> body(String systemPrompt, List<Turn> turns, Map<String, Object> generationConfig) {
        return Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", turns.stream()
                        .map(t -> Map.of(
                                "role", t.role(),
                                "parts", List.of(Map.of("text", t.text()))))
                        .toList(),
                "generationConfig", generationConfig);
    }

    // 일시 장애(TRANSIENT)만 설정된 간격으로 재시도한다. 총 소요(대기 포함)가 totalTimeout을 넘기게 되면
    // 남은 재시도를 포기한다. 로그에는 장애 유형/상태/시도 횟수만 남기고 키, 프롬프트, 대화 내용은 남기지 않는다.
    private String generate(Map<String, Object> body) {
        List<Duration> delays = properties.retryDelays();
        long budgetNanos = properties.totalTimeout().toNanos();
        long start = System.nanoTime();
        GeminiException last = null;
        for (int attempt = 0; attempt <= delays.size(); attempt++) {
            long remaining = budgetNanos - (System.nanoTime() - start);
            if (remaining <= 0) break;
            try {
                return extractText(callWithin(body, remaining));
            } catch (GeminiException e) {
                last = e;
                if (e.kind() != Kind.TRANSIENT || attempt == delays.size()) break;
                Duration delay = delays.get(attempt);
                if ((System.nanoTime() - start) + delay.toNanos() >= budgetNanos) break;
                log.warn("Gemini 일시 장애(status={}), {}ms 후 재시도 {}/{}", e.upstreamStatus(), delay.toMillis(),
                        attempt + 1, delays.size());
                sleep(delay);
            }
        }
        throw last != null ? last
                : new GeminiException(Kind.TRANSIENT, "Gemini 호출 제한 시간 초과", null);
    }

    private JsonNode callWithin(Map<String, Object> body, long timeoutNanos) {
        Future<JsonNode> future = executor.submit(() -> call(body));
        try {
            return future.get(timeoutNanos, TimeUnit.NANOSECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new GeminiException(Kind.TRANSIENT, "Gemini 응답 시간 초과", e);
        } catch (InterruptedException e) {
            future.cancel(true);
            Thread.currentThread().interrupt();
            throw new GeminiException(Kind.TRANSIENT, "Gemini 호출 중 인터럽트", e);
        } catch (ExecutionException e) {
            throw classify(e.getCause());
        }
    }

    private static GeminiException classify(Throwable t) {
        if (t instanceof HttpStatusCodeException e) {
            int status = e.getStatusCode().value();
            // 429(한도)와 5xx(503 과부하 등)는 잠시 뒤 나아질 수 있다. 나머지 4xx(401/403 키 문제, 400/404 요청·모델 설정)는 아니다.
            boolean transientStatus = status == 429 || status >= 500;
            return new GeminiException(transientStatus ? Kind.TRANSIENT : Kind.CONFIG, status,
                    "Gemini HTTP " + status, e);
        }
        // 연결 실패/읽기 타임아웃 등 입출력 오류
        if (t instanceof ResourceAccessException e) {
            return new GeminiException(Kind.TRANSIENT, "Gemini 네트워크 오류", e);
        }
        if (t instanceof RestClientException e) {
            return new GeminiException(Kind.FORMAT, "Gemini 응답을 해석하지 못함", e);
        }
        if (t instanceof GeminiException e) return e;
        return new GeminiException(Kind.TRANSIENT, "Gemini 호출 중 예기치 못한 오류", t);
    }

    private JsonNode call(Map<String, Object> body) {
        return restClient.post()
                .uri("/v1beta/models/{model}:generateContent", properties.model())
                .header("x-goog-api-key", properties.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    // 안전 필터 등으로 본문이 비어 오면 형식 오류로 본다 (빈 답을 정상 응답처럼 저장하지 않는다).
    private static String extractText(JsonNode response) {
        JsonNode text = response == null ? null
                : response.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        if (text == null || text.isMissingNode() || text.isNull() || text.asString().isBlank()) {
            throw new GeminiException(Kind.FORMAT, "Gemini 응답에 본문이 없음", null);
        }
        return text.asString();
    }

    private static void sleep(Duration delay) {
        if (delay.isZero() || delay.isNegative()) return;
        try {
            Thread.sleep(delay);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GeminiException(Kind.TRANSIENT, "재시도 대기 중 인터럽트", e);
        }
    }
}
