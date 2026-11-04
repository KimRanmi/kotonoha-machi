# kotonoha-machi v2

v1 프로토타입을 재구현하며 코드 구조와 동작 원리를 학습하는 프로젝트다.

## 1. 기술 스택 및 구조 (`docs/decisions/` 참고)
- **Frontend (`/frontend`)**: Vite, React, TS, Three.js, React Router (npm)
  - React는 UI/상태, Three.js는 3D 전담 (`react-three-fiber` 사용 금지, `useRef`/`useEffect` 직접 관리)
- **Backend (`/backend`)**: Java 25, Spring Boot 4.x, Gradle, PostgreSQL, Flyway, JUnit + Testcontainers
  - 패키지: 도메인 패키지(`auth`, `user` 등) 안에 `controller`/`service`/`dto`/`repository`, 엔티티는 도메인 루트, 공통 코드는 `common`
- **AI**: Gemini API는 백엔드에서만 호출 (프런트 키 노출 금지). 예외: `scripts/`의 1회성 로컬 개발 도구 (키는 `.env`에만 둔다).

## 2. 코드 컨벤션 및 검증 명령어
- Google Code Style 준수 (Java는 Javadoc 줄바꿈만 예외, `build.gradle` 설정 임의 변경 금지).
- **Backend 검증**: `cd backend && ./gradlew spotlessApply && ./gradlew test`
- **Frontend 검증**: `cd frontend && npx prettier --write . && npm run lint && npm run build`

## 3. 개발 및 학습 원칙 (튜터 모드)
1. **선 설명 후 구현**: 코드 작성 전 변경할 파일, 목적, 방법을 초보자 눈높이에서 먼저 설명한다.
2. **단순함 유지**: 작은 단위로 개발하며, 과도한 추상화·불필요한 디자인 패턴·요청 없는 기능 추가를 금지한다.
3. **무단 변경 금지**: 새 라이브러리 도입이나 버전 변경 전 반드시 이유와 대안을 설명하고 승인받는다.
4. **구현 후 리뷰**: 구현이 끝나면 핵심 코드, 데이터 흐름, 선택 이유를 설명한다 (중복 설명 생략).
5. **역할 분리**: 게임 규칙과 데이터 검증은 AI가 아닌 일반 코드로 처리한다. 뜻·읽는 법·JLPT 레벨 같은 언어 데이터는 AI가 짓지 않고 사전 API 등 실제 데이터로 조회·검증한다 (AI는 후보 추천까지만).

## 4. 작업 워크플로우 (기능/버그 수정 시)
1. **브랜치**: `main`이면 최신화 후 `feature/...` 또는 `fix/...` 생성. 이미 작업 브랜치면 유지.
2. **구현**: 변경 계획 브리핑 후 코드 작성.
3. **검증 (필수)**: 위 검증 명령어를 실행해 통과 확인, 요구사항 밖 변경이 없는지 자가 점검.
4. **자동 커밋**: 통과 시 `<type>(<scope>): <description>` 형식으로 커밋하고 결과를 보고.
5. **문서 기록**: `docs/progress.md`에 날짜별로 한 일/검증/다음 할 일을 남기고, 기술 선택이 있었다면 `docs/decisions/`에 결정 문서를 추가. 확정 전 내용은 확정처럼 쓰지 않는다.
