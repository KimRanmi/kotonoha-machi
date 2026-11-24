# 0042. 배포 구성: GCP VM 한 대 + docker compose + Caddy

- 상태: 구현·운영 중(GCP VM). Caddy 도입은 사용자 승인 받음.

## 결정

- **GCP Compute Engine VM 한 대**에 `docker-compose.prod.yml`로 db·backend·web(Caddy) 세 컨테이너를 띄운다. 당분간 본인만 쓰는 포트폴리오라 단순함과 저렴함이 목표다.
- **Caddy**가 한 컨테이너에서 ① 프런트 정적 파일 서빙 ② `/api`·`/oauth2`·`/login/oauth2`를 `backend:8080`으로 프록시 ③ HTTPS 인증서 자동 발급·갱신을 맡는다. 프런트용 별도 웹서버(nginx 등)를 두지 않는다. 설정은 `frontend/Caddyfile`, 이미지는 `frontend/Dockerfile.prod`(node 빌드 → caddy).
- **같은 도메인(단일 오리진)**: 프런트는 `VITE_API_BASE_URL=""`로 빌드해 상대 경로로 API를 부른다(`client.ts`의 `??`는 빈 문자열을 기본값으로 바꾸지 않아 코드 수정 불필요). 그래서 CORS 걱정 없이 쿠키가 같은 사이트 안에서만 오간다.
- 주소는 루트 `.env`의 `DOMAIN`으로 받는다(도메인 미정이면 무료 서브도메인으로도 동작, 로컬은 `localhost`). `FRONTEND_ORIGIN=https://$DOMAIN`, `SESSION_COOKIE_SECURE=true`는 compose가 고정한다.
- 백엔드에 `server.forward-headers-strategy`를 환경변수(`FORWARD_HEADERS_STRATEGY`, 기본 `none`)로 열고 운영 compose에서만 `framework`로 둔다. 프록시 뒤에서 소셜 로그인 콜백 주소(`{baseUrl}`)가 `http`가 아니라 `https`로 만들어지게 하기 위해서다(로컬 실행에서 `redirect_uri=https://localhost/...` 확인).
- db는 `ports` 없이 내부 네트워크에만, backend도 외부 포트 없음(80·443은 web만). 비밀번호는 루트 `.env`의 `DB_PASSWORD`, 볼륨으로 데이터 유지. 개발용 `docker-compose.yml`은 그대로 둔다.
- 주민 대화 모델 기본값을 `gemini-3.5-flash-lite`로 바꿨다(사용자 결정, 결제는 배포 후 연결).

## 대안과 이유

- **nginx + certbot**: 가장 흔하지만 인증서 발급·갱신(certbot 컨테이너/크론)과 80→443 설정을 직접 해야 해 파일·절차가 2~3배다. 첫 배포에는 실수 지점이 많다.
- **GCP 로드밸런서 + 관리형 인증서**: GUI로 되지만 로드밸런서 요금(월 약 $18 이상)이 "저렴하게" 목표와 안 맞는다.
- **Cloud Run + Cloud SQL**: 관리는 편하지만 DB 비용이 크고 구성 학습량이 늘어 이번엔 제외.
- 프런트·백엔드를 서로 다른 도메인에 둠: CORS·SameSite 쿠키 문제가 생겨 같은 도메인으로 해결.

## 한계

- VM 한 대라 장애 시 중단되고, DB 백업은 수동 `pg_dump`다(`docs/deploy.md`).
- Caddy는 인증서 발급에 80·443 포트와 실제 도메인의 DNS가 VM IP를 가리켜야 한다.
