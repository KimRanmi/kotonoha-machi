package com.kotonohamachi.vocabulary.controller;

import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.user.User;
import com.kotonohamachi.vocabulary.VocabularyLevel;
import com.kotonohamachi.vocabulary.dto.ChatWordRequest;
import com.kotonohamachi.vocabulary.dto.ChatWordResponse;
import com.kotonohamachi.vocabulary.dto.VocabularyPageResponse;
import com.kotonohamachi.vocabulary.service.VocabularyService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 학습 단어장 조회·대화 중 단어 저장 API. */
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
   * 로그인한 사용자 본인의 단어장을 최근 저장한 순서로 한 페이지씩 조회한다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param level 레벨 탭(N1·N2·N3·OTHER, 생략하면 전체)
   * @param page 페이지 번호(0부터)
   * @param size 페이지 크기
   * @return 단어장 한 페이지
   */
  @GetMapping("/api/vocabulary")
  public VocabularyPageResponse getVocabulary(
      Authentication authentication,
      @RequestParam(required = false) VocabularyLevel level,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size) {
    User user = AuthPrincipal.resolve(authentication);
    return vocabularyService.getVocabulary(user.getId(), level, page, size);
  }

  /**
   * 대화 중 사용자가 고른 단어를 사전에서 찾아 본인 단어장에 저장한다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param request 고른 단어
   * @return 저장 결과(이미 있던 단어면 alreadySaved=true)
   */
  @PostMapping("/api/vocabulary/chat")
  public ChatWordResponse saveChatWord(
      Authentication authentication, @RequestBody ChatWordRequest request) {
    User user = AuthPrincipal.resolve(authentication);
    return vocabularyService.saveChatWord(user.getId(), request.word());
  }
}
