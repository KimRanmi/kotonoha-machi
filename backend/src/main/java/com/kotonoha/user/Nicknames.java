package com.kotonoha.user;

import java.util.regex.Pattern;

// 닉네임 규칙. 글자(한글/일본어/영문 등)·숫자·밑줄만 2~12자, 공백/기호 불가.
// 닉네임은 주민 대화의 시스템 프롬프트에 들어가므로, 문장 부호나 공백을 막아 지시문 삽입(프롬프트 인젝션)도 함께 차단한다.
// 프론트(lib/storage.ts)의 검증과 같은 규칙이어야 한다.
public final class Nicknames {

    public static final String REGEX = "^[\\p{L}\\p{N}_]{2,12}$";
    public static final String MESSAGE = "닉네임은 2~12자의 글자, 숫자, 밑줄(_)만 쓸 수 있어요.";

    private static final Pattern PATTERN = Pattern.compile(REGEX);

    private Nicknames() {}

    public static boolean isValid(String nickname) {
        return nickname != null && PATTERN.matcher(nickname).matches();
    }
}
