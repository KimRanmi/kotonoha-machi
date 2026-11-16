package com.kotonohamachi.vocabulary.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.kotonohamachi.vocabulary.DictionaryWord;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** 사전 응답에서 표기가 정확히 일치하는 항목만 골라내는 규칙을 검증한다. 네트워크는 쓰지 않는다. */
class DictionaryClientTest {

  private static final String TABERU = """
      {"data":[
        {"jlpt":["jlpt-n5"],
         "japanese":[{"word":"食べる","reading":"たべる"}],
         "senses":[
           {"english_definitions":["Lacquerware"],"parts_of_speech":["Wikipedia definition"]},
           {"english_definitions":["to eat","to live on","to subsist","to extra"],
            "parts_of_speech":["Ichidan verb"]}]}]}
      """;

  @Test
  void 표기가_같은_항목의_읽는_법_영어뜻_JLPT를_돌려준다() {
    Optional<DictionaryWord> word = DictionaryClient.parse(TABERU, "食べる");

    assertThat(word)
        .contains(new DictionaryWord("食べる", "たべる", "to eat, to live on, to subsist", 5));
  }

  @Test
  void 표기가_다르면_비슷해도_찾지_못한_것으로_본다() {
    assertThat(DictionaryClient.parse(TABERU, "食べた")).isEmpty();
  }

  @Test
  void 가나만_있는_단어는_읽는_법이_같으면_찾는다() {
    String body = """
        {"data":[{"jlpt":[],"japanese":[{"reading":"ありがとう"}],
        "senses":[{"english_definitions":["thank you"],"parts_of_speech":["Expression"]}]}]}
        """;

    assertThat(DictionaryClient.parse(body, "ありがとう"))
        .contains(new DictionaryWord("ありがとう", "ありがとう", "thank you", null));
  }

  @Test
  void 결과가_없으면_빈_값이다() {
    assertThat(DictionaryClient.parse("{\"data\":[]}", "ほげ")).isEmpty();
  }
}
