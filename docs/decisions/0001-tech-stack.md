# 0001. v2 기술 스택 결정

- 날짜: 2026-10-17
- 상태: 확정

## 배경

v1은 Next.js(프론트) + Spring Boot(백엔드) + PostgreSQL로 "바이브코딩" 방식으로 만들어져,
기능은 동작하지만 구조와 동작 원리를 충분히 이해하지 못한 상태였다. v2는 같은 게임(마을,
주민과의 대화, 카페 주문, 테마 학습 등)을 다시 만들되, 공부와 포트폴리오를 목표로 구조를
새로 설계한다.

## 결정

### 프런트엔드: Vite + React + TypeScript + Three.js

- **Vite**: 개발 서버(HMR)와 빌드 도구.
- **React**: UI와 화면 상태 관리.
- **Three.js**: 3D 장면(건물 내부 등) 전담. React와의 연결은 `react-three-fiber` 같은
  래퍼 없이, `useRef` + `useEffect`로 Three.js 객체(Scene/Camera/Renderer)를 직접
  생성·관리한다.
- **라우팅**: React Router를 도입한다. 화면이 로그인/마을/건물 내부/테마 학습/단어장 등
  여러 개라 파일 기반 라우팅(Next.js)이 없는 상태에서 직접 상태로 관리하면 금방 복잡해지기
  때문이다.
- **테스트**: Vitest (Vite와 설정을 공유해 추가 설정 부담이 적다).
- **패키지 매니저**: npm (기존과 동일, 바꿀 이유가 없다).

### 백엔드: Java 25 + Spring Boot 4.x

- API와 비즈니스 로직을 담당. v1의 controller/service/repository 역할 구분을 유지한다.
- 서블릿 컨테이너는 Tomcat(Spring Boot 기본값). Spring Boot 4부터 Undertow가
  Jakarta EE 11 / Servlet 6.1을 아직 지원하지 않아 제외되었다.
- 빌드 도구는 Gradle을 유지하되, Spring Boot 4가 요구하는 Gradle 8.14 이상으로 올린다.
- 테스트는 JUnit + Testcontainers(실제 PostgreSQL을 띄워 검증)를 유지한다.

### 데이터베이스: PostgreSQL + Flyway

- PostgreSQL이 영속 데이터를 저장하고, Flyway가 스키마 변경 이력을 관리한다.
- Flyway 10 이상에서는 PostgreSQL 지원이 `flyway-core`와 별도 모듈인
  `flyway-database-postgresql`로 분리되어 있으므로, 두 의존성을 함께 추가해야 한다.

### AI: Gemini API

- 백엔드에서만 호출한다. API 키를 프런트엔드에 노출하지 않는다.
- v1은 프런트(Next.js) 서버가 `.env.local`의 키로 직접 `/api/chat`을 호출하는 구조였는데,
  이는 "키 비노출" 원칙과 맞지 않았다. v2는 이 호출을 백엔드로 완전히 옮긴다.

## 대안 비교

| 항목 | 채택 | 대안 | 대안을 선택하지 않은 이유 |
|---|---|---|---|
| 프런트 프레임워크 | Vite + React | Next.js (v1과 동일) | 서버 기능(API routes, SSR)을 쓸 이유가 사라짐(AI 호출이 백엔드로 이동). 프레임워크 레이어가 적어야 React/빌드 도구의 역할이 명확히 보여 학습에 유리하다. |
| 3D 연동 | 순수 Three.js | react-three-fiber | r3f는 Three.js 위에 또 다른 추상화 개념을 얹는다. v1도 이미 순수 Three.js 방식이었고, 이 프로젝트의 3D 사용 범위(건물 내부 한정)에서는 직접 관리가 더 이해하기 쉽다. |
| 라우팅 | React Router | 직접 상태 기반 라우팅 | 화면 수가 많아 뒤로가기/새로고침 유지 등을 직접 구현하면 번거로움이 커진다. |

## 확인이 필요했던 사항 (검증됨)

- Spring Boot 4.0은 공식 시스템 요구사항상 Java 17~25를 지원한다 (Spring Boot 4.0 System
  Requirements, docs.spring.io).
- Java 25는 2025-09-16 GA된 LTS로 2030년까지 지원된다.
- Spring Boot 4.0은 Spring Framework 7.0.5+, Jakarta EE 11 / Servlet 6.1, Gradle
  8.14+(또는 9.x) / Maven 3.6.3+를 요구한다.

## 확인되지 않은 점 (실제 세팅 시 재확인)

- Flyway 11.x + Spring Boot 4.x + JDK 25 조합에서 2025년 10월에 보고된 설정 프로퍼티
  인식 문제가 현재(2026-10) 해결되었는지는 공식 소스로 확인하지 못했다. 백엔드를 실제로
  세팅할 때 최신 패치 버전으로 재현 테스트를 거친다.
