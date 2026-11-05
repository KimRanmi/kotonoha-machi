package com.kotonohamachi.user;

/** 캐릭터 꾸미기의 머리색 선택지. */
public enum AvatarHairColor implements AvatarColor {
  BLACK("흑발", "2c1b18"),
  BROWN("갈색", "724133"),
  BLONDE("금발", "d6b370"),
  RED("빨강", "a55728"),
  GRAY("은발", "cccccc");

  private final String label;
  private final String hex;

  AvatarHairColor(String label, String hex) {
    this.label = label;
    this.hex = hex;
  }

  @Override
  public String label() {
    return label;
  }

  @Override
  public String hex() {
    return hex;
  }
}
