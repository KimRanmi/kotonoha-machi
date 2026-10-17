package com.kotonoha.chat;

import com.kotonoha.llm.GeminiClient;
import com.kotonoha.llm.GeminiException;
import com.kotonoha.llm.GeminiException.Kind;
import com.kotonoha.user.CurrentUser;
import jakarta.validation.Valid;
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
        requireConfigured();
        return chatService.chat(user.id(), request);
    }

    // 번역만 다시 시도할 때 쓴다. 대화 기록/친밀도는 건드리지 않는다.
    @PostMapping("/translate")
    public TranslateResponse translate(CurrentUser user, @Valid @RequestBody TranslateRequest request) {
        requireConfigured();
        return new TranslateResponse(chatService.translate(request.text()));
    }

    // 키가 없는 것도 사용자에게는 "설정 문제" 안내만 보이고(상세 원인은 노출하지 않음), 원인은 로그에만 남긴다.
    private void requireConfigured() {
        if (!gemini.isConfigured()) {
            throw new GeminiException(Kind.CONFIG, "GEMINI_API_KEY 환경변수가 설정되어 있지 않음", null);
        }
    }
}
