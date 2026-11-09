package com.kotonohamachi.chat.service;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.HttpOptions;
import com.google.genai.types.Part;
import com.google.genai.types.Schema;
import com.google.genai.types.Type;
import com.kotonohamachi.chat.ChatErrorCode;
import com.kotonohamachi.chat.dto.ChatResponse;
import com.kotonohamachi.common.ApiException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/** Google Gen AI SDK로 주민의 대사를 만든다. 키는 백엔드에서만 쓴다. */
@Component
public class GeminiClient {

  private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);
  private static final int TIMEOUT_MILLIS = 20_000;

  /** 응답 길이 상한. 대사는 1~2줄이라 짧지만, 추론 토큰도 포함되므로 여유를 둔다. */
  private static final int MAX_OUTPUT_TOKENS = 2048;

  private static final JsonMapper JSON_MAPPER = JsonMapper.builder().build();

  private final String apiKey;
  private final String model;
  // 키가 없어도 앱이 뜨도록 첫 호출 때 만든다.
  private volatile Client client;

  /**
   * 생성자.
   *
   * @param apiKey Gemini API 키(비어 있으면 대화를 쓸 수 없다)
   * @param model 사용할 Gemini 모델 이름
   */
  public GeminiClient(
      @Value("${app.gemini.api-key}") String apiKey, @Value("${app.gemini.model}") String model) {
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
    if (apiKey == null || apiKey.isBlank()) {
      throw new ApiException(ChatErrorCode.UNAVAILABLE);
    }

    Schema schema = Schema.builder()
        .type(Type.Known.OBJECT)
        .properties(Map.of(
            "reply", Schema.builder().type(Type.Known.STRING).build(),
            "translation", Schema.builder().type(Type.Known.STRING).build()))
        .required("reply", "translation")
        .build();
    GenerateContentConfig config = GenerateContentConfig.builder()
        .systemInstruction(Content.fromParts(Part.fromText(systemPrompt)))
        .responseMimeType("application/json")
        .maxOutputTokens(MAX_OUTPUT_TOKENS)
        .responseSchema(schema)
        .httpOptions(HttpOptions.builder().timeout(TIMEOUT_MILLIS).build())
        .build();
    Content user =
        Content.builder().role("user").parts(Part.fromText(userMessage)).build();

    String text;
    try {
      GenerateContentResponse response = getClient().models.generateContent(model, user, config);
      text = response.text();
    } catch (com.google.genai.errors.ApiException e) {
      // 예외 메시지에 요청 정보가 섞일 수 있어 상태 코드만 남긴다(키가 로그에 남지 않게).
      log.error("Gemini 호출 실패: HTTP {}", e.code());
      throw new ApiException(ChatErrorCode.GENERATION_FAILED);
    } catch (RuntimeException e) {
      log.error("Gemini 호출 실패: {}", e.getClass().getSimpleName());
      throw new ApiException(ChatErrorCode.GENERATION_FAILED);
    }
    return parseReply(text);
  }

  private Client getClient() {
    Client result = client;
    if (result == null) {
      synchronized (this) {
        result = client;
        if (result == null) {
          result = Client.builder().apiKey(apiKey).build();
          client = result;
        }
      }
    }
    return result;
  }

  /** Gemini 응답 본문(JSON 문자열)을 대사로 바꾼다. 비었거나 형식이 다르면 실패로 처리한다. */
  static ChatResponse parseReply(String text) {
    if (text == null || text.isBlank()) {
      log.error("Gemini 응답에 본문이 없습니다.");
      throw new ApiException(ChatErrorCode.GENERATION_FAILED);
    }
    try {
      ChatResponse reply = JSON_MAPPER.readValue(text, ChatResponse.class);
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
}
