package com.kotonohamachi.tts.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.kotonohamachi.common.ApiException;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** {@link GoogleTtsClient}의 키 없음 처리와 응답 해석(빈 값·잘못된 값 거부)을 네트워크 없이 테스트한다. */
class GoogleTtsClientTest {

  @Test
  void synthesize_키가_비어_있으면_503으로_거부한다() {
    GoogleTtsClient client = new GoogleTtsClient("");

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> client.synthesize("こんにちは", "ja-JP-Neural2-B"));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
  }

  @Test
  void decodeAudio_정상_Base64는_바이트로_바꾼다() {
    String encoded = Base64.getEncoder().encodeToString(new byte[] {1, 2, 3});

    assertThat(GoogleTtsClient.decodeAudio(encoded)).containsExactly(1, 2, 3);
  }

  @Test
  void decodeAudio_null_빈_문자열_잘못된_값은_502로_거부한다() {
    for (String bad : new String[] {null, "", "   ", "***not-base64***"}) {
      ApiException exception =
          catchThrowableOfType(ApiException.class, () -> GoogleTtsClient.decodeAudio(bad));

      assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_GATEWAY);
    }
  }
}
