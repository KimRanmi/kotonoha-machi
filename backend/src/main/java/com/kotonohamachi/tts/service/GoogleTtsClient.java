package com.kotonohamachi.tts.service;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.tts.TtsErrorCode;
import java.time.Duration;
import java.util.Base64;
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

/** Google Cloud Text-to-Speech REST API로 문장을 MP3로 합성한다. 키는 백엔드에서만 쓴다. */
@Component
public class GoogleTtsClient {

  private static final Logger log = LoggerFactory.getLogger(GoogleTtsClient.class);
  private static final String ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";

  private final RestClient restClient;
  private final String apiKey;

  /**
   * 생성자.
   *
   * @param apiKey Google Cloud Text-to-Speech API 키(비어 있으면 음성 합성을 쓸 수 없다)
   */
  public GoogleTtsClient(@Value("${app.tts.google-api-key}") String apiKey) {
    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(Duration.ofSeconds(5));
    requestFactory.setReadTimeout(Duration.ofSeconds(10));
    this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    this.apiKey = apiKey;
  }

  /**
   * 일본어 문장을 MP3로 합성한다.
   *
   * @param text 읽어줄 일본어 문장
   * @param voiceName 음성 이름(예: ja-JP-Neural2-B)
   * @return MP3 바이트
   * @throws ApiException 키가 설정되지 않았거나(503) 합성에 실패한 경우(502)
   */
  public byte[] synthesize(String text, String voiceName) {
    if (apiKey.isBlank()) {
      throw new ApiException(TtsErrorCode.UNAVAILABLE);
    }

    Map<String, Object> body = Map.of(
        "input", Map.of("text", text),
        "voice", Map.of("languageCode", "ja-JP", "name", voiceName),
        "audioConfig", Map.of("audioEncoding", "MP3"));

    try {
      SynthesizeResponse response = restClient
          .post()
          .uri(ENDPOINT)
          .header("X-Goog-Api-Key", apiKey)
          .contentType(MediaType.APPLICATION_JSON)
          .body(body)
          .retrieve()
          .body(SynthesizeResponse.class);
      return decodeAudio(response == null ? null : response.audioContent());
    } catch (RestClientResponseException e) {
      // 예외 메시지에 요청 정보가 섞일 수 있어 상태 코드만 남긴다(키가 로그에 남지 않게).
      log.error("Google TTS 호출 실패: HTTP {}", e.getStatusCode().value());
      throw new ApiException(TtsErrorCode.SYNTHESIS_FAILED);
    } catch (RestClientException e) {
      log.error("Google TTS 호출 실패: {}", e.getClass().getSimpleName());
      throw new ApiException(TtsErrorCode.SYNTHESIS_FAILED);
    }
  }

  /**
   * Google이 돌려준 Base64 문자열을 MP3 바이트로 바꾼다. 비었거나 잘못된 값이면 빈 음성이 캐시에 저장되지
   * 않도록 실패로 처리한다.
   */
  static byte[] decodeAudio(String audioContent) {
    if (audioContent == null || audioContent.isBlank()) {
      throw new ApiException(TtsErrorCode.SYNTHESIS_FAILED);
    }
    byte[] audio;
    try {
      audio = Base64.getDecoder().decode(audioContent);
    } catch (IllegalArgumentException e) {
      log.error("Google TTS 응답을 해석하지 못했습니다.");
      throw new ApiException(TtsErrorCode.SYNTHESIS_FAILED);
    }
    if (audio.length == 0) {
      throw new ApiException(TtsErrorCode.SYNTHESIS_FAILED);
    }
    return audio;
  }

  /** Google이 돌려주는 응답 중 필요한 부분(Base64로 인코딩된 MP3). */
  private record SynthesizeResponse(String audioContent) {}
}
