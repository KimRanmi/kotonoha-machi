package com.kotonohamachi.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Schema;
import com.kotonohamachi.chat.AiCallType;
import com.kotonohamachi.chat.ChatSpeaker;
import com.kotonohamachi.chat.dto.ChatHistoryItem;
import com.kotonohamachi.chat.dto.ChatResponse;
import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.vocabulary.dto.DictionaryWord;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
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

  @Test
  void replySchema_reply는_일본어_translation은_한국어라고_설명한다() {
    Schema schema = GeminiClient.replySchema();

    assertThat(schema.properties().orElseThrow()).containsKeys("reply", "translation");
    assertThat(schema.properties().orElseThrow().get("reply").description().orElse(""))
        .contains("일본어로만")
        .contains("한글");
    assertThat(
            schema.properties().orElseThrow().get("translation").description().orElse(""))
        .contains("한국어 번역");
    assertThat(schema.required().orElseThrow()).contains("reply", "translation");
  }

  @ParameterizedTest
  @ValueSource(strings = {"おや、いい天気じゃな。", "こんにちは！カフェはどこですか？", "はじめまして、ミミと申します", ""})
  void containsHangul_일본어나_빈_문자열은_false다(String text) {
    assertThat(GeminiClient.containsHangul(text)).isFalse();
  }

  @ParameterizedTest
  @ValueSource(strings = {"어허, 날씨가 좋구먼.", "おや、いい天気じゃな。 어허", "ㄱ", "안녕하세요"})
  void containsHangul_한글이_섞이면_true다(String text) {
    assertThat(GeminiClient.containsHangul(text)).isTrue();
  }

  @Test
  void containsHangul_null이면_false다() {
    assertThat(GeminiClient.containsHangul(null)).isFalse();
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

  /** 호출마다 준비한 응답을 차례로 돌려주고, 넘겨받은 설정을 모아 두는 클라이언트. */
  private GeminiClient scripted(List<String> bodies, List<GenerateContentConfig> configs) {
    AtomicInteger calls = new AtomicInteger();
    return new GeminiClient("key", "test-model", usageRecorder) {
      @Override
      GenerateContentResponse fetch(List<Content> contents, GenerateContentConfig config) {
        configs.add(config);
        int index = Math.min(calls.getAndIncrement(), bodies.size() - 1);
        return GenerateContentResponse.fromJson(bodies.get(index));
      }
    };
  }

  /** reply·translation을 담은 Gemini 응답 본문. */
  private static String replyBody(String reply, String translation) {
    return OK_JSON.formatted(
        "{\\\"reply\\\":\\\"" + reply + "\\\",\\\"translation\\\":\\\"" + translation + "\\\"}");
  }

  /** 설정에 담긴 시스템 프롬프트 본문. */
  private static String systemInstruction(GenerateContentConfig config) {
    return config
        .systemInstruction()
        .orElseThrow()
        .parts()
        .orElseThrow()
        .get(0)
        .text()
        .orElse("");
  }

  @Test
  void generate_성공하면_토큰_수와_함께_CHAT으로_기록한다() {
    String json = replyBody("やあ", "안녕");

    ChatResponse result = fake(json, null).generate("system", List.of(), "こんにちは", 7L);

    assertThat(result).isEqualTo(new ChatResponse("やあ", "안녕"));
    // 출력 토큰 = 본문 20 + 추론 5
    org.mockito.Mockito.verify(usageRecorder)
        .record(7L, AiCallType.CHAT, "test-model", 100, 25, true, null);
  }

  @Test
  void generate_reply에_한글이_섞이면_재지시를_붙여_한_번_다시_요청한다() {
    List<GenerateContentConfig> configs = new ArrayList<>();
    GeminiClient client = scripted(
        List.of(
            replyBody("어허, 날씨가 좋구먼.", "어허, 날씨가 좋구먼."), replyBody("おや、いい天気じゃな。", "어허, 날씨가 좋구먼.")),
        configs);

    ChatResponse result = client.generate("system", List.of(), "こんにちは", 7L);

    assertThat(result).isEqualTo(new ChatResponse("おや、いい天気じゃな。", "어허, 날씨가 좋구먼."));
    assertThat(configs).hasSize(2);
    assertThat(systemInstruction(configs.get(0))).isEqualTo("system");
    assertThat(systemInstruction(configs.get(1))).contains("한글이 섞였습니다");
    org.mockito.Mockito.verify(usageRecorder, org.mockito.Mockito.times(2))
        .record(7L, AiCallType.CHAT, "test-model", 100, 25, true, null);
  }

  @Test
  void generate_재시도에도_한글이_섞이면_받은_대사를_그대로_돌려준다() {
    List<GenerateContentConfig> configs = new ArrayList<>();
    GeminiClient client = scripted(
        List.of(replyBody("어허, 날씨가 좋구먼.", "어허, 날씨가 좋구먼."), replyBody("그래, 좋구먼.", "그래, 좋구먼.")),
        configs);

    ChatResponse result = client.generate("system", List.of(), "こんにちは", 7L);

    // 대화를 끊지 않고 재시도 응답을 그대로 쓴다(경고 로그만 남긴다).
    assertThat(result).isEqualTo(new ChatResponse("그래, 좋구먼.", "그래, 좋구먼."));
    assertThat(configs).hasSize(2);
  }

  @Test
  void generate_reply가_일본어면_한_번만_요청한다() {
    List<GenerateContentConfig> configs = new ArrayList<>();
    GeminiClient client = scripted(List.of(replyBody("やあ", "안녕")), configs);

    client.generate("system", List.of(), "こんにちは", 7L);

    assertThat(configs).hasSize(1);
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
