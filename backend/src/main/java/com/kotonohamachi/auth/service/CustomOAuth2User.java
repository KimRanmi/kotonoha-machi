package com.kotonohamachi.auth.service;

import com.kotonohamachi.user.User;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

/** 소셜 로그인 성공 후 세션에 보관되는 인증 주체. 감싸고 있는 {@link User}는 {@link AuthPrincipal}로 꺼낸다. */
public class CustomOAuth2User implements OAuth2User {

  private final User user;
  private final Map<String, Object> attributes;

  /**
   * 생성자.
   *
   * @param user 로그인한 계정
   * @param attributes 소셜 제공자가 내려준 원본 사용자 정보
   */
  public CustomOAuth2User(User user, Map<String, Object> attributes) {
    this.user = user;
    this.attributes = attributes;
  }

  /**
   * 감싸고 있는 계정을 반환한다.
   *
   * @return 로그인한 계정
   */
  public User getUser() {
    return user;
  }

  @Override
  public Map<String, Object> getAttributes() {
    return attributes;
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return List.of(new SimpleGrantedAuthority("ROLE_USER"));
  }

  @Override
  public String getName() {
    return String.valueOf(user.getId());
  }
}
