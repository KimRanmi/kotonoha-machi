package com.kotonohamachi.auth.service;

import com.kotonohamachi.user.User;
import com.kotonohamachi.user.UserStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** {@link User}를 Spring Security가 이해하는 {@link UserDetails}로 감싼다. */
public class AuthUserDetails implements UserDetails {

  private final User user;

  /**
   * 생성자.
   *
   * @param user 감쌀 사용자 엔티티
   */
  public AuthUserDetails(User user) {
    this.user = user;
  }

  /**
   * 감싸고 있는 사용자 엔티티를 반환한다.
   *
   * @return 사용자 엔티티
   */
  public User getUser() {
    return user;
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return List.of(new SimpleGrantedAuthority("ROLE_USER"));
  }

  @Override
  public String getPassword() {
    return user.getPasswordHash();
  }

  @Override
  public String getUsername() {
    return user.getEmail();
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return !user.isLoginLocked();
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return user.getStatus() == UserStatus.ACTIVE;
  }
}
