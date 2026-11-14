package com.kotonohamachi.chat.controller;

import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.chat.dto.ChatDaySummary;
import com.kotonohamachi.chat.dto.ChatHistoryItem;
import com.kotonohamachi.chat.dto.ChatRequest;
import com.kotonohamachi.chat.dto.ChatResultResponse;
import com.kotonohamachi.chat.service.ChatService;
import com.kotonohamachi.user.User;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** 마을 주민과 일본어로 대화하는 API. */
@RestController
public class ChatController {

  private final ChatService chatService;

  /**
   * 생성자.
   *
   * @param chatService 주민 대화 서비스
   */
  public ChatController(ChatService chatService) {
    this.chatService = chatService;
  }

  /**
   * 주민에게 말을 걸고 대답을 돌려준다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param residentSlug 대화할 주민의 고유 키(예: r01)
   * @param request 플레이어의 메시지(본문이 없어도 된다)
   * @return 주민의 일본어 대사·한국어 번역과 대화 뒤의 친밀도
   */
  @PostMapping("/api/residents/{residentSlug}/chat")
  public ChatResultResponse chat(
      Authentication authentication,
      @PathVariable String residentSlug,
      @RequestBody(required = false) ChatRequest request) {
    User user = AuthPrincipal.resolve(authentication);
    String message = request == null ? null : request.message();
    return chatService.chat(user.getId(), residentSlug, message);
  }

  /**
   * 주민과 오늘(한국 시간) 나눈 대화를 오래된 순으로 돌려준다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param residentSlug 주민의 고유 키(예: r01)
   * @return 오늘의 대화(플레이어의 말과 주민의 대답)
   */
  @GetMapping("/api/residents/{residentSlug}/chat")
  public List<ChatHistoryItem> history(
      Authentication authentication, @PathVariable String residentSlug) {
    User user = AuthPrincipal.resolve(authentication);
    return chatService.history(user.getId(), residentSlug);
  }

  /**
   * 오늘 이전에 주민과 대화한 날들의 목록을 돌려준다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param residentSlug 주민의 고유 키(예: r01)
   * @return 날짜별 줄 수와 미리보기(최신 날짜부터, 최대 60일)
   */
  @GetMapping("/api/residents/{residentSlug}/chat/days")
  public List<ChatDaySummary> historyDays(
      Authentication authentication, @PathVariable String residentSlug) {
    User user = AuthPrincipal.resolve(authentication);
    return chatService.historyDays(user.getId(), residentSlug);
  }

  /**
   * 특정 날(한국 시간)에 주민과 나눈 대화를 오래된 순으로 돌려준다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param residentSlug 주민의 고유 키(예: r01)
   * @param date 조회할 날짜(yyyy-MM-dd)
   * @return 그날의 대화
   */
  @GetMapping("/api/residents/{residentSlug}/chat/days/{date}")
  public List<ChatHistoryItem> historyOfDay(
      Authentication authentication,
      @PathVariable String residentSlug,
      @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
    User user = AuthPrincipal.resolve(authentication);
    return chatService.historyOfDay(user.getId(), residentSlug, date);
  }
}
