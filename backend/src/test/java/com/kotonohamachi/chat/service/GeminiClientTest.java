package com.kotonohamachi.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.kotonohamachi.common.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** {@link GeminiClient}의 키 없음 처리를 네트워크 없이 테스트한다. */
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
}
