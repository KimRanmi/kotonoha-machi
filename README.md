# ことばのまち — 주민 자유 대화 최소 프로토타입

일본어 학습 게임 "ことばのまち"의 핵심 가설을 검증하기 위한 최소 프로토타입입니다.
마을 카페를 운영하는 주민 한 명과 텍스트로 자유롭게 일본어 대화를 나눌 수 있습니다.
정해진 대사나 선택지가 아니라, 실제로 입력한 내용에 맞춰 Google Gemini API가
그때그때 응답을 생성합니다.

## 기능

- 주민(미유)과의 자유 텍스트 대화 (대화 맥락 유지)
- 주민 응답에서 단어를 클릭하면 "학습 목록에 추가" 버튼만 뜨는 최소 개입형 팝업
- 별도의 학습 목록 화면에서 담아둔 단어 확인/삭제
- 대화 기록과 주민별 친밀도는 서버(PostgreSQL)에 저장되어 새로고침/다른 브라우저에서도 유지됨 (같은 계정 기준)
- 학습 목록·건물 등은 아직 localStorage에 저장됨 (4단계에서 서버로 이전 예정)

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. API 키 설정 (필수)

`.env.local.example`을 복사해 `.env.local` 파일을 만들고, 본인의 Gemini API 키를 채워 넣으세요.
**이 키를 직접 채워 넣어야 실행됩니다.** 키가 없으면 대화 API가 500 에러를 반환합니다.

```bash
cp .env.local.example .env.local
```

```
# .env.local
GEMINI_API_KEY=여기에-실제-키를-입력하세요
```

API 키는 https://aistudio.google.com/apikey 에서 발급받을 수 있습니다.

필요하면 주민 응답 생성에 쓸 모델도 바꿀 수 있습니다 (기본값: `gemini-3.5-flash`).

```
GEMINI_MODEL=gemini-3.5-flash
```

### 3. PostgreSQL 실행 (Docker 필요)

대화 기록과 친밀도는 PostgreSQL에 저장됩니다. 로컬 개발용 DB는 Docker Compose로 띄웁니다.
DB 계정은 로컬 전용 값이며 `.env.example`에 예시가 있습니다 (복사 없이도 같은 기본값으로 동작).

```bash
cp .env.example .env   # 선택. 값을 바꾸고 싶을 때만
docker compose up -d
```

테이블은 백엔드가 시작될 때 Flyway(`backend/src/main/resources/db/migration`)가 자동으로 만듭니다.

### 4. 백엔드 실행 (Spring Boot, Java 25 필요)

`/api/*` 요청은 `backend/`의 Spring Boot 서버(8080)가 처리합니다. `.env.local`의 키를 환경변수로 넘겨 실행하세요.
(`.env`를 바꿨다면 `DB_URL`/`DB_USER`/`DB_PASSWORD`도 같이 넘깁니다.)

```bash
cd backend
set -a && . ../.env.local && set +a
./gradlew bootRun
```

### 5. 프론트엔드 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 을 열면 됩니다. Next.js가 `/api/*`를 백엔드로 프록시합니다
(백엔드 주소를 바꾸려면 `BACKEND_URL` 환경변수 사용, 기본값 `http://localhost:8080`).

백엔드 테스트는 `cd backend && ./gradlew test` 로 실행합니다. Testcontainers로 실제 PostgreSQL 컨테이너를 띄우므로 **Docker가 실행 중**이어야 합니다.

## Docker로 전체 실행

앱 전체(DB + 백엔드 + 프론트)를 컨테이너로 한 번에 띄울 수 있습니다. 서비스에 붙은 `full` 프로필(이름표)을 지정할 때만 백엔드/프론트가 함께 뜹니다.

```bash
docker compose --profile full up -d --build   # DB + 백엔드 + 프론트 → http://localhost:3000
docker compose --profile full down            # 중지 (DB 데이터는 볼륨에 유지, 지우려면 down -v)
```

