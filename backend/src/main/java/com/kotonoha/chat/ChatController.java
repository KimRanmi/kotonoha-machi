package com.kotonoha.chat;

import com.kotonoha.common.ApiException;
import com.kotonoha.llm.GeminiClient;
import com.kotonoha.user.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final GeminiClient gemini;

    public ChatController(ChatService chatService, GeminiClient gemini) {
        this.chatService = chatService;
        this.gemini = gemini;
    }

    @PostMapping
    public ChatResponse chat(CurrentUser user, @Valid @RequestBody ChatRequest request) {
        if (!gemini.isConfigured()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다. README를 참고해 API 키를 설정해주세요.");
        }
        return chatService.chat(user.id(), request);
    }
}
