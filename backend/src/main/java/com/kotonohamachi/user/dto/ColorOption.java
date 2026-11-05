package com.kotonohamachi.user.dto;

/**
 * 색 선택지 하나. 프런트엔드가 색 이름과 색상값을 따로 들고 있지 않고 이 응답으로 그리게 해서, 팔레트를 서버 한 곳에서만
 * 관리한다.
 *
 * @param value 서버에 저장·전송하는 값(enum 이름)
 * @param label 화면에 보여줄 한글 이름
 * @param hex '#' 없는 6자리 16진 색상값
 */
public record ColorOption(String value, String label, String hex) {}
