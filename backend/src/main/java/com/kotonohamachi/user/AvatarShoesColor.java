package com.kotonohamachi.user;

/** 캐릭터 꾸미기의 신발 색 선택지. */
public enum AvatarShoesColor implements AvatarColor {
  WHITE("흰색", "ffffff"),
  BLACK("검정", "000000"),
  BROWN("갈색", "6b4423"),
  RED("빨강", "c0392b"),
  BLUE("파랑", "2e4a8e");

  private final String label;
  private final String hex;

  AvatarShoesColor(String label, String hex) {
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
