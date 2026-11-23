package com.kotonohamachi.user;

/** 사용자 계정의 상태를 나타낸다. */
public enum UserStatus {

  /** 예전 이메일 가입 방식에서 인증을 끝내지 못한 계정이 남긴 상태. 새로 만들어지지 않으며, 기존 행을 읽기 위해 유지한다. */
  PENDING_VERIFICATION,

  /** 정상적으로 로그인할 수 있는 상태. */
  ACTIVE,

  /** 회원 탈퇴를 완료해 더 이상 로그인할 수 없는 상태. */
  WITHDRAWN
}
