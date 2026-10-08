package com.kotonoha.chat;

// 프론트의 ChatMessage 타입과 같은 모양 (createdAt은 epoch millis).
public record ChatMessageRecord(String id, String role, String content, String translation, long createdAt) {}
