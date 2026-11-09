package com.kotonohamachi.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.kotonohamachi.chat.dto.ChatResponse;
import com.kotonohamachi.common.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;

/** {@link GeminiClient}의 키 없음 처리와 응답 해석을 네트워크 없이 테스트한다. */
class GeminiClientTest {

  @Test
  void generate_키가_비어_있으면_503으로_거부한다() {
    GeminiClient client = new GeminiClient("", "gemini-2.0-flash");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> client.generate("system", "こんにちは"));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
  }

  @Test
  void generate_키가_공백이어도_503으로_거부한다() {
    GeminiClient client = new GeminiClient("   ", "gemini-2.0-flash");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> client.generate("system", "こんにちは"));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
  }

  @Test
  void parseReply_정상_JSON이면_대사로_바꾼다() {
    ChatResponse result = GeminiClient.parseReply("{\"reply\":\"こんにちは\",\"translation\":\"안녕\"}");

    assertThat(result).isEqualTo(new ChatResponse("こんにちは", "안녕"));
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(
      strings = {
        "   ",
        "not json",
        "{\"reply\":",
        "{\"reply\":\"こんにちは\"}",
        "{\"translation\":\"안녕\"}",
        "{\"reply\":\"\",\"translation\":\"안녕\"}",
        "{\"reply\":\"こんにちは\",\"translation\":\"  \"}",
        "{\"reply\":null,\"translation\":null}",
        "{}"
      })
  void parseReply_잘못된_응답은_502로_거부한다(String text) {
    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> GeminiClient.parseReply(text));

    assertThat(exception).isNotNull();
    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_GATEWAY);
  }
}
