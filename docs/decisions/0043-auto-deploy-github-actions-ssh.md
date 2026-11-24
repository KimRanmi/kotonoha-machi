# 0043. 자동 배포: GitHub Actions가 VM에 SSH로 접속

- 상태: 구현·운영 중. 방식(A)은 사용자 승인 받음.

## 결정

- master에 머지돼 기존 CI(`ci.yml`)가 **성공하면**(`workflow_run`, push 이벤트만) `.github/workflows/deploy.yml`이 VM에 SSH로 접속해 `git pull --ff-only` → `docker compose -f docker-compose.prod.yml up -d --build` → `docker image prune -f`를 실행한다.
- 서드파티 액션 없이 `ssh`만 쓴다. 접속 정보(`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`)는 GitHub Secrets에만 둔다. 키는 이 용도 전용으로 새로 만든다.
- 배포가 겹치지 않게 `concurrency`로 하나씩 실행한다. 빌드마다 남는 옛 이미지는 디스크(20GB)를 지키려고 정리한다.
- `.env`(비밀)는 git에 없으므로 자동 배포 대상이 아니다.

## 대안과 이유

- **레지스트리 방식**(GitHub에서 이미지를 빌드해 Artifact Registry에 올리고 VM이 pull): VM 빌드 부하는 줄지만 레지스트리·권한 설정이 늘어 이번엔 과하다.
- **수동 배포 유지**: 가장 안전하지만 매번 SSH 접속해서 직접 쳐야 한다.
- GitHub IP가 고정이 아니라 방화벽을 IP로 제한할 수 없어 22번 포트는 인터넷에 열린 채 키 로그인만 허용한다.

## 한계

- VM에서 빌드하므로 배포 중 몇 분간 느려지고, 빌드 실패 시 서비스가 멈출 수 있다(롤백 자동화 없음).
- 배포 후 상태 점검은 `docker compose ps` 출력 확인뿐이다.
