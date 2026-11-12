package com.kotonohamachi.chat.service;

import com.kotonohamachi.chat.ChatMessage;
import com.kotonohamachi.chat.ChatSummary;
import com.kotonohamachi.chat.dto.ChatContext;
import com.kotonohamachi.chat.dto.ChatHistoryItem;
import com.kotonohamachi.chat.repository.ChatMessageRepository;
import com.kotonohamachi.chat.repository.ChatSummaryRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * AI에게 보낼 지난 대화 맥락("요약 메모 + 최근 10줄")을 만들고, 오래된 대화를 요약해 둔다.
 *
 * <p>이렇게 하면 대화가 아무리 길어져도 AI로 가는 데이터 크기가 일정하게 유지된다.
 */
@Service
public class ChatMemoryService {

  private static final Logger log = LoggerFactory.getLogger(ChatMemoryService.class);

  /** AI에게 그대로 보내는 최근 대화 줄 수. 이보다 오래된 줄은 요약 대상이다. */
  static final int RECENT_LINES = 10;

  /** 요약하지 않은 오래된 줄이 이만큼 쌓이면 요약을 갱신한다(매 대화마다 요약하지 않도록). */
  static final int SUMMARIZE_THRESHOLD = 20;

  /** 한 번에 요약기에 넘기는 줄 수 상한. 요약이 밀렸을 때 입력이 커지지 않게 한다. */
  static final int MAX_LINES_PER_SUMMARY = 100;

  private final ChatMessageRepository messageRepository;
  private final ChatSummaryRepository summaryRepository;
  private final GeminiClient geminiClient;

  /**
   * 생성자.
   *
   * @param messageRepository 대화 기록 저장소
   * @param summaryRepository 요약 메모 저장소
   * @param geminiClient Gemini 클라이언트
   */
  public ChatMemoryService(
      ChatMessageRepository messageRepository,
      ChatSummaryRepository summaryRepository,
      GeminiClient geminiClient) {
    this.messageRepository = messageRepository;
    this.summaryRepository = summaryRepository;
    this.geminiClient = geminiClient;
  }

  /**
   * AI에게 보낼 요약 메모와 최근 대화를 불러온다.
   *
   * @param userId 사용자 ID
   * @param residentId 주민 ID
   * @return 요약 메모(없으면 빈 문자열)와 최근 10줄(오래된 것이 먼저)
   */
  public ChatContext load(Long userId, Long residentId) {
    String summary = summaryRepository
        .findByUserIdAndResidentId(userId, residentId)
        .map(ChatSummary::getSummary)
        .orElse("");
    List<ChatMessage> oldestFirst = new ArrayList<>(
        messageRepository.findTop10ByUserIdAndResidentIdOrderByIdDesc(userId, residentId));
    Collections.reverse(oldestFirst);
    return new ChatContext(summary, toItems(oldestFirst));
  }

  /**
   * 최근 10줄보다 오래된 대화가 충분히 쌓였으면 요약 메모를 갱신한다.
   *
   * <p>요약은 부가 기능이라 실패해도 대화 자체는 막지 않는다. 실패하면 로그만 남기고 다음 대화 때 다시 시도한다.
   *
   * @param userId 사용자 ID
   * @param residentId 주민 ID
   */
  public void summarizeIfNeeded(Long userId, Long residentId) {
    try {
      List<ChatMessage> recentLatestFirst =
          messageRepository.findTop10ByUserIdAndResidentIdOrderByIdDesc(userId, residentId);
      if (recentLatestFirst.size() < RECENT_LINES) {
        return;
      }
      // 최근 10줄 중 가장 오래된 줄 앞까지가 요약 대상이다.
      long oldestRecentId = recentLatestFirst.get(recentLatestFirst.size() - 1).getId();
      ChatSummary existing =
          summaryRepository.findByUserIdAndResidentId(userId, residentId).orElse(null);
      long summarizedUpToId = existing == null ? 0L : existing.getSummarizedUpToId();

      List<ChatMessage> older =
          messageRepository.findByUserIdAndResidentIdAndIdGreaterThanAndIdLessThanOrderByIdAsc(
              userId, residentId, summarizedUpToId, oldestRecentId);
      if (older.size() < SUMMARIZE_THRESHOLD) {
        return;
      }
      List<ChatMessage> target = older.subList(0, Math.min(older.size(), MAX_LINES_PER_SUMMARY));

      String previous = existing == null ? "" : existing.getSummary();
      String newSummary = geminiClient.summarize(previous, toItems(target));
      long newUpToId = target.get(target.size() - 1).getId();
      if (existing == null) {
        summaryRepository.save(ChatSummary.create(userId, residentId, newSummary, newUpToId));
      } else {
        existing.update(newSummary, newUpToId);
        summaryRepository.save(existing);
      }
    } catch (RuntimeException e) {
      log.warn("대화 요약 갱신 실패(다음 대화 때 다시 시도): {}", e.getClass().getSimpleName());
    }
  }

  private static List<ChatHistoryItem> toItems(List<ChatMessage> messages) {
    return messages.stream()
        .map(m -> new ChatHistoryItem(m.getSpeaker(), m.getText(), m.getTranslation()))
        .toList();
  }
}
