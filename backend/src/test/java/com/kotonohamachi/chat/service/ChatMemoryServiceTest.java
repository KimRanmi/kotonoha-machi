package com.kotonohamachi.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kotonohamachi.chat.ChatErrorCode;
import com.kotonohamachi.chat.ChatMessage;
import com.kotonohamachi.chat.ChatSummary;
import com.kotonohamachi.chat.dto.ChatContext;
import com.kotonohamachi.chat.dto.ChatHistoryItem;
import com.kotonohamachi.chat.repository.ChatMessageRepository;
import com.kotonohamachi.chat.repository.ChatSummaryRepository;
import com.kotonohamachi.common.ApiException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/** {@link ChatMemoryService}의 맥락 불러오기와 요약 갱신 조건을 Mockito로 테스트한다. */
@ExtendWith(MockitoExtension.class)
class ChatMemoryServiceTest {

  private static final Long USER = 1L;
  private static final Long RESIDENT = 2L;

  @Mock
  private ChatMessageRepository messageRepository;

  @Mock
  private ChatSummaryRepository summaryRepository;

  @Mock
  private GeminiClient geminiClient;

  private ChatMemoryService service() {
    return new ChatMemoryService(messageRepository, summaryRepository, geminiClient);
  }

  private static ChatMessage message(long id, String text) {
    ChatMessage message = ChatMessage.fromPlayer(USER, RESIDENT, text);
    ReflectionTestUtils.setField(message, "id", id);
    return message;
  }

  /** id가 from..to인 메시지를 최신 순(큰 id 먼저)으로 만든다. */
  private static List<ChatMessage> latestFirst(long from, long to) {
    List<ChatMessage> list = new ArrayList<>();
    for (long id = to; id >= from; id--) {
      list.add(message(id, "m" + id));
    }
    return list;
  }

  private static List<ChatMessage> oldestFirst(long from, long to) {
    List<ChatMessage> list = new ArrayList<>();
    for (long id = from; id <= to; id++) {
      list.add(message(id, "m" + id));
    }
    return list;
  }

  @Test
  void load_요약이_없으면_빈_문자열이고_최근_대화는_오래된_순이다() {
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository.findTop10ByUserIdAndResidentIdOrderByIdDesc(USER, RESIDENT))
        .thenReturn(latestFirst(1, 3));

    ChatContext context = service().load(USER, RESIDENT);

