package com.kotonohamachi.village;

/** 마을 건물의 종류. 모든 건물은 가입 직후부터 열려 있다. */
public enum VillageBuilding {
  HOME("home"),
  CAFE("cafe"),
  SHOP("shop");

  private final String id;

  VillageBuilding(String id) {
    this.id = id;
  }

  /**
   * 건물 ID(DB와 API에서 쓰는 문자열)를 반환한다.
   *
   * @return 건물 ID
   */
  public String getId() {
    return id;
  }
}
