# 배포 절차 (GCP VM 한 대 + docker compose)

구성과 선택 이유는 `docs/decisions/0042-gcp-vm-docker-compose-deploy.md`. 값(키·비밀번호)은 이 문서에 적지 않는다.

## 0. 준비물

- 도메인 또는 무료 서브도메인(DuckDNS 등). 인증서 자동 발급에 필요하다. 아직 없으면 먼저 로컬(`DOMAIN=localhost`)로 확인한다.
- `backend/.env`에 넣을 키들(아래 3번).

## 1. VM 만들기

1. GCP 콘솔 → Compute Engine → VM 인스턴스 만들기. 권장: `e2-small`(RAM 2GB) 이상, Ubuntu 24.04 LTS, 디스크 20GB. (자바 + Postgres + 빌드에 메모리가 필요해 `e2-micro`는 빌드 중 부족할 수 있다. 부족하면 스왑을 추가한다.)
2. **고정 외부 IP**를 예약해 붙인다(VPC 네트워크 → IP 주소). 안 하면 재시작 때 IP가 바뀐다.
3. 방화벽: 인바운드 **22, 80, 443만** 허용한다(VM 만들 때 "HTTP/HTTPS 트래픽 허용" 체크). **5432, 8080은 열지 않는다.** 22는 가능하면 내 IP로 제한한다.
4. DNS: 도메인의 A 레코드를 VM 고정 IP로 지정한다. 전파 확인: `dig +short 내도메인`.

## 2. Docker 설치와 클론

VM에 SSH 접속 후:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # 적용하려면 로그아웃 후 재접속
git clone <저장소 주소> kotonoha-machi && cd kotonoha-machi
```

## 3. 환경 파일 두 개

**(a) 루트 `.env`** — compose가 읽는다. 키 이름만:

- `DOMAIN` — 사이트 주소(예: `example.com`, 스킴·슬래시 없이)
- `DB_PASSWORD` — DB 비밀번호(새로 정한 긴 값)

**(b) `backend/.env`** — `cp backend/.env.example backend/.env` 후 값을 채운다(`.env.example`의 주석 참고). 운영에서 필요한 것:

- `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` (가입 인증 메일. 도메인 인증 전에는 Resend 공용 테스트 주소라 본인 계정 이메일로만 발송된다)
- `GEMINI_API_KEY`, `GEMINI_MODEL` (비우면 기본 `gemini-3.5-flash-lite`)
- `GOOGLE_TTS_API_KEY` (비우면 브라우저 음성으로 대체)
- 소셜 로그인을 쓸 때만: `GOOGLE_*`, `KAKAO_*`, `NAVER_*` — 각 콘솔의 리디렉션 URI에 `https://내도메인/login/oauth2/code/{google|kakao|naver}`를 등록한다.

`DB_*`, `FRONTEND_ORIGIN`, `SESSION_COOKIE_SECURE`는 `docker-compose.prod.yml`이 운영 값으로 덮어쓰므로 `backend/.env`에 적어도 무시된다. 두 파일 모두 git에 올리지 않는다(`.gitignore`).

## 4. 실행

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f web      # 인증서 발급 로그
```

첫 빌드는 몇 분 걸린다. 코드를 갱신할 때는 `git pull` 후 같은 `up -d --build`를 다시 실행한다. DB·인증서는 볼륨에 남는다.

### Flyway 확인 (V51까지)

```bash
docker compose -f docker-compose.prod.yml logs backend | grep -i "migrat"
docker compose -f docker-compose.prod.yml exec db psql -U kotonoha_machi -d kotonoha_machi \
  -c "select max(version::int) from flyway_schema_history"
```

로그에 `now at version v51`이, 쿼리 결과에 `51`이 나와야 한다(이후 마이그레이션이 늘면 그 번호).

## 4-1. 자동 배포 설정 (GitHub Actions, 한 번만)

master에 머지되고 CI가 통과하면 `.github/workflows/deploy.yml`이 VM에 SSH로 접속해 `git pull`과 `docker compose up -d --build`를 대신 실행한다(결정 문서 `0043`). 아래 설정을 해야 동작한다.

**1) VM에서 배포 전용 SSH 키 만들기** (SSH 창에서 한 줄씩)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/gha_deploy -N "" -C "github-actions-deploy"
```

