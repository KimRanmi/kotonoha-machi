package com.kotonohamachi.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.google.genai.types.Content;
import com.kotonohamachi.chat.ChatSpeaker;
import com.kotonohamachi.chat.dto.ChatHistoryItem;
import com.kotonohamachi.chat.dto.ChatResponse;
import com.kotonohamachi.common.ApiException;
import java.util.List;
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

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> client.generate("system", List.of(), "こんにちは"));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
  }

  @Test
  void generate_키가_공백이어도_503으로_거부한다() {
    GeminiClient client = new GeminiClient("   ", "gemini-2.0-flash");

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> client.generate("system", List.of(), "こんにちは"));

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
    GeminiClient client = new GeminiClient("", "gemini-2.0-flash");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> client.summarize("", List.of()));

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
}
