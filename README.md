# ことばのまち — 주민 자유 대화 최소 프로토타입

일본어 학습 게임 "ことばのまち"의 핵심 가설을 검증하기 위한 최소 프로토타입입니다.
마을 카페를 운영하는 주민 한 명과 텍스트로 자유롭게 일본어 대화를 나눌 수 있습니다.
정해진 대사나 선택지가 아니라, 실제로 입력한 내용에 맞춰 Google Gemini API가
그때그때 응답을 생성합니다.

## 기능

- 주민(미유)과의 자유 텍스트 대화 (대화 맥락 유지)
- 주민 응답에서 단어를 클릭하면 "학습 목록에 추가" 버튼만 뜨는 최소 개입형 팝업
- 별도의 학습 목록 화면에서 담아둔 단어 확인/삭제
- 대화 기록과 주민별 친밀도는 서버(PostgreSQL)에 저장되어 새로고침/다른 브라우저에서도 유지됨 (같은 익명 ID 기준)
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

## 임시 사용자 식별 (로그인 전, 2단계)

로그인이 없으므로 **익명 ID 헤더 방식**을 씁니다. 프론트가 처음 한 번 `crypto.randomUUID()`로 만든 ID를
localStorage(`kotonoha:anonymous-id`)에 저장하고, 모든 API 요청에 `X-Anonymous-Id` 헤더로 보냅니다.
백엔드는 이 값으로 `users` 행을 찾거나 만들고(`anonymous_id` UNIQUE, upsert), 대화 기록·친밀도를 그 `users.id`에 연결합니다.

**왜 이 방식인가**
- 가장 단순합니다. 세션/쿠키/CORS 설정이 필요 없고, Next 프록시 뒤에서도 헤더가 그대로 전달됩니다.
- 데이터가 처음부터 `users.id`(FK)에 매달려 있어서, 3단계에서 로그인이 생겨도 테이블 구조를 바꿀 필요가 거의 없습니다.
- 컨트롤러는 `CurrentUser` 타입만 받고, 헤더를 해석하는 코드는 `CurrentUserArgumentResolver` 한 곳에 모여 있습니다.

**한계**: 익명 ID는 비밀이 아니므로 ID를 아는 사람은 그 기록을 볼 수 있습니다(UUID라 추측은 어렵지만 인증은 아님). localStorage를 지우면 같은 사용자로 돌아올 수 없습니다. 그래서 로그인 전 임시 방편입니다.

**3단계(JWT)에서 교체하는 방법**
1. `users`에 `email`/`password_hash`를 추가하고 `anonymous_id`를 nullable로 바꿉니다 (Flyway `V2__...`).
2. `CurrentUserArgumentResolver.resolveArgument`만 `Authorization: Bearer <JWT>` 검증 결과(subject = `users.id`)를 돌려주도록 바꿉니다. 컨트롤러/서비스/저장소는 수정할 필요가 없습니다.
3. 프론트는 `lib/storage.ts`의 `apiFetch`에서 `X-Anonymous-Id` 대신 `Authorization` 헤더를 붙입니다.
4. 기존 익명 사용자의 데이터를 로그인 계정으로 옮길지는 그때 결정합니다 (`anonymous_id`가 있는 users 행에 이메일을 붙이는 방식이 가능).

## API (2단계)

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/chat` | `{villagerId, messages}` → `{reply, translation}`. 성공 시 대화 2건 저장 + 친밀도 +1. 친밀도는 서버가 DB에서 읽으며 클라이언트가 보낸 `exchanges`는 무시합니다 |
| GET | `/api/villagers/{id}/messages` | 주민별 대화 기록 (오래된 순, 최근 500건) |
| GET | `/api/intimacy` | 주민별 `{villagerId, met, description}` (수치는 노출하지 않고 서술형 문구만) |

모든 요청에 `X-Anonymous-Id`(UUID) 헤더가 필요합니다.

## 이 프로토타입에서 다루지 않는 것

마을 지도, 캐릭터 이동/커스터마이징, 건물 해금, 음성 인식/합성, 학습 커리큘럼,
사전 API 연동(단어 뜻 표시)은 이번 범위에서 의도적으로 제외했습니다.
이 프로토타입은 오직 "주민과의 자유 텍스트 대화가 실제로 만족스러운가"만 검증합니다.
