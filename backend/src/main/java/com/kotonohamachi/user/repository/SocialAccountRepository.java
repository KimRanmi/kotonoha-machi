package com.kotonohamachi.user.repository;

import com.kotonohamachi.user.SocialAccount;
import com.kotonohamachi.user.SocialProvider;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** 소셜 로그인 연결 데이터에 접근한다. */
public interface SocialAccountRepository extends JpaRepository<SocialAccount, Long> {

  /**
   * 제공자와 제공자 사용자 ID로 연결된 소셜 계정을 조회한다.
   *
   * @param provider 소셜 로그인 제공자
   * @param providerUserId 제공자가 발급한 사용자 고유 ID
   * @return 연결된 소셜 계정(없으면 빈 Optional)
   */
  Optional<SocialAccount> findByProviderAndProviderUserId(
      SocialProvider provider, String providerUserId);
}
