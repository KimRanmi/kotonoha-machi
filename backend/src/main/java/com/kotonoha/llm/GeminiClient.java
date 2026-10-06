package com.kotonoha.llm;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    // Gemini가 "일시적으로 혼잡하다"며 503/429를 주는 경우가 꽤 있어서, 실패를 바로 사용자에게
    // 보여주기 전에 짧게 대기하며 몇 번 더 시도한다. (500ms, 1000ms 간격으로 최대 3회)
    private static final int MAX_ATTEMPTS = 3;
    private static final long BASE_DELAY_MS = 500;

    public record Turn(String role, String text) {}

    private final GeminiProperties properties;
    private final RestClient restClient;

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
        Map<String, Object> body = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", turns.stream()
                        .map(t -> Map.of(
                                "role", t.role(),
                                "parts", List.of(Map.of("text", t.text()))))
                        .toList(),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "responseSchema", Map.of(
                                "type", "OBJECT",
                                "properties", Map.of(
                                        "reply", Map.of("type", "STRING"),
                                        "translation", Map.of("type", "STRING")),
                                "required", List.of("reply", "translation"))));

        RuntimeException lastError = null;
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                return extractText(call(body));
            } catch (HttpStatusCodeException e) {
                lastError = e;
                if (!isRetryable(e) || attempt == MAX_ATTEMPTS - 1) break;
                log.warn("Gemini {} 응답, 재시도 {}/{}", e.getStatusCode().value(), attempt + 1, MAX_ATTEMPTS - 1);
                sleep(BASE_DELAY_MS << attempt);
            } catch (RestClientException e) {
                lastError = e;
                break;
            }
        }
        throw new GeminiException("Gemini API 호출 실패", lastError);
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

    private static String extractText(JsonNode response) {
        if (response == null) return "";
        JsonNode text = response.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        return text.isMissingNode() || text.isNull() ? "" : text.asString();
    }

    private static boolean isRetryable(HttpStatusCodeException e) {
        int status = e.getStatusCode().value();
        return status == 503 || status == 429;
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GeminiException("재시도 대기 중 인터럽트", e);
        }
    }
}
