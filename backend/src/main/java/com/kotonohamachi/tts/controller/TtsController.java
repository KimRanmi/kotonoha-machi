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
   * @param resident 읽어줄 주민의 고유 키(선택). 주민 성별에 맞는 목소리를 쓴다
   * @param pitch 높낮이 배율(선택)
   * @param rate 속도 배율(선택)
   * @return MP3 음성
   */
  @GetMapping("/api/tts")
  public ResponseEntity<byte[]> speak(
      Authentication authentication,
      @RequestParam String text,
      @RequestParam(required = false) String resident,
      @RequestParam(required = false) Double pitch,
      @RequestParam(required = false) Double rate) {
    User user = AuthPrincipal.resolve(authentication);
    byte[] audio = ttsService.getAudio(user.getId(), text, resident, pitch, rate);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("audio/mpeg"))
        .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePrivate())
        .body(audio);
  }
}
