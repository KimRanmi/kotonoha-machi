package com.kotonoha.chat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import java.util.List;

// 프론트(ChatPanel)가 보내는 형식. 친밀도(exchanges)는 서버가 DB에서 읽으므로 받지 않는다
// (구버전 클라이언트가 exchanges를 보내도 알 수 없는 필드로 무시된다).
public record ChatRequest(
        @NotEmpty(message = "대화 메시지가 비어 있습니다.") List<@Valid Message> messages,
        String villagerId) {

    public record Message(
            @Pattern(regexp = "user|assistant", message = "role은 user 또는 assistant여야 합니다.") String role,
            @NotBlank(message = "메시지 내용이 비어 있습니다.") String content) {}
}
