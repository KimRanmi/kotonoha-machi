# 0003. 백엔드 패키지 구조: 도메인 우선 + 레이어 하위 패키지

- 날짜: 2026-10-19
- 상태: 확정

## 배경

`auth` 패키지에 컨트롤러, 서비스, 요청/응답 DTO, Spring Security 연동 클래스가 모두
같은 패키지(`com.kotonohamachi.auth`)에 평평하게 섞여 있었다. 파일이 몇 개 안 될 때는
문제가 없었지만, 기능이 늘어나면 한 패키지 안에서 "이게 API 입출력용 DTO인지, 비즈니스
로직인지, 외부 요청을 받는 컨트롤러인지"를 파일 이름만으로 구분해야 해서 코드를 읽기
어려워진다.

## 결정

기능(도메인) 패키지는 그대로 유지하고, 그 안에 역할별 하위 패키지를 둔다.

```
com.kotonohamachi.auth
├── controller/   # @RestController, HTTP 요청/응답 매핑
├── service/      # @Service, 비즈니스 로직, Spring Security 연동(UserDetailsService 등)
└── dto/          # 요청/응답 본문(record)

com.kotonohamachi.user
├── User.java            # 엔티티는 도메인 루트에 둔다
├── UserStatus.java
└── repository/   # Spring Data JPA 리포지토리
```

- **엔티티는 하위 패키지로 옮기지 않는다.** `User`, `UserStatus`는 `controller/service/
  dto/repository` 중 어느 역할도 아니라, 그 도메인 자체를 나타내는 모델이다. 레이어가
  아니라 도메인 개념이므로 도메인 패키지 루트에 둔다.
- **`common` 패키지는 이번 분리 대상이 아니다.** `ApiException`, `ErrorResponse`,
  `GlobalExceptionHandler`, `SecurityConfig`는 특정 기능 도메인이 아니라 앱 전체에 걸친
  공통 설정/예외 처리다. 파일 4개를 억지로 `controller/service/dto`로 나누면 오히려
  탐색이 불편해진다(개발 학습 원칙 5: 과도한 추상화 금지).
- `chat`, `resident`, `theme`, `town`, `vocabulary`는 아직 구현 전이라 옮길 코드가
  없다. 앞으로 이 패키지들에 코드를 추가할 때도 이 구조를 따른다.

## 이유

- **기능 단위로 먼저 찾고, 그 안에서 역할을 구분한다.** "로그인 관련 코드가 어디 있지?"는
  `auth` 패키지 하나만 보면 되고, "그중 API 입출력 형식이 뭐지?"는 `auth/dto`만 보면
  된다. 레이어를 최상위로 올리면(`com.kotonohamachi.controller.AuthController`) 기능이
  늘어날수록 각 레이어 패키지 안에 모든 기능의 클래스가 섞여, 정작 "로그인 기능 전체"를
  한 번에 보기 어려워진다.
- 패키지 하나(`package-info.java`)가 기능 하나의 책임을 설명하는 지금 구조(`auth`,
  `user`, `chat` 등)와 자연스럽게 맞물린다.

## 대안 비교

| 항목 | 도메인 우선 + 레이어 하위 패키지(채택) | 레이어 우선(전역 분리) |
|---|---|---|
| 탐색 기준 | "어떤 기능인가"가 먼저 보임 | "어떤 레이어인가"가 먼저 보임 |
| 기능이 늘어날 때 | 패키지 하나만 보면 그 기능의 컨트롤러/서비스/DTO를 다 볼 수 있음 | 레이어 패키지 하나에 모든 기능의 클래스가 섞여 더 복잡해짐 |
| 기존 구조와의 연속성 | 기존 `auth`/`user` 패키지 구조를 그대로 유지 | 기존 기능 패키지를 모두 해체해야 함 |

## 적용 범위

이번 변경은 이미 구현된 `auth`(controller/service/dto 분리), `user`
(repository 분리)에만 적용했다. `CLAUDE.md`와 `developer`/`code-reviewer` 서브에이전트
설명에도 이 구조를 반영해, 앞으로 추가되는 백엔드 코드도 같은 기준을 따르게 한다.