```bash
cat ~/.ssh/gha_deploy.pub >> ~/.ssh/authorized_keys
```

```bash
cat ~/.ssh/gha_deploy
```

마지막 명령이 **개인 키**(`-----BEGIN OPENSSH PRIVATE KEY-----`부터 `-----END ...-----`까지 전부)를 출력한다. 줄 끝까지 통째로 복사해 둔다. 이 값은 비밀이라 채팅·문서에 붙이지 않는다. GitHub에 등록한 뒤에는 VM에서 지운다.

```bash
rm ~/.ssh/gha_deploy
```

**2) GitHub 저장소 Secrets 등록** (저장소 Settings → Secrets and variables → Actions → New repository secret)

| 이름 | 값 |
|---|---|
| `DEPLOY_HOST` | VM 고정 외부 IP |
| `DEPLOY_USER` | VM 사용자 이름(SSH 프롬프트의 `@` 앞) |
| `DEPLOY_SSH_KEY` | 위 개인 키 전체 |

**3) 동작 확인**
- master에 머지하면 Actions 탭에 CI → Deploy 순서로 돈다. Deploy가 초록이면 VM에 반영된 것이다.
- 수동으로 다시 돌리려면 Actions → Deploy가 아니라, CI를 다시 실행(Re-run)하거나 빈 커밋을 머지한다.
- 접속이 거부되면(`Permission denied`) VM 인스턴스 → 수정 → SSH 키(메타데이터)에 공개 키(`gha_deploy.pub` 내용)를 추가해 본다. `authorized_keys` 직접 수정이 지워지는 환경이 있다.

**주의**
- 배포 중 빌드로 몇 분간 느려지고, 빌드가 실패하면 서비스가 멈출 수 있다(`docker compose ps`·`logs`로 확인).
- `.env` 파일은 git에 없으므로 자동 배포로 바뀌지 않는다. 키를 바꾸면 VM에서 직접 고치고 `docker compose -f docker-compose.prod.yml up -d --force-recreate backend`를 실행한다.
- 방화벽 22번 포트가 인터넷에 열려 있으니 비밀번호 로그인은 쓰지 않는다(GCP 기본은 키 로그인만).

## 5. DB 백업·복원

백업(날짜별 파일):

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U kotonoha_machi kotonoha_machi | gzip > backup-$(date +%F).sql.gz
```

복원(빈 DB에):

```bash
gunzip -c backup-YYYY-MM-DD.sql.gz | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U kotonoha_machi -d kotonoha_machi
```

백업 파일은 VM 밖(내 PC, 구글 드라이브 등)에도 복사해 둔다. `docker compose ... down -v`는 볼륨(DB)을 지우므로 쓰지 않는다(`down`만).

## 6. 배포 후 체크리스트

`https://내도메인`에서 확인한다. (마이크는 HTTPS에서만 동작한다.)

- [ ] HTTP로 접속하면 HTTPS로 넘어가고 인증서 경고가 없다
- [ ] 가입(인증 메일 도착) → 로그인 → 새로고침해도 로그인 유지(쿠키 `Secure`)
- [ ] 마을 3D 화면, 건물 입장
- [ ] 오늘의 학습: 지문·문제 표시, 완료 처리
- [ ] 학습을 끝낸 뒤 주민과 대화(Gemini 응답, 한국어 번역)
- [ ] 대화 중 일본어 드래그 → 단어장 저장
- [ ] TTS 음성 재생(키가 없으면 브라우저 음성)
- [ ] 마이크 입력 허용 팝업이 뜨고 음성 인식이 된다
- [ ] 소셜 로그인(설정한 경우)
- [ ] 외부에서 `http://VM_IP:8080`, `VM_IP:5432`가 열리지 않는다

## 문제 해결

- 인증서가 안 나온다: DNS A 레코드가 VM IP인지, 80·443 방화벽이 열렸는지, `logs web` 확인.
- 가입 메일이 안 온다: Resend 도메인 인증 전에는 본인 계정 이메일로만 발송된다(`logs backend`에서 발송 실패 확인).
- 백엔드가 계속 재시작한다: `logs backend` 확인(DB 비밀번호 불일치는 `DB_PASSWORD`를 바꾼 경우다. 기존 볼륨은 처음 만든 비밀번호를 유지한다).
