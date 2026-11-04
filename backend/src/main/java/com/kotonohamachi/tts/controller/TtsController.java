package com.kotonohamachi.tts.controller;

import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.tts.service.TtsService;
import com.kotonohamachi.user.User;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 일본어 문장을 읽어주는 음성(MP3) API. */
@RestController
public class TtsController {

  private final TtsService ttsService;

  /**
   * 생성자.
   *
   * @param ttsService 음성 합성 서비스
   */
  public TtsController(TtsService ttsService) {
    this.ttsService = ttsService;
  }

  /**
   * 문장을 읽어주는 MP3를 돌려준다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param text 읽어줄 일본어 문장
   * @return MP3 음성
   */
  @GetMapping("/api/tts")
  public ResponseEntity<byte[]> speak(Authentication authentication, @RequestParam String text) {
    User user = AuthPrincipal.resolve(authentication);
    byte[] audio = ttsService.getAudio(user.getId(), text);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("audio/mpeg"))
        .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePrivate())
        .body(audio);
  }
}
