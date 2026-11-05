package com.kotonohamachi.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.OffsetDateTime;

/** 가입한 사용자 계정. 이메일 인증 전에는 {@link UserStatus#PENDING_VERIFICATION} 상태다. */
@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String email;

  // 소셜 로그인만으로 만들어진 계정은 비밀번호가 없을 수 있어 nullable이다.
  @Column(name = "password_hash")
  private String passwordHash;

  @Column(nullable = false, unique = true)
  private String nickname;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private UserStatus status;

  @Column(name = "verification_code")
  private String verificationCode;

  @Column(name = "verification_code_expires_at")
  private OffsetDateTime verificationCodeExpiresAt;

  @Column(name = "verification_attempts", nullable = false)
  private int verificationAttempts;

  @Column(name = "login_fail_count", nullable = false)
  private int loginFailCount;

  @Column(name = "locked_until")
  private OffsetDateTime lockedUntil;

  @Column(name = "password_reset_code")
  private String passwordResetCode;

  @Column(name = "password_reset_code_expires_at")
  private OffsetDateTime passwordResetCodeExpiresAt;

  @Column(name = "password_reset_attempts", nullable = false)
  private int passwordResetAttempts;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  @Enumerated(EnumType.STRING)
  @Column(name = "avatar_skin_color", nullable = false)
  private AvatarSkinColor avatarSkinColor = AvatarSkinColor.LIGHT;

  @Enumerated(EnumType.STRING)
  @Column(name = "avatar_hair_color", nullable = false)
  private AvatarHairColor avatarHairColor = AvatarHairColor.BLACK;

  @Enumerated(EnumType.STRING)
  @Column(name = "avatar_hair_style", nullable = false)
  private AvatarHairStyle avatarHairStyle = AvatarHairStyle.SHORT;

  @Enumerated(EnumType.STRING)
  @Column(name = "avatar_clothes_style", nullable = false)
  private AvatarClothesStyle avatarClothesStyle = AvatarClothesStyle.PLAIN;

  @Enumerated(EnumType.STRING)
  @Column(name = "avatar_clothes_color", nullable = false)
  private AvatarClothesColor avatarClothesColor = AvatarClothesColor.SKY;

  @Enumerated(EnumType.STRING)
  @Column(name = "avatar_shoes_color", nullable = false)
  private AvatarShoesColor avatarShoesColor = AvatarShoesColor.WHITE;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected User() {}

  /**
   * 회원가입 시 사용하는 생성자. 상태는 항상 {@link UserStatus#PENDING_VERIFICATION}으로 시작한다.
   *
   * @param email 가입 이메일
   * @param passwordHash BCrypt로 해싱된 비밀번호
   * @param nickname 가입 닉네임
   * @param verificationCode 이메일로 보낼 인증 코드
   * @param verificationCodeExpiresAt 인증 코드 만료 시각
   */
  public User(
      String email,
      String passwordHash,
      String nickname,
      String verificationCode,
      OffsetDateTime verificationCodeExpiresAt) {
    this.email = email;
    this.passwordHash = passwordHash;
    this.nickname = nickname;
    this.status = UserStatus.PENDING_VERIFICATION;
    this.verificationCode = verificationCode;
    this.verificationCodeExpiresAt = verificationCodeExpiresAt;
  }

  /**
   * 소셜 로그인으로 처음 가입할 때 쓰는 생성자. 소셜 제공자가 이메일 소유를 이미 검증해줬으므로 바로 {@link
   * UserStatus#ACTIVE} 상태로 시작하고, 비밀번호나 인증 코드가 없다.
   *
   * @param email 소셜 제공자가 알려준 이메일
   * @param nickname 가입할 닉네임
   */
  public static User createFromSocialLogin(String email, String nickname) {
    User user = new User();
    user.email = email;
    user.nickname = nickname;
    user.status = UserStatus.ACTIVE;
    return user;
  }

  @PrePersist
  private void onCreate() {
    OffsetDateTime now = OffsetDateTime.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  private void onUpdate() {
    updatedAt = OffsetDateTime.now();
  }

  /**
   * 인증 코드가 입력값과 일치하는지 확인한다.
   *
   * @param code 사용자가 입력한 인증 코드
   * @return 일치하면 true
   */
  public boolean matchesVerificationCode(String code) {
    return verificationCode != null && verificationCode.equals(code);
  }

  /**
   * 인증 코드가 만료되었는지 확인한다.
   *
   * @return 만료되었으면 true
   */
  public boolean isVerificationCodeExpired() {
    return verificationCodeExpiresAt == null
        || verificationCodeExpiresAt.isBefore(OffsetDateTime.now());
  }

  /** 이메일 인증을 완료 처리한다. 상태를 활성화하고 인증 코드 정보를 지운다. */
  public void activate() {
    this.status = UserStatus.ACTIVE;
    this.verificationCode = null;
    this.verificationCodeExpiresAt = null;
  }

  /**
   * 인증 코드를 새로 발급한다. 코드가 만료되었을 때 재전송 용도로 쓴다. 비밀번호/닉네임은 그대로 두고, 틀린 시도 횟수는
   * 새 코드에 맞춰 0으로 되돌린다.
   *
   * @param verificationCode 새로 발급한 인증 코드
   * @param verificationCodeExpiresAt 새 인증 코드의 만료 시각
   */
  public void renewVerificationCode(
      String verificationCode, OffsetDateTime verificationCodeExpiresAt) {
    this.verificationCode = verificationCode;
    this.verificationCodeExpiresAt = verificationCodeExpiresAt;
    this.verificationAttempts = 0;
  }

  /**
   * 인증을 완료하지 않은 채 가입을 다시 시도할 때, 비밀번호·닉네임·인증 코드를 새 값으로 덮어쓴다. 틀린 시도 횟수도
   * 새 코드에 맞춰 0으로 되돌린다. {@link UserStatus#PENDING_VERIFICATION} 상태에서만 호출해야 한다.
   *
   * @param passwordHash 새로 해싱한 비밀번호
   * @param nickname 새 닉네임
   * @param verificationCode 새로 발급한 인증 코드
   * @param verificationCodeExpiresAt 새 인증 코드의 만료 시각
   */
  public void restartPendingSignup(
      String passwordHash,
      String nickname,
      String verificationCode,
      OffsetDateTime verificationCodeExpiresAt) {
    this.passwordHash = passwordHash;
    this.nickname = nickname;
    this.verificationCode = verificationCode;
    this.verificationCodeExpiresAt = verificationCodeExpiresAt;
    this.verificationAttempts = 0;
  }

  /** 인증 코드를 틀리게 입력한 시도 횟수를 하나 늘린다. */
  public void recordVerificationFailure() {
    this.verificationAttempts++;
  }

  /**
   * 인증 코드를 틀리게 입력한 횟수를 반환한다.
   *
   * @return 틀린 시도 횟수
   */
  public int getVerificationAttempts() {
    return verificationAttempts;
  }

  /** 로그인 비밀번호를 틀리게 입력한 횟수를 하나 늘린다. */
  public void recordLoginFailure() {
    this.loginFailCount++;
  }

  /**
   * 로그인 비밀번호를 틀리게 입력한 횟수를 반환한다.
   *
   * @return 틀린 시도 횟수
   */
  public int getLoginFailCount() {
    return loginFailCount;
  }

  /**
   * 로그인을 일정 기간 잠근다. 틀린 시도 횟수는 0으로 되돌린다.
   *
   * @param duration 잠글 기간
   */
  public void lockLoginFor(Duration duration) {
    this.lockedUntil = OffsetDateTime.now().plus(duration);
    this.loginFailCount = 0;
  }

  /** 로그인 성공 시 틀린 시도 횟수와 잠금을 모두 초기화한다. */
  public void resetLoginFailures() {
    this.loginFailCount = 0;
    this.lockedUntil = null;
  }

  /**
   * 로그인이 잠긴 상태인지 확인한다.
   *
   * @return 아직 잠금이 풀리지 않았으면 true
   */
  public boolean isLoginLocked() {
    return lockedUntil != null && lockedUntil.isAfter(OffsetDateTime.now());
  }

  /**
   * 비밀번호 재설정 코드를 새로 발급한다. 틀린 시도 횟수는 0으로 되돌린다.
   *
   * @param passwordResetCode 새로 발급한 재설정 코드
   * @param passwordResetCodeExpiresAt 새 재설정 코드의 만료 시각
   */
  public void issuePasswordResetCode(
      String passwordResetCode, OffsetDateTime passwordResetCodeExpiresAt) {
    this.passwordResetCode = passwordResetCode;
    this.passwordResetCodeExpiresAt = passwordResetCodeExpiresAt;
    this.passwordResetAttempts = 0;
  }

  /**
   * 비밀번호 재설정 코드가 입력값과 일치하는지 확인한다.
   *
   * @param code 사용자가 입력한 재설정 코드
   * @return 일치하면 true
   */
  public boolean matchesPasswordResetCode(String code) {
    return passwordResetCode != null && passwordResetCode.equals(code);
  }

  /**
   * 비밀번호 재설정 코드가 만료되었는지 확인한다.
   *
   * @return 만료되었으면 true
   */
  public boolean isPasswordResetCodeExpired() {
    return passwordResetCodeExpiresAt == null
        || passwordResetCodeExpiresAt.isBefore(OffsetDateTime.now());
  }

  /** 비밀번호 재설정 코드를 틀리게 입력한 시도 횟수를 하나 늘린다. */
  public void recordPasswordResetFailure() {
    this.passwordResetAttempts++;
  }

  /**
   * 비밀번호 재설정 코드를 틀리게 입력한 횟수를 반환한다.
   *
   * @return 틀린 시도 횟수
   */
  public int getPasswordResetAttempts() {
    return passwordResetAttempts;
  }

  /**
   * 비밀번호를 재설정한다. 재설정 코드 정보를 지우고, 로그인 실패 횟수·잠금도 함께 초기화한다(비밀번호 재설정은
   * 정당한 계정 복구 수단이라 잠긴 상태였어도 풀어준다).
   *
   * @param newPasswordHash 새로 해싱한 비밀번호
   */
  public void resetPassword(String newPasswordHash) {
    this.passwordHash = newPasswordHash;
    this.passwordResetCode = null;
    this.passwordResetCodeExpiresAt = null;
    this.passwordResetAttempts = 0;
    resetLoginFailures();
  }

  /**
   * 닉네임을 바꾼다. 중복 확인은 호출하는 쪽({@link com.kotonohamachi.user.service.ProfileService})의 책임이다.
   *
   * @param nickname 새 닉네임
   */
  public void changeNickname(String nickname) {
    this.nickname = nickname;
  }

  /**
   * 로그인한 본인이 비밀번호를 바로 바꾼다. {@link #resetPassword}와 달리 비밀번호 찾기용 코드나 로그인 잠금
   * 상태를 건드리지 않는다.
   *
   * @param newPasswordHash 새로 해싱한 비밀번호
   */
  public void changePassword(String newPasswordHash) {
    this.passwordHash = newPasswordHash;
  }

  /** 회원 탈퇴를 처리한다. */
  public void withdraw() {
    this.status = UserStatus.WITHDRAWN;
  }

  /**
   * 캐릭터 꾸미기(피부색/머리색/헤어스타일/옷/신발)를 바꾼다.
   *
   * @param skinColor 피부색
   * @param hairColor 머리색
   * @param hairStyle 헤어스타일
   * @param clothesStyle 옷
   * @param clothesColor 옷 색
   * @param shoesColor 신발 색
   */
  public void updateAvatar(
      AvatarSkinColor skinColor,
      AvatarHairColor hairColor,
      AvatarHairStyle hairStyle,
      AvatarClothesStyle clothesStyle,
      AvatarClothesColor clothesColor,
      AvatarShoesColor shoesColor) {
    this.avatarSkinColor = skinColor;
    this.avatarHairColor = hairColor;
    this.avatarHairStyle = hairStyle;
    this.avatarClothesStyle = clothesStyle;
    this.avatarClothesColor = clothesColor;
    this.avatarShoesColor = shoesColor;
  }

  /**
   * 사용자 ID를 반환한다.
   *
   * @return 사용자 ID
   */
  public Long getId() {
    return id;
  }

  /**
   * 이메일을 반환한다.
   *
   * @return 이메일
   */
  public String getEmail() {
    return email;
  }

  /**
   * 해싱된 비밀번호를 반환한다.
   *
   * @return BCrypt로 해싱된 비밀번호
   */
  public String getPasswordHash() {
    return passwordHash;
  }

  /**
   * 닉네임을 반환한다.
   *
   * @return 닉네임
   */
  public String getNickname() {
    return nickname;
  }

  /**
   * 계정 상태를 반환한다.
   *
   * @return 계정 상태
   */
  public UserStatus getStatus() {
    return status;
  }

  /**
   * 피부색을 반환한다.
   *
   * @return 피부색
   */
  public AvatarSkinColor getAvatarSkinColor() {
    return avatarSkinColor;
  }

  /**
   * 머리색을 반환한다.
   *
   * @return 머리색
   */
  public AvatarHairColor getAvatarHairColor() {
    return avatarHairColor;
  }

  /**
   * 헤어스타일을 반환한다.
   *
   * @return 헤어스타일
   */
  public AvatarHairStyle getAvatarHairStyle() {
    return avatarHairStyle;
  }

  /**
   * 옷 스타일을 반환한다.
   *
   * @return 옷 스타일
   */
  public AvatarClothesStyle getAvatarClothesStyle() {
    return avatarClothesStyle;
  }

  /**
   * 옷 색을 반환한다.
   *
   * @return 옷 색
   */
  public AvatarClothesColor getAvatarClothesColor() {
    return avatarClothesColor;
  }

  /**
   * 신발 색을 반환한다.
   *
   * @return 신발 색
   */
  public AvatarShoesColor getAvatarShoesColor() {
    return avatarShoesColor;
  }
}
