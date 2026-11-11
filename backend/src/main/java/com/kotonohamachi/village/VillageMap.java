package com.kotonohamachi.village;

/**
 * 마을 땅의 크기. 이동 가능한 땅은 원점을 가운데로 한 정사각형이고, 이 값이 땅 크기의 유일한 원본이다. 위치 저장 검증, 건물
 * 좌표 검증 테스트, 프런트(GET /api/village/map)가 모두 이 값을 쓰므로 땅 크기를 바꿀 때는 여기만 고친다.
 */
public final class VillageMap {

  /** 이동 가능한 정사각형 땅의 절반 크기. */
  public static final int HALF_SIZE = 40;

  /** 캐릭터가 설 수 있는 가장 바깥 좌표(절대값). 가장자리에서 한 칸 안쪽이다. */
  public static final int MAX_WALK_COORDINATE = HALF_SIZE - 1;

  /** 검증 애너테이션(문자열만 받는다)에 쓰는 {@link #MAX_WALK_COORDINATE}. */
  public static final String MAX_WALK_COORDINATE_TEXT = "" + MAX_WALK_COORDINATE;

  /** 검증 애너테이션에 쓰는 {@code -MAX_WALK_COORDINATE}. */
  public static final String MIN_WALK_COORDINATE_TEXT = "-" + MAX_WALK_COORDINATE;

  private VillageMap() {}
}
