package com.kotonoha.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TranslateRequest(
        @NotBlank(message = "번역할 문장이 비어 있습니다.") @Size(max = 2000, message = "번역할 문장이 너무 깁니다.") String text) {}
