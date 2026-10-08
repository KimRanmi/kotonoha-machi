package com.kotonoha.llm;

import org.springframework.boot.context.properties.ConfigurationProperties;

// 주민(villager) 응답 생성 모델은 비용 효율적인 모델을 기본값으로 쓰되, GEMINI_MODEL로 교체할 수 있다.
@ConfigurationProperties(prefix = "gemini")
public record GeminiProperties(String apiKey, String model, String baseUrl) {

    public static final String DEFAULT_MODEL = "gemini-3.5-flash";

    public GeminiProperties {
        if (model == null || model.isBlank()) {
            model = DEFAULT_MODEL;
        }
    }

    public boolean hasApiKey() {
        return apiKey != null && !apiKey.isBlank();
    }
}
