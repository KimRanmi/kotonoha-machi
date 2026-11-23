# 0022. GitHub Actions로 PR마다 CI 실행

- 날짜: 2026-11-09
- 상태: 구현함 (실제 Actions 실행 결과는 PR에서 확인)

## 배경
지금까지 검증은 로컬 명령과 에이전트(qa-tester, ci-validator)에 의존했고, PR에는 자동 체크가 하나도 없었다.
저장소가 비공개이고 무료 플랜이라 브랜치 보호 규칙(통과 필수, 승인 필수)은 쓸 수 없다(GitHub가 Pro 또는 공개를 요구).

## 결정
- `.github/workflows/ci.yml`을 추가해 PR과 `master` 푸시마다 CLAUDE.md의 검증 명령어를 자동으로 돌린다.
  - 백엔드: `./gradlew spotlessCheck test` (JDK 25 Temurin, Gradle 캐시). 통합 테스트의 Testcontainers는 ubuntu runner에
    기본으로 들어 있는 Docker를 쓴다.
  - 프런트: `npm ci` → `prettier --check` → `lint` → `build` (Node 22, 프런트 Dockerfile과 같은 버전, npm 캐시).
- 두 작업은 서로 독립이라 병렬로 실행한다. 같은 브랜치에 새 커밋이 오면 이전 실행은 취소하고, 권한은 `contents: read`만 준다.
- 새 외부 서비스나 라이브러리는 없다(GitHub 내장 기능, 공식 `actions/*` 액션만 사용).
- Checkstyle은 넣지 않았다. 경고만 내고 빌드를 깨지 않는 설정이며 경고가 수백 건이라 실패 조건으로 두기 어렵다.

## 확인한 것
- 키·`.env`·환경변수가 없는 새로 내려받은 복사본에서 같은 명령이 통과했다(백엔드 173개 테스트 실패 0, 프런트 통과). 앱 설정의
  비밀 값(Gemini, TTS, OAuth)은 모두 빈 기본값이 있어 GitHub Secrets가 필요 없다.

## 한계 (알고 둔 것)
- 비공개 + 무료 플랜에서는 "CI가 실패하면 병합을 막는" 보호 규칙을 걸 수 없다. CI는 실패를 PR에 보여 주는 경고등이지 차단 장치가
  아니다. 병합 차단이 필요해지면 저장소 공개나 플랜 변경이 필요하며 그건 별도 결정이다.
- 비공개 저장소의 무료 Actions 사용 시간은 월 2,000분이다. 실제 소요 시간은 아직 모른다.
- Java 25는 `setup-java`가 Temurin 25를 내려받을 수 있다는 전제다. 실제 Actions 실행으로 확인한다.
- 로컬 Node(24)와 CI Node(22)가 다르다. 프런트 Dockerfile 기준(22)을 따랐다.