- `GEMINI_API_KEY`는 이미지에 넣지 않고 `.env.local`에서 실행 시 환경변수로 받습니다.
- 코드를 고치면 `--build`로 이미지를 다시 만들어야 반영됩니다. 그래서 평소 개발은 위의 3~5번(DB만 컨테이너, 백엔드/프론트는 로컬 실행)을 쓰세요.
- 프론트의 `/api/*` 프록시 대상은 빌드 시점에 고정됩니다(`BACKEND_URL` 빌드 인자, compose에서는 `http://backend:8080`).
- 컨테이너를 막 띄운 직후 몇 초간은 백엔드가 준비되지 않아 API가 에러를 낼 수 있습니다.

## 로그인 (access + refresh 토큰)

이메일 + 비밀번호로 가입/로그인합니다. 비밀번호는 8~72자이며 BCrypt 해시로만 저장하고, 이메일은 소문자로 정규화합니다. 틀린 비밀번호와 없는 계정은 같은 오류 메시지를 줍니다.

**토큰 구조**
| | access 토큰 | refresh 토큰 |
| --- | --- | --- |
| 형태 | JWT(HS256), subject = `users.id` | 서버가 만든 무작위 값(256비트) |
| 유효기간 | 15분 (`jwt.expiration`) | 14일 (`auth.refresh-expiration`), 갱신할 때마다 새 토큰으로 교체 |
| 브라우저 보관 | **JS 메모리에만** (localStorage에 두지 않음) | **httpOnly 쿠키** (JS가 읽을 수 없음) |
| 서버 보관 | 없음 (stateless) | **SHA-256 해시만** `refresh_tokens` 테이블에 저장 |
| 용도 | 모든 API 요청의 `Authorization: Bearer` | `/api/auth/refresh`로 새 access 토큰을 받을 때만 |

