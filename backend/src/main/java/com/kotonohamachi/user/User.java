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
import java.time.OffsetDateTime;

/** 소셜 로그인으로 가입한 사용자 계정. */
@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false, unique = true)
  private String nickname;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private UserStatus status;

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
   * 소셜 로그인으로 처음 가입할 때 쓰는 생성자. 소셜 제공자가 이메일 소유를 이미 검증해줬으므로 바로 {@link
   * UserStatus#ACTIVE} 상태로 시작한다.
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
   * 닉네임을 바꾼다. 중복 확인은 호출하는 쪽({@link com.kotonohamachi.user.service.ProfileService})의 책임이다.
   *
   * @param nickname 새 닉네임
   */
  public void changeNickname(String nickname) {
    this.nickname = nickname;
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
