package com.kotonohamachi.auth.service;

import com.kotonohamachi.user.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/** 이메일을 로그인 아이디로 사용하는 {@link UserDetailsService} 구현체. */
@Service
public class CustomUserDetailsService implements UserDetailsService {

  private final UserRepository userRepository;

  /**
   * 생성자.
   *
   * @param userRepository 사용자 저장소
   */
  public CustomUserDetailsService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
    // 비밀번호가 없는 계정(소셜 로그인으로만 만들어진 계정)은 비밀번호 로그인 대상에서 제외한다.
    return userRepository
        .findByEmail(email)
        .filter(user -> user.getPasswordHash() != null)
        .map(AuthUserDetails::new)
        .orElseThrow(() -> new UsernameNotFoundException("이메일 또는 비밀번호가 올바르지 않습니다."));
  }
}
