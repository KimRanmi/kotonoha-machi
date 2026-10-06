# ことばのまち — 주민 자유 대화 최소 프로토타입

일본어 학습 게임 "ことばのまち"의 핵심 가설을 검증하기 위한 최소 프로토타입입니다.
마을 카페를 운영하는 주민 한 명과 텍스트로 자유롭게 일본어 대화를 나눌 수 있습니다.
정해진 대사나 선택지가 아니라, 실제로 입력한 내용에 맞춰 Google Gemini API가
그때그때 응답을 생성합니다.

## 기능

- 주민(미유)과의 자유 텍스트 대화 (대화 맥락 유지)
- 주민 응답에서 단어를 클릭하면 "학습 목록에 추가" 버튼만 뜨는 최소 개입형 팝업
- 별도의 학습 목록 화면에서 담아둔 단어 확인/삭제
- 대화 기록과 학습 목록은 localStorage에 저장되어 새로고침해도 유지됨

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

필요하면 주민 응답 생성에 쓸 모델도 바꿀 수 있습니다 (기본값: `gemini-3.6-flash`).

```
GEMINI_MODEL=gemini-3.6-flash
```

### 3. 백엔드 실행 (Spring Boot, Java 25 필요)

`/api/*` 요청은 `backend/`의 Spring Boot 서버(8080)가 처리합니다. `.env.local`의 키를 환경변수로 넘겨 실행하세요.

```bash
cd backend
set -a && . ../.env.local && set +a
./gradlew bootRun
```

### 4. 프론트엔드 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 을 열면 됩니다. Next.js가 `/api/*`를 백엔드로 프록시합니다
(백엔드 주소를 바꾸려면 `BACKEND_URL` 환경변수 사용, 기본값 `http://localhost:8080`).

백엔드 테스트는 `cd backend && ./gradlew test` 로 실행합니다.

## 이 프로토타입에서 다루지 않는 것

마을 지도, 캐릭터 이동/커스터마이징, 건물 해금, 음성 인식/합성, 학습 커리큘럼,
사전 API 연동(단어 뜻 표시)은 이번 범위에서 의도적으로 제외했습니다.
이 프로토타입은 오직 "주민과의 자유 텍스트 대화가 실제로 만족스러운가"만 검증합니다.
