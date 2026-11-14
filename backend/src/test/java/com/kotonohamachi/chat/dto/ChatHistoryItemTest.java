package com.kotonohamachi.chat.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.kotonohamachi.chat.ChatMessage;
import com.kotonohamachi.chat.ChatSpeaker;
import org.junit.jupiter.api.Test;

/** {@link ChatHistoryItem#from(ChatMessage)} 변환을 검증한다. */
class ChatHistoryItemTest {

  @Test
  void from은_플레이어_줄을_번역_없이_옮긴다() {
    ChatHistoryItem item = ChatHistoryItem.from(ChatMessage.fromPlayer(1L, 2L, "こんにちは"));

    assertThat(item.speaker()).isEqualTo(ChatSpeaker.PLAYER);
    assertThat(item.text()).isEqualTo("こんにちは");
    assertThat(item.translation()).isNull();
  }

  @Test
  void from은_주민_줄의_번역도_옮긴다() {
    ChatHistoryItem item = ChatHistoryItem.from(ChatMessage.fromResident(1L, 2L, "やあ", "안녕"));

    assertThat(item.speaker()).isEqualTo(ChatSpeaker.RESIDENT);
    assertThat(item.translation()).isEqualTo("안녕");
  }
}
