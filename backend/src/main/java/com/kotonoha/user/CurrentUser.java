package com.kotonoha.user;

// 컨트롤러가 받는 "지금 요청한 사용자". 식별 방식(익명 헤더 → JWT)이 바뀌어도 컨트롤러는 이 타입만 안다.
public record CurrentUser(long id) {}
