package com.kotonohamachi.user;

/** 캐릭터 꾸미기의 피부색 선택지. */
public enum AvatarSkinColor implements AvatarColor {
  LIGHT("연한", "ffdbb4"),
  FAIR("밝은", "edb98a"),
  TAN("구릿빛", "d08b5b"),
  BROWN("갈색", "ae5d29"),
  DARK("어두운", "614335");

  private final String label;
  private final String hex;

  AvatarSkinColor(String label, String hex) {
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
