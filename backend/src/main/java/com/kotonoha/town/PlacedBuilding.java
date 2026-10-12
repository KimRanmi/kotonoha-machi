package com.kotonoha.town;

// 프론트의 PlacedBuilding 중 저장하는 부분 (주민 연결은 프론트가 themeTitle로 계산한다).
public record PlacedBuilding(
        String id, String themeTitle, double x, double y, double width, double height,
        String label, String color, long placedAt) {}