- **새로고침/재접속**: 메모리의 access 토큰은 사라지므로, 프론트가 refresh 쿠키로 `/api/auth/refresh`를 호출해 복구합니다. 로그인한 적이 없는 브라우저는 이 요청을 건너뜁니다(`kotonoha:session-hint`는 비밀이 아닌 표시일 뿐).
- **교체(rotation)와 탈취 감지**: refresh할 때마다 기존 토큰은 폐기되고 같은 로그인 계열(family)의 새 토큰이 발급됩니다. 이미 폐기된 토큰이 다시 오면 탈취로 보고 그 계열 전체를 폐기합니다(정당한 사용자도 다시 로그인해야 합니다).
- **로그아웃**: 서버에서 refresh 토큰 계열을 폐기하고 쿠키를 지웁니다. 이미 발급된 access 토큰은 만료(최대 15분)까지 유효합니다.
- **쿠키 속성**: `HttpOnly`, `SameSite=Strict`(다른 사이트에서 온 요청에는 붙지 않아 CSRF 방어), `Path=/api/auth`(인증 엔드포인트에만 전송). **HTTPS로 서비스할 때는 `AUTH_COOKIE_SECURE=true`**를 설정하세요(로컬 http에서는 false).
- **같은 사이트 전제**: 프론트의 `/api/*`를 같은 주소로 프록시하므로 CORS 설정 없이 쿠키가 전달됩니다. 프론트와 API를 다른 도메인으로 분리하면 쿠키/CORS 설정을 다시 해야 합니다.
- **여러 탭**: 탭 안에서는 진행 중인 refresh 요청 하나를 공유하고, 탭 사이에서는 Web Locks로 순서대로 실행합니다(동시에 갱신해 재사용으로 오인되는 것을 막기 위함).
- **서명 키**: 환경변수 `JWT_SECRET`(32바이트 이상)으로만 받습니다. 비워 두면 서버 시작 때마다 임의 키를 쓰므로 **재시작하면 access 토큰이 모두 무효**가 됩니다(refresh 쿠키로 곧바로 복구되므로 로그인은 유지됩니다). 생성 예: `openssl rand -base64 48` (실제 값은 `.env.local`에만, 커밋 금지).
- **닉네임**: 가입할 때 닉네임을 정하고 **중복 확인**을 해야 가입 버튼이 켜집니다(서버도 가입 시 다시 검사하며, 대소문자 구분 없이 중복 불가 — `users_nickname_lower_idx`). 규칙은 글자·숫자·밑줄만 2~12자입니다(공백/기호 불가. 닉네임이 주민 프롬프트에 들어가므로 지시문 삽입을 막는 이유도 있음). 모든 주민은 대화할 때 시스템 프롬프트에 들어간 이 닉네임으로 사용자를 부릅니다(`ChatService`). 대화는 일본어로만 하므로 한글/영문 닉네임은 **발음에 맞는 가타카나로 바꿔 부르게** 합니다(예: 하루 → ハル). 화면 표시와 DB의 닉네임은 원문 그대로입니다. 마을 상단의 닉네임을 누르면 `/nickname`에서 바꿀 수 있습니다. 닉네임 도입 전에 가입한 계정은 로그인 후 `/nickname`으로 보내 먼저 정하게 합니다.
- **화면 흐름**: 로그인하지 않으면 어느 화면으로 들어와도 `/login`(첫 화면)으로 이동합니다(`AuthGuard`). 구현은 `CurrentUserArgumentResolver`가 access 토큰을 검증하고, 컨트롤러/서비스는 `CurrentUser`만 압니다. Spring Security 필터 체인은 쓰지 않고 `spring-security-crypto`(BCrypt)와 `nimbus-jose-jwt`만 사용합니다.
- **2단계의 익명 데이터**: 익명 ID로 쌓였던 대화 기록/친밀도는 더 이상 접근할 수 없습니다(개발용 데이터라 이전하지 않기로 한 결정에 따름).
- **아직 없는 것**: 로그인 시도 제한(5단계 rate limit), 비밀번호 재설정, 이메일 인증, 만료된 refresh 행의 주기적 정리(지금은 로그인할 때 그 사용자 것만 정리).

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/auth/signup` | `{email, password, nickname}` → `{accessToken, email, nickname}` + refresh 쿠키 (공개) |
| POST | `/api/auth/login` | `{email, password}` → `{accessToken, email, nickname}` + refresh 쿠키 (공개). 닉네임 도입 전 계정은 `nickname`이 null |
| GET | `/api/auth/nickname-available?nickname=` | `{available, message}` 닉네임 형식/중복 확인 (공개) |
| PUT | `/api/auth/nickname` | `{nickname}` 닉네임 설정/변경 (로그인 필요, 중복이면 409) |
| POST | `/api/auth/refresh` | refresh 쿠키 → 새 `{accessToken, email, nickname}` + 새 refresh 쿠키. 무효하면 401 |
| POST | `/api/auth/logout` | refresh 토큰 폐기 + 쿠키 삭제 (204) |
| GET | `/api/auth/me` | 현재 로그인한 사용자 `{email, nickname}` |
| POST | `/api/chat` | `{villagerId, messages}` → `{reply, translation}`. 성공 시 대화 2건 저장 + 친밀도 +1. 친밀도는 서버가 DB에서 읽으며 클라이언트가 보낸 `exchanges`는 무시합니다 |
| GET | `/api/villagers/{id}/messages` | 주민별 대화 기록 (오래된 순, 최근 500건) |
| GET | `/api/intimacy` | 주민별 `{villagerId, met, description}` (수치는 노출하지 않고 서술형 문구만) |

`signup`/`login`/`refresh`/`logout`/`nickname-available`을 뺀 모든 API에 `Authorization: Bearer <access 토큰>` 헤더가 필요합니다.

## 이 프로토타입에서 다루지 않는 것

마을 지도, 캐릭터 이동/커스터마이징, 건물 해금, 음성 인식/합성, 학습 커리큘럼,
사전 API 연동(단어 뜻 표시)은 이번 범위에서 의도적으로 제외했습니다.
이 프로토타입은 오직 "주민과의 자유 텍스트 대화가 실제로 만족스러운가"만 검증합니다.
