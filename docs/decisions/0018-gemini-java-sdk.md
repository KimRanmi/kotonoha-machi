# 0018. Gemini 호출: 직접 REST 호출 대신 Google GenAI Java SDK 사용

- 날짜: 2026-11-08
- 상태: 확정

## 배경

주민 대화(`0017`)의 `GeminiClient`는 처음에 `RestClient`로 Gemini REST(`generateContent`)를 직접 호출했다. 주소·헤더·요청
JSON·응답 구조를 직접 만들고 파싱해야 해서, 요청 형식이 바뀌면 직접 고쳐야 했다.

## 결정

`com.google.genai:google-genai:2.0.0`(Google 공식 Java SDK)을 `backend/build.gradle`에 추가하고 `GeminiClient` 내부만
SDK 호출로 바꿨다. `ChatService`가 쓰는 `generate(systemPrompt, userMessage)`와 설정(`GEMINI_API_KEY`, `GEMINI_MODEL`),
오류 동작(키 없음 503, 호출·응답 오류 502)은 그대로다. 키는 계속 백엔드에서만 쓴다.

## 검토한 선택지

- **Spring AI Google GenAI 스타터**: 설정만으로 쓸 수 있지만 확인 당시 최신이 RC(2.1.0-RC2)였고 Spring Boot 4.1.1과의
  호환을 따로 확인해야 하며 의존성이 여러 개 늘어서 제외했다.
- **직접 REST 호출 유지**: 의존성은 없지만 요청·응답 형식을 직접 관리해야 해서 바꿨다.

## 알아둘 점

- SDK는 Jackson 2를 쓰고 Spring Boot는 Jackson 3를 써서 둘이 함께 올라온다. 패키지가 달라 충돌 없이 공존하며 테스트에서
  문제는 드러나지 않았다. 응답 `{reply, translation}` 파싱은 Jackson 3 `JsonMapper`로 한다.
- okhttp, google-auth-library 등이 추가로 따라와 의존성이 늘어난다.
- SDK 타임아웃은 전체 요청 20초 하나다(기존처럼 연결 5초·읽기 20초를 따로 줄 수 없다).
- 키가 비어 있어도 앱이 부팅되도록 SDK `Client`는 첫 호출 때 만든다.
- SDK로 실제 Gemini를 호출하는 경로(`Client`, `Schema`)는 아직 실제 호출로 검증하지 못했다.
