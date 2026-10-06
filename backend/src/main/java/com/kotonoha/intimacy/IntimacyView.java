package com.kotonoha.intimacy;

// 프론트에 내려주는 친밀도. 수치는 숨기고 서술형 문구만 준다 (아직 만난 적 없으면 met=false, description=null).
public record IntimacyView(String villagerId, boolean met, String description) {}
