# kotonoha-machi v2

이 프로젝트는 v1(바이브코딩으로 만든 프로토타입)을 같은 게임 컨셉으로 다시 만드는
작업이다. 목표는 기능 구현뿐 아니라 코드의 구조와 동작 원리를 이해하는 것이다.
기술 결정의 배경과 대안은 `docs/decisions/`에 기록한다.

## 기술 스택

- **프런트엔드**: Vite + React + TypeScript + Three.js
  - React: UI와 화면 상태 관리. Three.js: 3D 장면(건물 내부 등) 전담.
  - Three.js는 `react-three-fiber` 없이 `useRef`/`useEffect`로 직접 관리한다.
  - 라우팅: React Router. 테스트: Vitest. 패키지 매니저: npm.
- **백엔드**: Java 25 + Spring Boot 4.x
  - API와 비즈니스 로직 담당. 서블릿 컨테이너는 Tomcat(기본값).
  - 빌드 도구: Gradle 8.14 이상. 테스트: JUnit + Testcontainers.
  - 패키지 구조: 기능(도메인) 패키지(`auth`, `user` 등) 안에 `controller`/`service`/
    `dto`/`repository` 역할별 하위 패키지를 둔다. 엔티티는 레이어가 아니라 도메인
    모델이므로 도메인 패키지 루트에 둔다. `common`처럼 특정 기능이 아닌 전역 공통
    코드는 이 분리 대상이 아니다. 근거와 대안은
    [`docs/decisions/0003-package-structure.md`](docs/decisions/0003-package-structure.md)
    참고.
- **데이터베이스**: PostgreSQL + Flyway (스키마 변경 이력 관리)
  - 로컬 개발용 DB는 `backend/docker-compose.yml`로 띄운다(`cd backend && docker compose up -d`).
    `kotonoha_machi`/`kotonoha_machi`(DB명/계정) 기준이며, `application.yml`의 기본값과
    맞춰져 있다.
- **AI**: Gemini API는 백엔드에서만 호출한다. API 키를 프런트엔드에 노출하지 않는다.

결정 이유와 비교한 대안은 [`docs/decisions/0001-tech-stack.md`](docs/decisions/0001-tech-stack.md)
참고.

# 프로젝트 가이드라인 (CLAUDE.md)

## [코드 컨벤션 (Coding Conventions)]
- **Javadoc 포맷팅 예외**: Javadoc 주석은 포맷터가 줄바꿈을 강제하지 않는다(한 줄로 길게 써도 됨).
  구글 공식 포맷터(Google Java Format)는 폭(100자) 설정 자체가 불가능해, 포크인
  Palantir Java Format(`formatJavadoc(false)`)으로 바꿔 Javadoc만 포맷터 대상에서
  제외했다. 일반 코드(메서드/생성자 매개변수 등)는 여전히 구글 스타일 100자 제한을
  그대로 따른다 — 이쪽은 알고리즘 자체에 폭이 고정돼 있어 예외를 둘 수 없다. 근거와
  시도한 대안은 [`docs/decisions/0004-javadoc-formatting.md`](docs/decisions/0004-javadoc-formatting.md)
  참고.
- **표준 규칙**: 본 프로젝트는 전사적으로 **구글 코드 컨벤션(Google Code Style)**을 절대 표준으로 따릅니다.
- **백엔드 (Java)**: 코드를 수정하거나 추가한 후에는 반드시 구글 자바 스타일 가이드가 적용된 Gradle 린트 명령어(`./gradlew spotlessApply` 또는 `./gradlew checkstyleMain`)를 실행하여 컨벤션을 준수해야 합니다.
- **프론트엔드 (Vite + React)**: 코드를 수정한 후에는 반드시 구글 스타일이 적용된 프론트엔드 린트/포맷터 명령어(`npm run lint` 또는 `npx prettier --write .`)를 실행하여 코드를 자동 정렬하고 오류를 검사해야 합니다.

## [지속적 통합(CI) 검증 명령어]
- **백엔드 유닛 테스트 및 검증**: `./gradlew test`
- **백엔드 프로덕션 빌드 검증**: `./gradlew build -x test` (테스트 중복 방지용)
- **프론트엔드 유닛 테스트 및 검증**: `npm run test`
- **프론트엔드 프로덕션 빌드 검증**: `npm run build`


### 기술 선택 원칙

- Java 25 / Spring Boot 4.x 및 관련 라이브러리의 호환성은 공식 문서와 실제 의존성
  정보로 확인한다.
- 기술적 문제가 발견되면 임의로 버전을 바꾸지 않고, 문제와 대안을 먼저 설명한다.
- 추가 프레임워크나 라이브러리는 필요성이 확인되기 전까지 도입하지 않는다.

## 개발 학습 원칙

1. **설명 후 구현**: 코드를 작성/수정하기 전에 변경할 파일, 목적, 구현 방법을 설명한다.
2. **작은 단위로 개발**: 기능을 작고 검증 가능한 단위로 나눈다.
3. **임의 변경 금지**: 요청하지 않은 기능 추가나 기존 설계의 임의 변경을 하지 않는다.
4. **의존성 관리**: 새 라이브러리/프레임워크 도입 전에 목적·대안·장단점을 설명하고
   승인을 받는다.
5. **과도한 추상화 금지**: 불필요한 디자인 패턴·계층·공통 모듈을 만들지 않고, 이해하기
   쉬운 구조를 우선한다.
6. **코드 이해 지원**: 구현 후 핵심 코드, 사용한 개념, 데이터 흐름, 그 방식을 선택한
   이유를 설명한다.
7. **역할 구분**: 프런트엔드/백엔드/데이터베이스/외부 AI API의 역할을 명확히 구분한다.
8. **AI와 일반 로직 구분**: AI가 필요한 기능과 일반 코드로 처리할 기능을 구분한다.
   명확한 게임 규칙과 데이터 정합성은 일반 코드로 검증한다.
9. **테스트 검증**: 변경 사항에 맞는 테스트/빌드를 실행하고 결과를 보고한다. 실행하지
   않은 테스트를 통과했다고 말하지 않는다.
10. **안전한 변경**: 기존 작업과 사용자 변경 사항을 임의로 덮어쓰거나 삭제하지 않는다.
    Git 작업 시 변경 사항을 확인하고, 위험한 작업은 사전에 설명한다.
11. **포트폴리오 관점**: 구현 결과뿐 아니라 설계 이유, 검증 방법, 한계와 개선 방향을
    기록한다.

설명은 기술 용어를 나열하지 않고, 초보 개발자가 이해할 수 있도록 구체적으로 작성한다.
이미 이해한 내용은 불필요하게 반복하지 않는다.

## 문서 구조

- `CLAUDE.md`: 공통 개발 규칙, 기술 스택, 작업 방식 (이 파일)
- `docs/requirements/`: 기능 요구사항, 동작 조건, 완료 기준
- `docs/decisions/`: 기술 선택 이유, 대안 비교, 설계 결정
- `docs/progress.md`: 진행 상황, 테스트 결과, 학습한 개념, 다음 작업

문서 간 내용을 불필요하게 중복하지 않는다. 요구사항/기술 설계가 아직 확정되지 않았으면
확정된 것처럼 기록하지 않는다.
