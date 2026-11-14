package com.kotonohamachi.chat.service;

import com.kotonohamachi.chat.ChatMessage;
import com.kotonohamachi.chat.ChatSummary;
import com.kotonohamachi.chat.dto.ChatContext;
import com.kotonohamachi.chat.dto.ChatHistoryItem;
import com.kotonohamachi.chat.repository.ChatMessageRepository;
import com.kotonohamachi.chat.repository.ChatSummaryRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * AI에게 보낼 지난 대화 맥락("요약 메모 + 요약 이후의 대화 원문")을 만들고, 지난 날의 대화를 요약해 둔다.
 *
 * <p>요약은 오늘(한국 시간) 이전의 대화만 담는다. 그래서 같은 주민과는 하루에 한 번만 요약하고(Gemini 호출을 아낀다), 오늘
 * 나눈 대화는 요약 없이 원문 그대로 AI에게 보내 하루 동안의 대화가 끊기지 않는다.
 */
@Service
public class ChatMemoryService {

  private static final Logger log = LoggerFactory.getLogger(ChatMemoryService.class);

  private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

  /** 오늘 이전에 요약하지 않은 줄이 이만큼 쌓이면 요약을 갱신한다. 조금뿐이면 원문으로 보내고 호출을 아낀다. */
  static final int SUMMARIZE_THRESHOLD = 10;

  /** 한 번에 요약기에 넘기는 줄 수 상한. 요약이 밀렸을 때 입력이 커지지 않게 한다. */
  static final int MAX_LINES_PER_SUMMARY = 100;

  /** 지금 요약 중인 사용자·주민 쌍. 같은 쌍을 동시에 두 번 요약하지 않게 한다. */
  private final Set<String> summarizing = ConcurrentHashMap.newKeySet();

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
   * AI에게 보낼 요약 메모와, 요약에 아직 담기지 않은 대화를 불러온다.
   *
   * <p>요약은 오늘 이전의 줄만 담고 하루에 한 번 갱신되므로, 요약 이후의 줄(오늘 나눈 대화와 아직 요약하지 않은 지난 줄)을 모두 보내야 대화가 빠지지 않는다. 최대 30줄로 묶는다.
   *
   * @param userId 사용자 ID
   * @param residentId 주민 ID
   * @return 요약 메모(없으면 빈 문자열)와 요약 이후의 대화(오래된 것이 먼저)
   */
  public ChatContext load(Long userId, Long residentId) {
    ChatSummary existing =
        summaryRepository.findByUserIdAndResidentId(userId, residentId).orElse(null);
    long summarizedUpToId = existing == null ? 0L : existing.getSummarizedUpToId();
    List<ChatMessage> oldestFirst = new ArrayList<>(
        messageRepository.findTop30ByUserIdAndResidentIdAndIdGreaterThanOrderByIdDesc(
            userId, residentId, summarizedUpToId));
    Collections.reverse(oldestFirst);
    return new ChatContext(existing == null ? "" : existing.getSummary(), toItems(oldestFirst));
  }

  /**
   * 오늘(한국 시간) 이전의 대화 중 아직 요약하지 않은 줄이 충분히 쌓였으면 요약 메모를 갱신한다. 오늘 이전 줄은 한 번 요약하면
   * 모두 반영되므로 하루에 한 번만 실행된다.
   *
   * <p>별도 스레드에서 돌아 대답을 기다리게 하지 않는다. 요약은 부가 기능이라 실패해도 대화 자체는 막지 않고, 로그만 남기고 다음 대화 때 다시 시도한다.
   *
   * @param userId 사용자 ID
   * @param residentId 주민 ID
   */
  @Async
  public void summarizeIfNeeded(Long userId, Long residentId) {
    String key = userId + ":" + residentId;
    if (!summarizing.add(key)) {
      return;
    }
    try {
      // 오늘 0시(한국 시간) 이전의 줄만 요약 대상이다. 오늘 나눈 대화는 원문으로 보낸다.
      OffsetDateTime todayStart =
          LocalDate.now(KOREA_ZONE).atStartOfDay(KOREA_ZONE).toOffsetDateTime();
      ChatSummary existing =
          summaryRepository.findByUserIdAndResidentId(userId, residentId).orElse(null);
      long summarizedUpToId = existing == null ? 0L : existing.getSummarizedUpToId();

      List<ChatMessage> older =
          messageRepository
              .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
                  userId, residentId, summarizedUpToId, todayStart);
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
      log.warn(
          "대화 요약 갱신 실패(다음 대화 때 다시 시도): user={}, resident={}, {}",
          userId,
          residentId,
          e.getClass().getSimpleName());
    } finally {
      summarizing.remove(key);
    }
  }

  private static List<ChatHistoryItem> toItems(List<ChatMessage> messages) {
    return messages.stream().map(ChatHistoryItem::from).toList();
  }
}
