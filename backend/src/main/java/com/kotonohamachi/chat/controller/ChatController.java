package com.kotonohamachi.chat.controller;

import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.chat.dto.ChatRequest;
import com.kotonohamachi.chat.dto.ChatResponse;
import com.kotonohamachi.chat.service.ChatService;
import com.kotonohamachi.user.User;
import org.springframework.security.core.Authentication;
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
   * @param residentId 대화할 주민 ID
   * @param request 플레이어의 메시지
   * @return 주민의 일본어 대사와 한국어 번역
   */
  @PostMapping("/api/residents/{residentId}/chat")
  public ChatResponse chat(
      Authentication authentication,
      @PathVariable Long residentId,
      @RequestBody ChatRequest request) {
    User user = AuthPrincipal.resolve(authentication);
    return chatService.chat(user.getId(), residentId, request.message());
  }
}
