package com.kotonoha.word;

// 프론트의 LearnedWord 타입과 같은 모양 (addedAt은 epoch millis).
public record LearnedWord(String word, long addedAt) {}
