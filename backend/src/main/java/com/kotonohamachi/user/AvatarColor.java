package com.kotonohamachi.user;

/** 색을 고르는 캐릭터 꾸미기 축(피부색/머리색/옷 색/신발 색)의 선택지가 공통으로 가지는 화면 표시 정보. */
public interface AvatarColor {

  /**
   * 선택지 이름을 반환한다.
   *
   * @return 화면에 보여줄 한글 이름
   */
  String label();

  /**
   * 색상값을 반환한다.
   *
   * @return '#' 없는 6자리 16진 색상값(예: ffdbb4)
   */
  String hex();
}