    assertThat(context.summary()).isEmpty();
    assertThat(context.recentLines())
        .extracting(ChatHistoryItem::text)
        .containsExactly("m1", "m2", "m3");
  }

  @Test
  void load_요약이_있으면_함께_돌려준다() {
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT))
        .thenReturn(Optional.of(ChatSummary.create(USER, RESIDENT, "메모", 5L)));
    when(messageRepository.findTop10ByUserIdAndResidentIdOrderByIdDesc(USER, RESIDENT))
        .thenReturn(List.of());

    ChatContext context = service().load(USER, RESIDENT);

    assertThat(context.summary()).isEqualTo("메모");
    assertThat(context.recentLines()).isEmpty();
  }

  @Test
  void summarizeIfNeeded_최근_10줄에_못_미치면_요약하지_않는다() {
    when(messageRepository.findTop10ByUserIdAndResidentIdOrderByIdDesc(USER, RESIDENT))
        .thenReturn(latestFirst(1, 9));

    service().summarizeIfNeeded(USER, RESIDENT);

    verify(geminiClient, never()).summarize(anyString(), anyList());
    verify(summaryRepository, never()).save(any());
  }

  @Test
  void summarizeIfNeeded_오래된_줄이_20_미만이면_요약하지_않는다() {
    when(messageRepository.findTop10ByUserIdAndResidentIdOrderByIdDesc(USER, RESIDENT))
        .thenReturn(latestFirst(20, 29));
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository.findByUserIdAndResidentIdAndIdGreaterThanAndIdLessThanOrderByIdAsc(
            USER, RESIDENT, 0L, 20L))
        .thenReturn(oldestFirst(1, 19));

    service().summarizeIfNeeded(USER, RESIDENT);

    verify(geminiClient, never()).summarize(anyString(), anyList());
    verify(summaryRepository, never()).save(any());
  }

  @Test
  void summarizeIfNeeded_오래된_줄이_20_이상이면_요약해_새로_저장한다() {
    when(messageRepository.findTop10ByUserIdAndResidentIdOrderByIdDesc(USER, RESIDENT))
        .thenReturn(latestFirst(22, 31));
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository.findByUserIdAndResidentIdAndIdGreaterThanAndIdLessThanOrderByIdAsc(
            USER, RESIDENT, 0L, 22L))
        .thenReturn(oldestFirst(2, 21));
    when(geminiClient.summarize(anyString(), anyList())).thenReturn("새 요약");

    service().summarizeIfNeeded(USER, RESIDENT);

    @SuppressWarnings("unchecked")
    ArgumentCaptor<List<ChatHistoryItem>> lines = ArgumentCaptor.forClass(List.class);
    verify(geminiClient).summarize(org.mockito.ArgumentMatchers.eq(""), lines.capture());
    assertThat(lines.getValue()).hasSize(20);
    ArgumentCaptor<ChatSummary> saved = ArgumentCaptor.forClass(ChatSummary.class);
    verify(summaryRepository).save(saved.capture());
    assertThat(saved.getValue().getSummary()).isEqualTo("새 요약");
    assertThat(saved.getValue().getSummarizedUpToId()).isEqualTo(21L);
  }

  @Test
  void summarizeIfNeeded_기존_요약이_있으면_그_뒤부터_요약해_갱신한다() {
    ChatSummary existing = ChatSummary.create(USER, RESIDENT, "옛 요약", 21L);
    when(messageRepository.findTop10ByUserIdAndResidentIdOrderByIdDesc(USER, RESIDENT))
        .thenReturn(latestFirst(52, 61));
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT))
        .thenReturn(Optional.of(existing));
    when(messageRepository.findByUserIdAndResidentIdAndIdGreaterThanAndIdLessThanOrderByIdAsc(
            USER, RESIDENT, 21L, 52L))
        .thenReturn(oldestFirst(22, 51));
    when(geminiClient.summarize(anyString(), anyList())).thenReturn("갱신 요약");

    service().summarizeIfNeeded(USER, RESIDENT);

    verify(geminiClient).summarize(org.mockito.ArgumentMatchers.eq("옛 요약"), anyList());
    verify(summaryRepository).save(existing);
    assertThat(existing.getSummary()).isEqualTo("갱신 요약");
    assertThat(existing.getSummarizedUpToId()).isEqualTo(51L);
  }

  @Test
  void summarizeIfNeeded_한_번에_100줄까지만_요약한다() {
    when(messageRepository.findTop10ByUserIdAndResidentIdOrderByIdDesc(USER, RESIDENT))
        .thenReturn(latestFirst(151, 160));
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository.findByUserIdAndResidentIdAndIdGreaterThanAndIdLessThanOrderByIdAsc(
            USER, RESIDENT, 0L, 151L))
        .thenReturn(oldestFirst(1, 150));
    when(geminiClient.summarize(anyString(), anyList())).thenReturn("요약");

    service().summarizeIfNeeded(USER, RESIDENT);

    @SuppressWarnings("unchecked")
    ArgumentCaptor<List<ChatHistoryItem>> lines = ArgumentCaptor.forClass(List.class);
    verify(geminiClient).summarize(anyString(), lines.capture());
    assertThat(lines.getValue()).hasSize(100);
    ArgumentCaptor<ChatSummary> saved = ArgumentCaptor.forClass(ChatSummary.class);
    verify(summaryRepository).save(saved.capture());
    assertThat(saved.getValue().getSummarizedUpToId()).isEqualTo(100L);
  }

  @Test
  void summarizeIfNeeded_요약이_실패해도_예외가_밖으로_새지_않고_저장하지_않는다() {
    when(messageRepository.findTop10ByUserIdAndResidentIdOrderByIdDesc(USER, RESIDENT))
        .thenReturn(latestFirst(22, 31));
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository.findByUserIdAndResidentIdAndIdGreaterThanAndIdLessThanOrderByIdAsc(
            USER, RESIDENT, 0L, 22L))
        .thenReturn(oldestFirst(2, 21));
    when(geminiClient.summarize(anyString(), anyList()))
        .thenThrow(new ApiException(ChatErrorCode.GENERATION_FAILED));

    service().summarizeIfNeeded(USER, RESIDENT);

    verify(summaryRepository, never()).save(any());
  }

  @Test
  void summarizeIfNeeded_같은_쌍이_요약_중이면_중복_호출은_요약하지_않는다() throws Exception {
    when(messageRepository.findTop10ByUserIdAndResidentIdOrderByIdDesc(USER, RESIDENT))
        .thenReturn(latestFirst(31, 40));
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository.findByUserIdAndResidentIdAndIdGreaterThanAndIdLessThanOrderByIdAsc(
            USER, RESIDENT, 0L, 31L))
        .thenReturn(oldestFirst(1, 30));
    java.util.concurrent.CountDownLatch started = new java.util.concurrent.CountDownLatch(1);
    java.util.concurrent.CountDownLatch release = new java.util.concurrent.CountDownLatch(1);
    when(geminiClient.summarize(anyString(), anyList())).thenAnswer(invocation -> {
      started.countDown();
      release.await(5, java.util.concurrent.TimeUnit.SECONDS);
      return "요약";
    });
    ChatMemoryService service = service();

    Thread first = new Thread(() -> service.summarizeIfNeeded(USER, RESIDENT));
    first.start();
    assertThat(started.await(5, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
    service.summarizeIfNeeded(USER, RESIDENT); // 첫 요약이 진행 중이므로 바로 돌아와야 한다.
    release.countDown();
    first.join(5000);

    verify(geminiClient, org.mockito.Mockito.times(1)).summarize(anyString(), anyList());
  }

  @Test
  void summarizeIfNeeded_요약이_끝나면_같은_쌍을_다시_요약할_수_있다() {
    when(messageRepository.findTop10ByUserIdAndResidentIdOrderByIdDesc(USER, RESIDENT))
        .thenReturn(latestFirst(31, 40));
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository.findByUserIdAndResidentIdAndIdGreaterThanAndIdLessThanOrderByIdAsc(
            USER, RESIDENT, 0L, 31L))
        .thenReturn(oldestFirst(1, 30));
    when(geminiClient.summarize(anyString(), anyList())).thenReturn("요약");
    ChatMemoryService service = service();

    service.summarizeIfNeeded(USER, RESIDENT);
    service.summarizeIfNeeded(USER, RESIDENT);

    verify(geminiClient, org.mockito.Mockito.times(2)).summarize(anyString(), anyList());
  }
}
