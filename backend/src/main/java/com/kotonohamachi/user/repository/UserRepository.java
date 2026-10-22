package com.kotonohamachi.user.repository;

import com.kotonohamachi.user.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** 사용자 계정 데이터에 접근한다. */
public interface UserRepository extends JpaRepository<User, Long> {

  /**
   * 이메일로 사용자를 조회한다.
   *
   * @param email 조회할 이메일
   * @return 사용자(없으면 빈 Optional)
   */
  Optional<User> findByEmail(String email);

  /**
   * 이메일 중복 여부를 확인한다.
   *
   * @param email 확인할 이메일
   * @return 이미 가입되어 있으면 true
   */
  boolean existsByEmail(String email);

  /**
   * 닉네임 중복 여부를 확인한다.
   *
   * @param nickname 확인할 닉네임
   * @return 이미 사용 중이면 true
   */
  boolean existsByNickname(String nickname);
}
