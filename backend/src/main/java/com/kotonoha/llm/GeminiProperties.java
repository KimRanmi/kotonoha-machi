package com.kotonoha.llm;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

// 주민(villager) 응답 생성 모델은 비용 효율적인 모델을 기본값으로 쓰되, GEMINI_MODEL로 교체할 수 있다.
// 일시 장애(503/429/타임아웃/네트워크)일 때만 retryDelays의 간격으로 재시도하고(개수 = 재시도 횟수),
// 한 번의 호출 전체(대기 포함)는 totalTimeout을 넘기지 않는다.
@ConfigurationProperties(prefix = "gemini")
public record GeminiProperties(String apiKey, String model, String baseUrl, List<Duration> retryDelays,
        Duration totalTimeout) {

    public static final String DEFAULT_MODEL = "gemini-3.5-flash";
    public static final List<Duration> DEFAULT_RETRY_DELAYS = List.of(Duration.ofSeconds(1), Duration.ofSeconds(3));
    public static final Duration DEFAULT_TOTAL_TIMEOUT = Duration.ofSeconds(10);

    public GeminiProperties {
        if (model == null || model.isBlank()) {
            model = DEFAULT_MODEL;
        }
        if (retryDelays == null) {
            retryDelays = DEFAULT_RETRY_DELAYS;
        }
        if (totalTimeout == null) {
            totalTimeout = DEFAULT_TOTAL_TIMEOUT;
        }
    }

    public boolean hasApiKey() {
        return apiKey != null && !apiKey.isBlank();
    }
}
