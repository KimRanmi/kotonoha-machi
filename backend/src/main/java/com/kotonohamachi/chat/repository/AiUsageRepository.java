package com.kotonohamachi.chat.repository;

import com.kotonohamachi.chat.AiUsage;
import org.springframework.data.jpa.repository.JpaRepository;

/** Gemini 호출 기록 저장소. */
public interface AiUsageRepository extends JpaRepository<AiUsage, Long> {}
