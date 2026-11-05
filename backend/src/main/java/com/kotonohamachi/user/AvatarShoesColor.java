package com.kotonohamachi.user;

/** 캐릭터 꾸미기의 신발 색 선택지(파스텔 톤). */
public enum AvatarShoesColor implements AvatarColor {
  WHITE("흰색", "fffaf5"),
  PINK("분홍", "ffc2d4"),
  BEIGE("베이지", "e6cfb8"),
  MINT("민트", "b5ead7"),
  SKY("하늘", "b5d8f7"),
  LAVENDER("라벤더", "d4c4f0");

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
