package com.kotonohamachi.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.kotonohamachi.chat.AiCallType;
import com.kotonohamachi.chat.ChatSpeaker;
import com.kotonohamachi.chat.dto.ChatHistoryItem;
import com.kotonohamachi.chat.dto.ChatResponse;
import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.vocabulary.dto.DictionaryWord;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;

/** {@link GeminiClient}의 키 없음 처리와 응답 해석을 네트워크 없이 테스트한다. */
class GeminiClientTest {

  private final AiUsageRecorder usageRecorder = org.mockito.Mockito.mock(AiUsageRecorder.class);

  @Test
  void generate_키가_비어_있으면_503으로_거부한다() {
    GeminiClient client = new GeminiClient("", "gemini-2.0-flash", usageRecorder);

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> client.generate("system", List.of(), "こんにちは", 1L));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
  }

  @Test
  void generate_키가_공백이어도_503으로_거부한다() {
    GeminiClient client = new GeminiClient("   ", "gemini-2.0-flash", usageRecorder);

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> client.generate("system", List.of(), "こんにちは", 1L));

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

  @Test
  void summarize_키가_비어_있으면_503으로_거부한다() {
    GeminiClient client = new GeminiClient("", "gemini-2.0-flash", usageRecorder);

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> client.summarize("", List.of(), 1L));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
  }

  private static ChatHistoryItem player(String text) {
    return new ChatHistoryItem(ChatSpeaker.PLAYER, text, null);
  }

  private static ChatHistoryItem resident(String text) {
    return new ChatHistoryItem(ChatSpeaker.RESIDENT, text, "번역");
  }

  @Test
  void buildContents_주민_줄로_시작하면_앞의_주민_줄을_건너뛴다() {
    List<Content> contents = GeminiClient.buildContents(
        List.of(resident("r1"), resident("r2"), player("p1"), resident("r3")), "now");

    assertThat(contents)
        .extracting(Content::role)
        .extracting(o -> o.orElse(null))
        .containsExactly("user", "model", "user");
    assertThat(contents.get(0).parts().get().get(0).text().get()).isEqualTo("p1");
  }

  @Test
  void buildContents_플레이어로_시작하면_모두_유지하고_role이_번갈아_나온다() {
    List<Content> contents = GeminiClient.buildContents(
        List.of(player("p1"), resident("r1"), player("p2"), resident("r2")), "now");

    assertThat(contents)
        .extracting(Content::role)
        .extracting(o -> o.orElse(null))
        .containsExactly("user", "model", "user", "model", "user");
  }

  @Test
  void buildContents_빈_목록이면_현재_말_하나만_있다() {
    List<Content> contents = GeminiClient.buildContents(List.of(), "now");

    assertThat(contents).hasSize(1);
    assertThat(contents.get(0).role().get()).isEqualTo("user");
    assertThat(contents.get(0).parts().get().get(0).text().get()).isEqualTo("now");
  }

  @Test
  void buildContents_마지막은_user_역할의_현재_말이다() {
    List<Content> contents =
        GeminiClient.buildContents(List.of(player("p1"), resident("r1")), "now");

    Content last = contents.get(contents.size() - 1);
    assertThat(last.role().get()).isEqualTo("user");
    assertThat(last.parts().get().get(0).text().get()).isEqualTo("now");
  }

  @Test
  void fromGoogleError_Google_429는_우리_429로_바꾼다() {
    ApiException exception = GeminiClient.fromGoogleError(429);

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    assertThat(exception.getMessage()).contains("졸려요");
  }

  @ParameterizedTest
  @ValueSource(ints = {400, 401, 500, 503})
  void fromGoogleError_그_밖의_오류는_502로_바꾼다(int httpStatus) {
    assertThat(GeminiClient.fromGoogleError(httpStatus).getStatus())
        .isEqualTo(HttpStatus.BAD_GATEWAY);
  }

  private static final String OK_JSON = """
      {"candidates":[{"content":{"role":"model","parts":[{"text":"%s"}]}}],
       "usageMetadata":{"promptTokenCount":100,"candidatesTokenCount":20,"thoughtsTokenCount":5}}
      """;

  /** 네트워크 대신 정해 둔 응답을 돌려주거나 정해 둔 예외를 던지는 클라이언트. */
  private GeminiClient fake(String body, RuntimeException failure) {
    return new GeminiClient("key", "test-model", usageRecorder) {
      @Override
      GenerateContentResponse fetch(List<Content> contents, GenerateContentConfig config) {
        if (failure != null) {
          throw failure;
        }
        return GenerateContentResponse.fromJson(body);
      }
    };
  }

  @Test
  void generate_성공하면_토큰_수와_함께_CHAT으로_기록한다() {
    String json = OK_JSON.formatted("{\\\"reply\\\":\\\"やあ\\\",\\\"translation\\\":\\\"안녕\\\"}");

    ChatResponse result = fake(json, null).generate("system", List.of(), "こんにちは", 7L);

    assertThat(result).isEqualTo(new ChatResponse("やあ", "안녕"));
    // 출력 토큰 = 본문 20 + 추론 5
    org.mockito.Mockito.verify(usageRecorder)
        .record(7L, AiCallType.CHAT, "test-model", 100, 25, true, null);
  }

  @Test
  void summarize_성공하면_SUMMARY로_기록한다() {
    String result = fake(OK_JSON.formatted("요약"), null).summarize("", List.of(), 7L);

    assertThat(result).isEqualTo("요약");
    org.mockito.Mockito.verify(usageRecorder)
        .record(7L, AiCallType.SUMMARY, "test-model", 100, 25, true, null);
  }

  @Test
  void translateMeaning_성공하면_TRANSLATE로_기록한다() {
    DictionaryWord word = new DictionaryWord("漆器", "しっき", "lacquerware", null);

    String result = fake(OK_JSON.formatted("칠기"), null).translateMeaning(word, 7L);

    assertThat(result).isEqualTo("칠기");
    org.mockito.Mockito.verify(usageRecorder)
        .record(7L, AiCallType.TRANSLATE, "test-model", 100, 25, true, null);
  }

  @Test
  void 호출이_Google_오류로_실패하면_상태_코드와_함께_실패로_기록한다() {
    GeminiClient client =
        fake(null, new com.google.genai.errors.ApiException(429, "RESOURCE_EXHAUSTED", "quota"));

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> client.generate("system", List.of(), "こんにちは", 7L));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    org.mockito.Mockito.verify(usageRecorder)
        .record(7L, AiCallType.CHAT, "test-model", null, null, false, 429);
  }

  @Test
  void 네트워크_오류로_실패해도_실패로_기록한다() {
    GeminiClient client = fake(null, new IllegalStateException("timeout"));

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> client.summarize("", List.of(), 7L));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_GATEWAY);
    org.mockito.Mockito.verify(usageRecorder)
        .record(7L, AiCallType.SUMMARY, "test-model", null, null, false, null);
  }

  @Test
  void 키가_없어_호출하지_않은_경우는_기록하지_않는다() {
    GeminiClient client = new GeminiClient("", "test-model", usageRecorder);

    catchThrowableOfType(
        ApiException.class, () -> client.generate("system", List.of(), "こんにちは", 7L));

    org.mockito.Mockito.verifyNoInteractions(usageRecorder);
  }
}
