package com.kotonohamachi.auth.service;

import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 회원 탈퇴를 처리한다. 로그인은 소셜 로그인만 지원하므로 {@link CustomOAuth2UserService}가, 로그아웃은 {@link com.kotonohamachi.common.SecurityConfig}가 담당한다. */
@Service
public class AuthService {

  private final UserRepository userRepository;

  /**
   * 생성자.
   *
   * @param userRepository 사용자 저장소
   */
  public AuthService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * 로그인한 본인의 회원 탈퇴를 처리한다.
   *
   * @param userId 탈퇴할 사용자 ID(로그인한 본인)
   */
  @Transactional
  public void withdraw(Long userId) {
    User user = userRepository
        .findById(userId)
        .orElseThrow(() -> new IllegalStateException("로그인한 사용자를 찾을 수 없습니다."));
    user.withdraw();
  }
}
