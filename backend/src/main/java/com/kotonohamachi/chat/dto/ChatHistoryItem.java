package com.kotonohamachi.chat.dto;

import com.kotonohamachi.chat.ChatMessage;
import com.kotonohamachi.chat.ChatSpeaker;

/**
 * 대화 기록 한 줄.
 *
 * @param speaker 말한 쪽(PLAYER 또는 RESIDENT)
 * @param text 일본어 대사
 * @param translation 주민 대사의 한국어 번역(플레이어의 말이면 null)
 */
public record ChatHistoryItem(ChatSpeaker speaker, String text, String translation) {

  /** 저장된 대화 한 줄을 화면·AI용 한 줄로 바꾼다. */
  public static ChatHistoryItem from(ChatMessage message) {
    return new ChatHistoryItem(message.getSpeaker(), message.getText(), message.getTranslation());
  }
}
