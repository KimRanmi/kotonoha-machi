# 진행 상황

v2 작업 로그. 각 항목은 "무엇을 했는지 / 어떻게 검증했는지 / 다음에 할 일"을 간단히 남긴다.
아직 확정되지 않은 내용은 확정된 것처럼 적지 않는다.

## 2026-10-17

- v1 저장소를 `master`로 정리하고(미머지 작업 머지, 낡은 브랜치/워크트리 삭제), v2 작업을
  위한 `v2` 브랜치를 생성했다.
- 기술 스택을 결정했다: Vite+React+TypeScript+Three.js(프런트), Java 25+Spring Boot
  4.x(백엔드), PostgreSQL+Flyway(DB), Gemini API(백엔드 경유). 자세한 이유는
  `docs/decisions/0001-tech-stack.md`.
- `CLAUDE.md`를 v2 개발 규칙(기술 스택, 학습 원칙, 문서화 원칙)으로 교체했다.
- 다음 할 일: 새 프런트엔드/백엔드 골격을 가장 작은 단위로 각각 띄워서 검증한다
  (빈 Vite+React+TS 앱 실행, 빈 Spring Boot 4 앱이 Postgres에 Flyway 첫 마이그레이션을
  적용하는지 확인).
