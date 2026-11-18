# 0045. 모니터링: Actuator 헬스체크와 Gemini 사용량 기록

상태: 확정(구현 완료, 실제 운영 배포는 머지 후)

## 배경
운영 서버(GCP VM, docker compose + Caddy)에 모니터링이 없다. 서버가 죽으면 모르고, Gemini를 얼마나 쓰는지 몰라 결제 연결 시점과 모델 선택을 판단할 근거가 없다.

## 결정 1: 헬스체크는 Spring Boot Actuator의 `/actuator/health`만
- 새 의존성 `spring-boot-starter-actuator`(Boot BOM 버전 그대로). 사용자 승인 후 추가.
- 대안: 직접 만든 `/api/health` 컨트롤러(의존성 없음, DB는 `SELECT 1`). 코드 몇 줄이면 되지만 DB 상태 판단을 직접 짜야 하고 "표준 방식" 설명이 어려워 Actuator를 택했다.
- 노출 제한: `management.endpoints.access.default=none`으로 전부 끄고 health만 읽기 허용, `show-details/components=never`로 `UP`/`DOWN`만 보인다. 기본 헬스 지표(디스크·메일 등)는 끄고 DB만 켰다(외부 서비스 사정으로 오탐하지 않게).
- `SecurityConfig`에서 `/actuator/health/**`만 `permitAll`, 그 외는 기존 규칙(인증 필요)이라 `/actuator/env` 등은 401. Caddy는 `/actuator/health`만 백엔드로 넘긴다.
- 외부 감시는 Google Cloud Monitoring 업타임 체크(1분 간격, 아시아 지역 체크 가능, 새 가입 불필요) — 사용자가 직접 설정, 절차는 `docs/monitoring.md`. 후보였던 UptimeRobot(무료 5분 간격, 해외 체크 서버), Better Stack(약 3분), Healthchecks.io(핑 방식) 중 사용자가 고름.

## 결정 2: Gemini 호출을 `ai_usage` 테이블에 기록
- 호출마다 종류(CHAT/SUMMARY/TRANSLATE)·모델·입출력 토큰(`usageMetadata`, 출력은 추론 토큰 포함)·성공 여부·실패 HTTP 상태·시각·사용자 ID. 프롬프트·대화 내용은 저장하지 않는다.
- 기록 위치는 `GeminiClient.call()` 하나라 세 종류 호출이 빠짐없이 기록된다. 이를 위해 `generate/summarize/translateMeaning`에 `userId` 인자를 추가했다.
- 기록은 동기 저장이지만 단일 INSERT라 수 ms이고 Gemini 호출(초 단위) 뒤에 한 번 일어나므로 체감 지연이 없다고 보고 비동기(`@Async`)는 쓰지 않았다. `AiUsageRecorder`가 `REQUIRES_NEW` 트랜잭션에서 저장하고 모든 예외를 삼켜 기록 실패가 대화·번역을 실패시키지 않으며, 호출한 쪽의 트랜잭션(단어 저장 등)에 롤백 표시도 남기지 않는다.
- 번역 캐시 적중과 키 없음(호출 안 함)은 기록하지 않는다.
- 가격표는 코드에 두지 않는다: 가격은 조회 SQL의 `\set` 값(기본 gemini-3.5-flash-lite 입력 $0.30 / 출력 $2.50 per 1M)으로 쓴다. 설정 파일 값으로 두면 읽는 코드가 필요한데 조회가 SQL뿐이라 쓸 곳이 없기 때문이다.
- 조회: SQL 예시 문서만(`docs/monitoring.md`). 관리자 API는 사용자 권한(role) 개념이 아직 없어 컬럼·지정 방법·권한 검사·테스트가 모두 새로 필요해 이번엔 제외했다. 필요해지면 별도 작업으로 한다.
- 범위 밖: TTS(Google Cloud Text-to-Speech)는 Gemini가 아니라 제외. 학습(테마) 콘텐츠 생성에 쓴 AI 호출은 `scripts/`의 로컬 도구라 이 기록에 포함되지 않는다.

## 로그 점검
이메일 발송 실패 로그가 수신자 이메일(개인정보)을 찍던 것을 예외 클래스 이름만 남기도록 고쳤다. 그 외 API 키·비밀번호·대화 내용이 로그에 남는 코드는 찾지 못했다.
