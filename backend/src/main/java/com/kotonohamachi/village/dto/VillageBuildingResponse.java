package com.kotonohamachi.village.dto;

import java.util.List;

/**
 * 마을 건물 하나의 모양과 위치, 건물 안에 있는 주민.
 *
 * @param id 건물 고유 키(예: cafe)
 * @param label 간판에 적히는 일본어 이름
 * @param x 건물 중심의 가로(x) 좌표
 * @param z 건물 중심의 세로(z) 좌표
 * @param width x 방향 길이
 * @param depth z 방향 길이
 * @param height 벽 높이
 * @param rotation 건물 방향(도). 0이면 문이 +z 쪽이다
 * @param color 벽 색(#RRGGBB)
 * @param residentSlugs 이 건물 안에 있는 모든 주민의 slug(등록된 순서). 주민이 없으면 빈 목록
 */
public record VillageBuildingResponse(
    String id,
    String label,
    double x,
    double z,
    double width,
    double depth,
    double height,
    double rotation,
    String color,
    List<String> residentSlugs) {}
