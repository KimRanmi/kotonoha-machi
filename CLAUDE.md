# kotonoha-machi v2

v1 프로토타입을 재구현하며 코드 구조와 동작 원리를 학습하는 프로젝트다.

## 1. 기술 스택 및 구조 (`docs/decisions/` 참고)
- **Frontend (`/frontend`)**: Vite, React, TS, Three.js, React Router, Vitest (npm)
  - React는 UI/상태, Three.js는 3D 전담 (`react-three-fiber` 사용 금지, `useRef`/`useEffect` 직접 관리)
- **Backend (`/backend`)**: Java 25, Spring Boot 4.x, Gradle 8.14+, PostgreSQL, Flyway, JUnit + Testcontainers
  - 로컬 DB: `cd backend && docker compose up -d` (`kotonoha_machi`)
  - 패키지 구조: 도메인 패키지(`auth`, `user` 등) 내에 `controller`/`service`/`dto`/`repository` 배치. **엔티티는 도메인 패키지 루트에 배치.** 공통 코드는 `common`에 배치.
- **AI**: Gemini API는 백엔드에서만 호출 (프런트엔드 키 노출 금지). 단, `scripts/`의
  1회성 개발 도구(앱에 포함되지 않고 사람이 로컬에서 직접 실행)는 예외 — 키가
  `.env`(`.gitignore` 등록)에만 있고 브라우저에 노출되지 않으면 된다.

## 2. 코드 컨벤션 및 검증 명령어
- Google Code Style 준수 (Java는 Javadoc 줄바꿈만 예외 허용됨 — `build.gradle` 설정 절대 임의 변경 금지).
- **Backend 검증**: `cd backend && ./gradlew spotlessApply && ./gradlew test`
- **Frontend 검증**: `cd frontend && npx prettier --write . && npm run lint && npm run test`

## 3. 개발 및 학습 원칙 (튜터 모드)
1. **선 설명 후 구현**: 코드 작성 전 변경할 파일, 목적, 방법을 초보자 눈높이에서 먼저 설명한다.
2. **단순함 유지**: 작은 단위로 개발하며, 과도한 추상화·불필요한 디자인 패턴·요청 없는 기능 추가를 금지한다.
3. **무단 변경 금지**: 새 라이브러리 도입이나 버전 변경 전 반드시 이유와 대안을 설명하고 승인받는다.
4. **구현 후 리뷰**: 구현이 끝나면 핵심 코드, 데이터 흐름, 선택 이유를 설명한다 (중복 설명 생략).
5. **역할 분리**: 명확한 게임 규칙과 데이터 검증은 AI가 아닌 일반 코드로 처리한다.

## 4. 작업 워크플로우 (기능/버그 수정 시)
1. **브랜치 확인**: 현재 `main`이면 최신화 후 새 브랜치(`feature/...` 또는 `fix/...`) 생성. 이미 작업 브랜치면 유지.
2. **설명 및 구현**: 변경 계획 브리핑 후 코드 작성.
3. **검증 (필수)**: 수정한 영역(Backend/Frontend)의 포맷터 및 테스트 명령어를 실행해 통과(Green) 확인. 패키지 구조 및 요구사항 외 변경 여부 자가 점검.
4. **자동 커밋**: 검증 통과 시 `<type>(<scope>): <description>` 형식으로 커밋 후 결과 및 코드 설명 보고.