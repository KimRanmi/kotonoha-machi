package com.kotonohamachi.common;

import org.springframework.security.crypto.password.PasswordEncoder;

/** 사용자가 입력한 비밀번호가 저장된 해시와 일치하는지 확인한다. 비밀번호 변경·회원 탈퇴처럼 "현재 비밀번호 재확인"이 필요한 여러 도메인이 같은 방식으로 이 확인을 수행해, 그 비교 로직만 공통으로 둔다. */
public final class PasswordVerifier {

  private PasswordVerifier() {}

  /**
   * 입력한 비밀번호가 저장된 해시와 일치하는지 확인한다. 입력값이 없거나 빈 값이면 일치하지 않는 것으로 취급한다.
   *
   * @param passwordEncoder 비밀번호 해시 인코더
   * @param storedPasswordHash 저장된 비밀번호 해시
   * @param inputPassword 사용자가 입력한 비밀번호
   * @return 일치하면 true
   */
  public static boolean matches(
      PasswordEncoder passwordEncoder, String storedPasswordHash, String inputPassword) {
    return inputPassword != null
        && !inputPassword.isBlank()
        && passwordEncoder.matches(inputPassword, storedPasswordHash);
  }
}
