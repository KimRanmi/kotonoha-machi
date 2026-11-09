package com.kotonohamachi.village;

/** 마을 건물의 종류. 건물을 열기 위해 필요한 완료 테마 수를 함께 정의한다(지금은 모든 건물이 0개라 처음부터 열린다). */
public enum VillageBuilding {
  HOME("home", 0),
  CAFE("cafe", 0),
  SHOP("shop", 0);

  private final String id;
  private final int requiredCompletedThemes;

  VillageBuilding(String id, int requiredCompletedThemes) {
    this.id = id;
    this.requiredCompletedThemes = requiredCompletedThemes;
  }

  /**
   * 건물 ID(DB와 API에서 쓰는 문자열)를 반환한다.
   *
   * @return 건물 ID
   */
  public String getId() {
    return id;
  }

  /**
   * 건물을 열기 위해 완료해야 하는 테마 수를 반환한다.
   *
   * @return 필요한 완료 테마 수
   */
  public int getRequiredCompletedThemes() {
    return requiredCompletedThemes;
  }
}
