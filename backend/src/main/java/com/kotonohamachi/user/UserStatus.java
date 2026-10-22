package com.kotonohamachi.user;

/** 사용자 계정의 상태를 나타낸다. */
public enum UserStatus {

  /** 이메일 인증을 아직 완료하지 않아 로그인할 수 없는 상태. */
  PENDING_VERIFICATION,

  /** 이메일 인증을 완료해 정상적으로 로그인할 수 있는 상태. */
  ACTIVE,

  /** 회원 탈퇴를 완료해 더 이상 로그인할 수 없는 상태. */
  WITHDRAWN
}
