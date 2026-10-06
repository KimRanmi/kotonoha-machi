package com.kotonoha.chat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import java.util.List;

// 프론트(ChatPanel)가 보내는 형식 그대로. exchanges는 DB 도입 전까지 임시로 클라이언트 값을 받는다.
public record ChatRequest(
        @NotEmpty(message = "대화 메시지가 비어 있습니다.") List<@Valid Message> messages,
        String villagerId,
        Integer exchanges) {

    public record Message(
            @Pattern(regexp = "user|assistant", message = "role은 user 또는 assistant여야 합니다.") String role,
            @NotBlank(message = "메시지 내용이 비어 있습니다.") String content) {}
}
