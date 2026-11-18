package com.kotonohamachi.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
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
  void load_요약이_없으면_afterId_0으로_조회하고_오래된_순으로_돌려준다() {
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository.findTop30ByUserIdAndResidentIdAndIdGreaterThanOrderByIdDesc(
            USER, RESIDENT, 0L))
        .thenReturn(latestFirst(1, 3));

    ChatContext context = service().load(USER, RESIDENT);

    assertThat(context.summary()).isEmpty();
    assertThat(context.recentLines())
        .extracting(ChatHistoryItem::text)
        .containsExactly("m1", "m2", "m3");
  }

  @Test
  void load_요약이_있으면_summarizedUpToId_이후만_조회해_오래된_순으로_돌려준다() {
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT))
        .thenReturn(Optional.of(ChatSummary.create(USER, RESIDENT, "메모", 5L)));
    when(messageRepository.findTop30ByUserIdAndResidentIdAndIdGreaterThanOrderByIdDesc(
            USER, RESIDENT, 5L))
        .thenReturn(latestFirst(6, 9));

    ChatContext context = service().load(USER, RESIDENT);

    assertThat(context.summary()).isEqualTo("메모");
    assertThat(context.recentLines())
        .extracting(ChatHistoryItem::text)
        .containsExactly("m6", "m7", "m8", "m9");
  }

  @Test
  void load_요약_이후_줄이_없으면_빈_목록이다() {
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT))
        .thenReturn(Optional.of(ChatSummary.create(USER, RESIDENT, "메모", 5L)));
    when(messageRepository.findTop30ByUserIdAndResidentIdAndIdGreaterThanOrderByIdDesc(
            USER, RESIDENT, 5L))
        .thenReturn(List.of());

    ChatContext context = service().load(USER, RESIDENT);

    assertThat(context.summary()).isEqualTo("메모");
    assertThat(context.recentLines()).isEmpty();
  }

  @Test
  void 요약_직후에도_오늘_줄은_load에_포함된다() {
    // 대화 id 1..21. 오늘 이전 줄은 1..11, 오늘 줄은 12..21이다.
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository
            .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
                eq(USER), eq(RESIDENT), eq(0L), any(OffsetDateTime.class)))
        .thenReturn(oldestFirst(1, 11));
    when(geminiClient.summarize(anyString(), anyList(), any())).thenReturn("요약");
    ChatMemoryService service = service();

    service.summarizeIfNeeded(USER, RESIDENT);

    ArgumentCaptor<ChatSummary> saved = ArgumentCaptor.forClass(ChatSummary.class);
    verify(summaryRepository).save(saved.capture());
    long upTo = saved.getValue().getSummarizedUpToId();
    assertThat(upTo).isEqualTo(11L); // 오늘 줄(12..) 앞까지만 요약에 담긴다.

    // 요약이 저장된 뒤 load는 upTo 이후 조회 -> 오늘 줄이 그대로 들어온다.
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT))
        .thenReturn(Optional.of(saved.getValue()));
    when(messageRepository.findTop30ByUserIdAndResidentIdAndIdGreaterThanOrderByIdDesc(
            USER, RESIDENT, upTo))
        .thenReturn(latestFirst(12, 21));

    ChatContext context = service.load(USER, RESIDENT);

    assertThat(context.summary()).isEqualTo("요약");
    assertThat(context.recentLines()).hasSize(10);
    assertThat(context.recentLines().get(0).text()).isEqualTo("m12");
    assertThat(context.recentLines().get(9).text()).isEqualTo("m21");
  }

  @Test
  void summarizeIfNeeded_오늘_이전_줄이_10_미만이면_요약하지_않는다() {
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository
            .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
                eq(USER), eq(RESIDENT), eq(0L), any(OffsetDateTime.class)))
        .thenReturn(oldestFirst(1, 9));

    service().summarizeIfNeeded(USER, RESIDENT);

    verify(geminiClient, never()).summarize(anyString(), anyList(), any());
    verify(summaryRepository, never()).save(any());
  }

  @Test
  void summarizeIfNeeded_오늘_이전_줄이_10_이상이면_요약해_새로_저장한다() {
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository
            .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
                eq(USER), eq(RESIDENT), eq(0L), any(OffsetDateTime.class)))
        .thenReturn(oldestFirst(2, 11));
    when(geminiClient.summarize(anyString(), anyList(), any())).thenReturn("새 요약");

    service().summarizeIfNeeded(USER, RESIDENT);

    @SuppressWarnings("unchecked")
    ArgumentCaptor<List<ChatHistoryItem>> lines = ArgumentCaptor.forClass(List.class);
    verify(geminiClient).summarize(org.mockito.ArgumentMatchers.eq(""), lines.capture(), any());
    assertThat(lines.getValue()).hasSize(10);
    ArgumentCaptor<ChatSummary> saved = ArgumentCaptor.forClass(ChatSummary.class);
    verify(summaryRepository).save(saved.capture());
    assertThat(saved.getValue().getSummary()).isEqualTo("새 요약");
    assertThat(saved.getValue().getSummarizedUpToId()).isEqualTo(11L);
  }

  @Test
  void summarizeIfNeeded_기존_요약이_있으면_그_뒤부터_요약해_갱신한다() {
    ChatSummary existing = ChatSummary.create(USER, RESIDENT, "옛 요약", 21L);
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT))
        .thenReturn(Optional.of(existing));
    when(messageRepository
            .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
                eq(USER), eq(RESIDENT), eq(21L), any(OffsetDateTime.class)))
        .thenReturn(oldestFirst(22, 51));
    when(geminiClient.summarize(anyString(), anyList(), any())).thenReturn("갱신 요약");

    service().summarizeIfNeeded(USER, RESIDENT);

    verify(geminiClient).summarize(org.mockito.ArgumentMatchers.eq("옛 요약"), anyList(), any());
    verify(summaryRepository).save(existing);
    assertThat(existing.getSummary()).isEqualTo("갱신 요약");
    assertThat(existing.getSummarizedUpToId()).isEqualTo(51L);
  }

  @Test
  void summarizeIfNeeded_한_번에_100줄까지만_요약한다() {
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository
            .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
                eq(USER), eq(RESIDENT), eq(0L), any(OffsetDateTime.class)))
        .thenReturn(oldestFirst(1, 150));
    when(geminiClient.summarize(anyString(), anyList(), any())).thenReturn("요약");

    service().summarizeIfNeeded(USER, RESIDENT);

    @SuppressWarnings("unchecked")
    ArgumentCaptor<List<ChatHistoryItem>> lines = ArgumentCaptor.forClass(List.class);
    verify(geminiClient).summarize(anyString(), lines.capture(), any());
    assertThat(lines.getValue()).hasSize(100);
    ArgumentCaptor<ChatSummary> saved = ArgumentCaptor.forClass(ChatSummary.class);
    verify(summaryRepository).save(saved.capture());
    assertThat(saved.getValue().getSummarizedUpToId()).isEqualTo(100L);
  }

  @Test
  void summarizeIfNeeded_요약이_실패해도_예외가_밖으로_새지_않고_저장하지_않는다() {
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository
            .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
                eq(USER), eq(RESIDENT), eq(0L), any(OffsetDateTime.class)))
        .thenReturn(oldestFirst(2, 21));
    when(geminiClient.summarize(anyString(), anyList(), any()))
        .thenThrow(new ApiException(ChatErrorCode.GENERATION_FAILED));

    service().summarizeIfNeeded(USER, RESIDENT);

    verify(summaryRepository, never()).save(any());
  }

  @Test
  void summarizeIfNeeded_같은_쌍이_요약_중이면_중복_호출은_요약하지_않는다() throws Exception {
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository
            .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
                eq(USER), eq(RESIDENT), eq(0L), any(OffsetDateTime.class)))
        .thenReturn(oldestFirst(1, 30));
    java.util.concurrent.CountDownLatch started = new java.util.concurrent.CountDownLatch(1);
    java.util.concurrent.CountDownLatch release = new java.util.concurrent.CountDownLatch(1);
    when(geminiClient.summarize(anyString(), anyList(), any())).thenAnswer(invocation -> {
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

    verify(geminiClient, org.mockito.Mockito.times(1)).summarize(anyString(), anyList(), any());
  }

  @Test
  void summarizeIfNeeded는_오늘_0시_KST_이전만_조회_대상으로_삼는다() {
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository
            .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
                any(), any(), any(), any(OffsetDateTime.class)))
        .thenReturn(List.of());
    ZoneId kst = ZoneId.of("Asia/Seoul");
    OffsetDateTime expected = LocalDate.now(kst).atStartOfDay(kst).toOffsetDateTime();

    service().summarizeIfNeeded(USER, RESIDENT);

    ArgumentCaptor<OffsetDateTime> before = ArgumentCaptor.forClass(OffsetDateTime.class);
    verify(messageRepository)
        .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
            org.mockito.ArgumentMatchers.eq(USER),
            org.mockito.ArgumentMatchers.eq(RESIDENT),
            org.mockito.ArgumentMatchers.eq(0L),
            before.capture());
    // 자정 경계에서 테스트가 겹치면 하루 차이가 날 수 있어 같은 날 0시이거나 그 다음 날 0시까지 허용한다.
    assertThat(before.getValue().toInstant())
        .isIn(expected.toInstant(), expected.plusDays(1).toInstant());
    verify(geminiClient, never()).summarize(anyString(), anyList(), any());
  }

  @Test
  void summarizeIfNeeded_오늘_줄은_요약_대상이_아니다() {
    // 조회가 오늘 이전 줄(1..10)만 돌려준다. 오늘 줄(11..)은 요약에 들어가지 않고 upTo도 10이다.
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT)).thenReturn(Optional.empty());
    when(messageRepository
            .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
                eq(USER), eq(RESIDENT), eq(0L), any(OffsetDateTime.class)))
        .thenReturn(oldestFirst(1, 10));
    when(geminiClient.summarize(anyString(), anyList(), any())).thenReturn("요약");

    service().summarizeIfNeeded(USER, RESIDENT);

    @SuppressWarnings("unchecked")
    ArgumentCaptor<List<ChatHistoryItem>> lines = ArgumentCaptor.forClass(List.class);
    verify(geminiClient).summarize(anyString(), lines.capture(), any());
    assertThat(lines.getValue()).extracting(ChatHistoryItem::text).doesNotContain("m11");
    ArgumentCaptor<ChatSummary> saved = ArgumentCaptor.forClass(ChatSummary.class);
    verify(summaryRepository).save(saved.capture());
    assertThat(saved.getValue().getSummarizedUpToId()).isEqualTo(10L);
  }

  @Test
  void summarizeIfNeeded_요약한_뒤_같은_날_다시_호출하면_요약하지_않는다() {
    java.util.concurrent.atomic.AtomicReference<ChatSummary> stored =
        new java.util.concurrent.atomic.AtomicReference<>();
    when(summaryRepository.findByUserIdAndResidentId(USER, RESIDENT))
        .thenAnswer(invocation -> Optional.ofNullable(stored.get()));
    when(summaryRepository.save(any(ChatSummary.class))).thenAnswer(invocation -> {
      stored.set(invocation.getArgument(0));
      return invocation.getArgument(0);
    });
    // 오늘 이전 줄은 1..11. 요약 후에는 11 초과인 오늘 이전 줄이 없다.
    when(messageRepository
            .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
                eq(USER), eq(RESIDENT), eq(0L), any(OffsetDateTime.class)))
        .thenReturn(oldestFirst(1, 11));
    when(messageRepository
            .findByUserIdAndResidentIdAndIdGreaterThanAndCreatedAtLessThanOrderByIdAsc(
                eq(USER), eq(RESIDENT), eq(11L), any(OffsetDateTime.class)))
        .thenReturn(List.of());
    when(geminiClient.summarize(anyString(), anyList(), any())).thenReturn("요약");
    ChatMemoryService service = service();

    service.summarizeIfNeeded(USER, RESIDENT);
    service.summarizeIfNeeded(USER, RESIDENT);

    verify(geminiClient, org.mockito.Mockito.times(1)).summarize(anyString(), anyList(), any());
    assertThat(stored.get().getSummarizedUpToId()).isEqualTo(11L);
  }
}
