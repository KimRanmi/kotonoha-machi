package com.kotonohamachi.chat.service;

import com.kotonohamachi.chat.ChatErrorCode;
import com.kotonohamachi.chat.dto.ChatResponse;
import com.kotonohamachi.common.ApiException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/** Gemini REST API(generateContent)로 주민의 대사를 만든다. 키는 백엔드에서만 쓴다. */
@Component
public class GeminiClient {

  private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);
  private static final String ENDPOINT_FORMAT =
      "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

  private final RestClient restClient;
  private final JsonMapper jsonMapper = JsonMapper.builder().build();
  private final String apiKey;
  private final String model;

  /**
   * 생성자.
   *
   * @param apiKey Gemini API 키(비어 있으면 대화를 쓸 수 없다)
   * @param model 사용할 Gemini 모델 이름
   */
  public GeminiClient(
      @Value("${app.gemini.api-key}") String apiKey, @Value("${app.gemini.model}") String model) {
    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(Duration.ofSeconds(5));
    requestFactory.setReadTimeout(Duration.ofSeconds(20));
    this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * 시스템 프롬프트와 사용자 메시지로 주민의 대사(일본어)와 한국어 번역을 받는다.
   *
   * @param systemPrompt 캐릭터 설정이 담긴 시스템 프롬프트
   * @param userMessage 플레이어의 메시지(시스템 프롬프트와 분리해 보낸다)
   * @return 일본어 대사와 한국어 번역
   * @throws ApiException 키가 설정되지 않았거나(503) 대사 생성에 실패한 경우(502)
   */
  public ChatResponse generate(String systemPrompt, String userMessage) {
    if (apiKey.isBlank()) {
      throw new ApiException(ChatErrorCode.UNAVAILABLE);
    }

    Map<String, Object> schema = Map.of(
        "type", "OBJECT",
        "properties",
            Map.of(
                "reply", Map.of("type", "STRING"),
                "translation", Map.of("type", "STRING")),
        "required", List.of("reply", "translation"));
    Map<String, Object> body = Map.of(
        "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
        "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", userMessage)))),
        "generationConfig",
            Map.of("responseMimeType", "application/json", "responseSchema", schema));

    try {
      GenerateResponse response = restClient
          .post()
          .uri(ENDPOINT_FORMAT.formatted(model))
          .header("x-goog-api-key", apiKey)
          .contentType(MediaType.APPLICATION_JSON)
          .body(body)
          .retrieve()
          .body(GenerateResponse.class);
      return parseReply(response);
    } catch (RestClientResponseException e) {
      // 예외 메시지에 요청 정보가 섞일 수 있어 상태 코드만 남긴다(키가 로그에 남지 않게).
      log.error("Gemini 호출 실패: HTTP {}", e.getStatusCode().value());
      throw new ApiException(ChatErrorCode.GENERATION_FAILED);
    } catch (RestClientException e) {
      log.error("Gemini 호출 실패: {}", e.getClass().getSimpleName());
      throw new ApiException(ChatErrorCode.GENERATION_FAILED);
    }
  }

  /** Gemini 응답에서 JSON 본문을 꺼내 대사로 바꾼다. 비었거나 형식이 다르면 실패로 처리한다. */
  private ChatResponse parseReply(GenerateResponse response) {
    String text = response == null ? null : response.firstText();
    if (text == null || text.isBlank()) {
      log.error("Gemini 응답에 본문이 없습니다.");
      throw new ApiException(ChatErrorCode.GENERATION_FAILED);
    }
    try {
      ChatResponse reply = jsonMapper.readValue(text, ChatResponse.class);
      if (reply.reply() == null
          || reply.reply().isBlank()
          || reply.translation() == null
          || reply.translation().isBlank()) {
        log.error("Gemini 응답에 reply/translation이 비어 있습니다.");
        throw new ApiException(ChatErrorCode.GENERATION_FAILED);
      }
      return reply;
    } catch (JacksonException e) {
      log.error("Gemini 응답을 해석하지 못했습니다.");
      throw new ApiException(ChatErrorCode.GENERATION_FAILED);
    }
  }

  /** Gemini가 돌려주는 응답 중 필요한 부분(첫 후보의 첫 텍스트). */
  private record GenerateResponse(List<Candidate> candidates) {

    String firstText() {
      if (candidates == null || candidates.isEmpty()) {
        return null;
      }
      Content content = candidates.get(0).content();
      if (content == null || content.parts() == null || content.parts().isEmpty()) {
        return null;
      }
      return content.parts().get(0).text();
    }
  }

  private record Candidate(Content content) {}

  private record Content(List<Part> parts) {}

  private record Part(String text) {}
}
