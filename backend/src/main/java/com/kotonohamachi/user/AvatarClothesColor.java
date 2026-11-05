package com.kotonohamachi.user;

/** 캐릭터 꾸미기의 옷 색 선택지(파스텔 톤). */
public enum AvatarClothesColor implements AvatarColor {
  CREAM("크림", "fff1d6"),
  PINK("분홍", "ffc2d4"),
  CORAL("코랄", "ffb3a7"),
  PEACH("복숭아", "ffd0a8"),
  YELLOW("노랑", "fff0a0"),
  MINT("민트", "b5ead7"),
  SKY("하늘", "b5d8f7"),
  LAVENDER("라벤더", "d4c4f0");

  private final String label;
  private final String hex;

  AvatarClothesColor(String label, String hex) {
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
