package com.kotonohamachi.village.dto;

/**
 * 마을 건물 하나의 모양과 위치, 입장하면 만나는 주민.
 *
 * @param id 건물 고유 키(예: cafe)
 * @param label 간판에 적히는 일본어 이름
 * @param x 건물 중심의 가로(x) 좌표
 * @param z 건물 중심의 세로(z) 좌표
 * @param width x 방향 길이
 * @param depth z 방향 길이
 * @param height 벽 높이
 * @param color 벽 색(#RRGGBB)
 * @param residentSlug 입장하면 대화할 주민의 slug. 이 건물에 속한 주민이 없으면 null
 */
public record VillageBuildingResponse(
    String id,
    String label,
    double x,
    double z,
    double width,
    double depth,
    double height,
    String color,
    String residentSlug) {}
