package com.kotonoha.llm;

// Gemini 호출 실패. 장애 유형(Kind)으로 재시도 여부와 사용자에게 보일 안내가 갈린다.
// 메시지/원인은 서버 로그용이며 사용자 응답에는 절대 싣지 않는다.
public class GeminiException extends RuntimeException {

    public enum Kind {
        // 503/429/기타 5xx, 타임아웃, 네트워크 오류. 재시도 대상.
        TRANSIENT,
        // 401/403 등 키/모델/요청 설정 문제. 재시도해도 소용없다.
        CONFIG,
        // 응답은 왔지만 JSON이 깨졌거나 비어 있음. 재시도하지 않는다.
        FORMAT
    }

    private final Kind kind;
    // 마지막 시도의 HTTP 상태 (없으면 0). 로그용.
    private final int upstreamStatus;

    public GeminiException(Kind kind, String message, Throwable cause) {
        this(kind, 0, message, cause);
    }

    public GeminiException(Kind kind, int upstreamStatus, String message, Throwable cause) {
        super(message, cause);
        this.kind = kind;
        this.upstreamStatus = upstreamStatus;
    }

    public Kind kind() {
        return kind;
    }

    public int upstreamStatus() {
        return upstreamStatus;
    }
}
