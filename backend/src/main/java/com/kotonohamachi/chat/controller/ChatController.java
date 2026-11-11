package com.kotonohamachi.chat.controller;

import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.chat.dto.ChatHistoryItem;
import com.kotonohamachi.chat.dto.ChatRequest;
import com.kotonohamachi.chat.dto.ChatResponse;
import com.kotonohamachi.chat.service.ChatService;
import com.kotonohamachi.user.User;
import java.util.List;
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
   * @param request 플레이어의 메시지
   * @return 주민의 일본어 대사와 한국어 번역
   */
  @PostMapping("/api/residents/{residentSlug}/chat")
  public ChatResponse chat(
      Authentication authentication,
      @PathVariable String residentSlug,
      @RequestBody ChatRequest request) {
    User user = AuthPrincipal.resolve(authentication);
    return chatService.chat(user.getId(), residentSlug, request.message());
  }

  /**
   * 주민과 나눈 최근 대화를 오래된 순으로 돌려준다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param residentSlug 주민의 고유 키(예: r01)
   * @return 최근 대화(플레이어의 말과 주민의 대답)
   */
  @GetMapping("/api/residents/{residentSlug}/chat")
  public List<ChatHistoryItem> history(
      Authentication authentication, @PathVariable String residentSlug) {
    User user = AuthPrincipal.resolve(authentication);
    return chatService.history(user.getId(), residentSlug);
  }
}
