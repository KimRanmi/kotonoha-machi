package com.kotonohamachi.vocabulary.controller;

import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.user.User;
import com.kotonohamachi.vocabulary.dto.VocabularyResponse;
import com.kotonohamachi.vocabulary.service.VocabularyService;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 학습 단어장 조회 API. */
@RestController
public class VocabularyController {

  private final VocabularyService vocabularyService;

  /**
   * 생성자.
   *
   * @param vocabularyService 단어장 서비스
   */
  public VocabularyController(VocabularyService vocabularyService) {
    this.vocabularyService = vocabularyService;
  }

  /**
   * 로그인한 사용자 본인의 단어장을 최근 저장한 순서로 조회한다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @return 단어장 목록
   */
  @GetMapping("/api/vocabulary")
  public List<VocabularyResponse> getVocabulary(Authentication authentication) {
    User user = AuthPrincipal.resolve(authentication);
    return vocabularyService.getVocabulary(user.getId());
  }
}
