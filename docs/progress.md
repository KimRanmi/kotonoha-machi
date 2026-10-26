# 진행 상황

v2 작업 로그. 각 항목은 "무엇을 했는지 / 어떻게 검증했는지 / 다음에 할 일"을 간단히 남긴다.
아직 확정되지 않은 내용은 확정된 것처럼 적지 않는다.

## 2026-10-17

- v1 저장소를 `master`로 정리하고(미머지 작업 머지, 낡은 브랜치/워크트리 삭제), v2 작업을
  위한 `v2` 브랜치를 생성했다.
- 기술 스택을 결정했다: Vite+React+TypeScript+Three.js(프런트), Java 25+Spring Boot
  4.x(백엔드), PostgreSQL+Flyway(DB), Gemini API(백엔드 경유). 자세한 이유는
  `docs/decisions/0001-tech-stack.md`.
- `CLAUDE.md`를 v2 개발 규칙(기술 스택, 학습 원칙, 문서화 원칙)으로 교체했다.
- v1 전체 작업은 `v1` 브랜치(로컬/`origin/v1`)로 보존하고, `master`는 v1 코드와
  스택별 설정 파일(Next.js/Gradle/Docker 등)을 전부 지워 비웠다. 안 쓰는 리모트
  브랜치도 정리했다.
- 다음 할 일: 새 프런트엔드/백엔드 골격을 가장 작은 단위로 각각 띄워서 검증한다
  (빈 Vite+React+TS 앱 실행, 빈 Spring Boot 4 앱이 Postgres에 Flyway 첫 마이그레이션을
  적용하는지 확인).

## 2026-10-19

- `.claude/`에 PM 파이프라인(`/pipeline` 커맨드)과 서브에이전트 5개(developer, qa-tester,
  code-reviewer, ci-validator, notion-logger)를 추가했다. 서브에이전트는 서로를 호출할 수
  없어 총괄 PM 역할은 슬래시 커맨드로 구성했다.
- 안 쓰는 git worktree 2개(`project-structure-react-7b5a53`, `v1-demo`)와 `.idea/`를
  정리했다(둘 다 이미 master에 merge된 브랜치였고, 커밋 안 된 변경은 사용자 확인 후 삭제).
- `docs/requirements.md`에 확정된 기능 목록을 기준으로 `frontend/`, `backend/` 골격을
  새로 만들고 둘 다 실제로 빌드/테스트까지 돌려서 검증했다.
  - **프런트엔드** (`frontend/`): Vite + React 19 + TypeScript + React Router + Three.js +
    wanakana. 라우트는 로그인/회원가입/프로필/마을/테마 학습/대화/단어장 7개 화면에 맞춰
    자리만 잡아두었고(실제 기능은 비움), 백엔드 호출용 `api/client.ts`를 추가했다. 테스트는
    Vitest + Testing Library, 포맷터는 Prettier(2-space, single quote 등 구글 스타일에
    맞춘 설정)로 구성했다. `npm run dev`/`build`/`test`/`lint` 모두 통과 확인.
  - **백엔드** (`backend/`): Java 25 툴체인 + Spring Boot 4.1.1 + Gradle(Groovy DSL).
    패키지는 기능 단위로 나눴다(auth/user/theme/vocabulary/chat/resident/town/common),
    각 패키지에 역할을 설명하는 `package-info.java`만 두고 실제 클래스는 기능 구현 시점에
    채운다. Checkstyle(구글 스타일, `config/checkstyle/checkstyle.xml`)과
    Spotless(Google Java Format)를 설정했다. Testcontainers로 실제 Postgres를 띄워
    Spring 컨텍스트 로드 + Flyway 적용을 확인하는 스모크 테스트를 추가했다.
    `./gradlew build`, `./gradlew spotlessApply`, `./gradlew checkstyleMain` 모두 통과 확인.
- 더 유효하지 않은 `CLAUDE.md`의 "v1 → v2 전환 상태" 절을 지웠다(`AGENTS.md`도 이미 삭제된
  상태였고, 이번에 새 골격이 만들어져 조건이 충족됐다).
- **골격을 만들며 겪은 실제 환경 문제와 해결(기록해두는 이유: 같은 문제를 다시 만났을 때
  버전을 임의로 바꾸지 않고 이 기록을 먼저 보기 위해)**:
  - 로컬 Node가 20.11.1인데 Vite 7/8은 Node 20.19+를 요구해서 스캐폴딩이 실패했다. Vite 7의
    변경점(Environment API)은 이 프로젝트(순수 SPA)에 영향이 없어 Node를 올리지 않고
    Vite 6.x로 유지하기로 사용자와 합의했다.
  - npm 10.2.4가 vitest 4의 optional peer dependency 구성을 처리하다 내부 오류
    (`arborist`의 `edgesOut` null 참조)를 내서 설치가 안 됐다. `--legacy-peer-deps`로
    우회했고 `frontend/.npmrc`에 고정해뒀다.
  - jsdom 30은 의존성(`html-encoding-sniffer` → `@exodus/bytes`)이 ESM 전용이라 Node
    20.11.1에서 `require(esm)` 오류가 났다. jsdom 25로 낮춰서 해결(이 버전은 Node 18+만
    요구).
  - 처음 설치된 vitest 3.2.7의 의존성(`tinypool`)에 RCE 등급 취약점이 있어서(`npm audit`)
    Node 20과 호환되는 vitest 4.1.12로 올렸다.
  - Spring Initializr(start.spring.io)가 Spring Boot 4.1.1 BOM 해석에서 500 에러를 내서
    (서비스 쪽 문제), `build.gradle`을 직접 작성했다.
  - Spring Boot의 `spring-boot-dependencies` BOM이 내부적으로 참조하는
    `org.testcontainers:testcontainers-bom`은 `io.spring.dependency-management`
    플러그인도, Gradle 네이티브 `platform()` import도 자동으로 펼쳐주지 않았다(중첩 BOM
    한계). 결과적으로 `io.spring.dependency-management`는 쓰지 않고, Spring Boot
    BOM과 testcontainers-bom을 각각 명시적으로 `platform(...)`으로 추가했다.
  - Testcontainers 2.0부터 모듈 아티팩트명이 `testcontainers-` 접두사로 바뀌었다(예:
    `org.testcontainers:junit-jupiter` → `org.testcontainers:testcontainers-junit-jupiter`).
    옛 이름으로 선언해서 의존성을 못 찾는 에러가 났고, 새 이름으로 고쳐서 해결했다.
  - 구글 체크스타일 설정(`google_checks.xml`)을 checkstyle GitHub의 `master` 브랜치에서
    받았다가, 아직 릴리스되지 않은 체크(`AvoidModuleImport`)가 포함돼 있어 빌드가 깨졌다.
    실제 쓰는 Checkstyle 버전(13.4.2)의 태그에서 다시 받아 해결했다.
- `auth` 패키지(로그인/회원가입/이메일 인증)에 컨트롤러·서비스·DTO·Spring Security 연동
  클래스가 평평하게 섞여 있던 걸 역할별 하위 패키지로 나눴다: `auth/controller`,
  `auth/service`, `auth/dto`, `user/repository`. 엔티티(`User`, `UserStatus`)는 레이어가
  아니라 도메인 모델이라 하위 패키지로 옮기지 않고 도메인 패키지 루트에 그대로 뒀다.
  아직 구현 전인 `common`은 특정 기능 도메인이 아닌 전역 공통 코드라 이 분리 대상에서
  뺐다. 기준과 비교한 대안은 `docs/decisions/0003-package-structure.md`에 기록했고,
  다음 파이프라인 실행부터 반영되도록 `CLAUDE.md`와 `developer`/`code-reviewer`
  서브에이전트 설명도 함께 갱신했다.
  - 검증: `./gradlew compileJava compileTestJava`, `./gradlew checkstyleMain
    checkstyleTest` 통과(기존에도 있던 체크스타일 경고 몇 개는 이번 변경과 무관해서 그대로
    둠). `./gradlew test`는 18개 중 17개 통과, `AuthControllerIntegrationTest`의
    로그인 성공 흐름 테스트 1개가 `JSESSIONID` 쿠키를 못 찾아 실패했다. 패키지 이동과는
    무관한 실패로 보인다(세션 쿠키 `secure` 플래그를 꺼도 동일하게 실패했고, 코드 로직은
    건드리지 않았다). 원인은 아직 못 찾았다.
- 로그인/회원가입 기능을 `/pipeline`으로 구현했다. 세션 기반 인증
  (`docs/decisions/0002-session-auth.md`), 닉네임 중복 확인, 이메일 인증 코드(지금은 로그로
  출력, 실제 발송은 다음 작업)까지 포함한다.
  - QA: 1차 실패 — Spring Boot 4부터 Flyway 자동설정이 별도 모듈
    (`spring-boot-starter-flyway`)로 분리됐는데 `build.gradle`에 빠져있어서 Spring
    컨텍스트가 아예 기동하지 못했다(`SchemaManagementException: missing table [users]`).
    추가해서 해결. 재시도(정책상 1회) 결과 또 실패 — 바로 위 항목에서 "원인을 못 찾았다"고
    적은 그 `JSESSIONID` 쿠키 테스트다. 원인은 MockMvc의 한계였다: MockMvc는 실제 서블릿
    컨테이너(Tomcat)를 안 띄우고 가짜 요청/응답 객체만 쓰기 때문에, 컨테이너가 암묵적으로
    붙여주는 `Set-Cookie: JSESSIONID` 헤더가 테스트에 나타나지 않는다(로그인 성공 자체는
    정상 동작). 정책상 재시도를 소진해 한 번 중단했지만, 사용자가 해당 assertion 제거를
    지시해 반영 후 재확인 — 백엔드 17개, 프런트엔드 11개 전부 통과.
  - 코드 리뷰: 1차 `REVIEW_PASSED`. 비차단 권고 3건: 프런트엔드 로그인 필수 라우트 가드
    미구현, 이메일 인증코드 무차별 대입 방지(시도 횟수 제한) 없음, CSRF 비활성화는 프런트/
    백엔드가 same-site로 배포된다는 전제이므로 배포 도메인 확정 시 재확인 필요.
  - CI: 1차 실패(`spotlessJavaCheck`, Google Java Format 불일치) → `spotlessApply`로 자동
    수정 → 재시도(1/2) 통과.
  - 노션 기록 단계에서 `.claude/agents/notion-logger.md`의 도구 이름이 이 환경의 실제 MCP
    접두사(`mcp__claude_ai_Notion__`)와 달라 서브에이전트 생성 자체가 거부됐다. 파일은
    고쳤지만 세션 중엔 에이전트 정의가 캐시돼 있어 이번엔 PM이 직접 노션에 기록했다. 다음
    세션(새 세션 시작)부터는 정상 동작해야 한다.
- 자동화 테스트가 전부 통과한 뒤에도 실제로 앱을 띄워서 확인했더니, 테스트로는 못 잡는
  환경 문제가 두 가지 있었다:
  - v1 시절부터 떠 있던 Postgres 컨테이너(`kotonoha-db-1`)가 다른 스키마/자격증명
    (`kotonoha`/`kotonoha`)으로 남아있었다. 지우고 `backend/docker-compose.yml`을 새로
    만들어 v2 설정(`kotonoha_machi`/`kotonoha_machi`)으로 재현 가능하게 했다.
  - 이미 삭제한 `v1-demo` 워크트리에서 하루 넘게 떠 있던 고아 백엔드 프로세스가 8080 포트를
    막고 있었다. 종료함.
  - 새 DB로 백엔드/프런트를 직접 띄우고 curl로 회원가입 → 인증 전 로그인 거부 → 이메일
    인증 → 로그인(세션 쿠키가 `HttpOnly; SameSite=Lax`로 실제로 발급되는 것까지 확인—
    MockMvc 테스트가 못 봤던 바로 그 부분) → 로그아웃까지 전부 실제로 확인했다. 프런트
    (5173)/백엔드(8080) 간 CORS preflight도 실제 브라우저가 보낼 요청 그대로 재현해 통과를
    확인했다. 다만 이 환경의 브라우저 도구가 localhost에 접근하지 못해 화면 렌더링/클릭은
    직접 확인하지 못했다(사용자가 `http://localhost:5173/signup`에서 육안으로 확인 필요).
- Javadoc 주석이 세로로 과도하게 줄바꿈되는 문제를 해결했다. Google Java Format은 줄 폭
  (100자) 설정이 아예 불가능해서, 포크인 Palantir Java Format(`formatJavadoc(false)`)으로
  바꿔 Javadoc만 포맷터 대상에서 뺐다(처음엔 Palantir도 폭을 120/140자로 늘릴 수 있을
  거라 생각했지만, 실제 라이브러리를 까보니 그것도 불가능했다 — 구글 스타일 계열 포맷터는
  전부 100자 고정). 일반 코드(메서드/생성자 매개변수 등)는 여전히 100자 제한을 따른다.
  Checkstyle의 `LineLength`도 Javadoc 블록 안은 검사하지 않도록 예외를 추가했다. 자세한
  과정은 `docs/decisions/0004-javadoc-formatting.md`.
- 다음 할 일: 프런트엔드 로그인 필수 라우트 가드 추가, 이메일 인증코드 시도 횟수 제한
  고려, 그다음 기능(프로필 또는 테마 학습)을 `/pipeline`으로 계속 구현한다.

## 2026-10-22

- 테마 학습(섹션 5) 1번 항목 — 한자→단어→표현→예문→독해 단계 진행 게이트 — 를 백엔드만
  구현했다(`feature/vibe-theme-stage-gate` 브랜치). 실제 한자/단어/표현/예문/독해
  콘텐츠(섹션 5의 2번 항목)와 정답 채점(3회 오답 힌트 등)은 범위 밖으로 남기고, "이전
  단계를 끝내야 다음으로 진행"이라는 순서 규칙만 구현했다 — 사용자와 논의해 이번 범위를
  좁게 잡기로 확인했다.
  - `theme` 패키지에 `Theme`/`ThemeProgress` 엔티티, `ThemeStage` enum(KANJI → WORD →
    EXPRESSION → EXAMPLE → READING 고정 순서), `ThemeService`, `ThemeController`를
    `auth`/`user` 패키지와 같은 구조(controller/service/dto/repository 하위 패키지,
    엔티티는 루트)로 추가했다. `GET /api/themes`(목록+내 진행 상태), `POST
    /api/themes/{themeId}/stages/{stage}/complete`(단계 완료, 건너뛰면 409) 2개 API.
  - 테마 자체는 아직 콘텐츠가 없어 제목만 가진 샘플 테마 2개를 마이그레이션(`V6`)으로
    시드했다.
  - 검증: `./gradlew spotlessApply`, `./gradlew test`(새 단위/통합 테스트 포함 전체 통과),
    `./gradlew build -x test` 통과. `code-reviewer` 서브에이전트로 패키지 구조/컨벤션/게이트
    로직 리뷰 — `REVIEW_PASSED`.
  - 리뷰에서 지적된 비차단 사항(한계로 기록): 같은 사용자가 같은 테마의 진행 상태를 처음
    만드는 요청 두 개를 동시에 보내면, DB의 유니크 제약(`uq_theme_progress_user_theme`)이
    중복 행 생성은 막아주지만 서비스 코드가 그 충돌(`DataIntegrityViolationException`)을
    따로 잡지 않아 패자 쪽 요청이 500으로 끝난다. 데이터는 깨지지 않지만, 재시도 없이
    실패로 끝나는 사용자 경험 공백이라 다음에 개선할 수 있다.
  - 다음 할 일: 섹션 5의 2번 항목(한자·단어·표현의 실제 뜻/읽는 법을 DB에서 가져오기) —
    콘텐츠 출처(자체 제작 vs 공개 JLPT 리스트)가 아직 미정이라 구현 전에 논의 필요. 이번
    게이트 API를 쓰는 프런트엔드 화면은 아직 없다.

## 2026-10-26

- 이전 세션에서 로그를 남기지 못하고 넘어간 작업들: 캐릭터 아바타 꾸미기 백엔드/프런트엔드
  구현(`docs/decisions/0008-avatar-customization.md`), `/pipeline` 커맨드를 삭제하고 그
  역할을 `CLAUDE.md`의 Autonomous Git & Quality Verification Workflow로 통합, 테마 학습
  콘텐츠(한자·단어·표현·예문) 데이터를 kanjiapi.dev·Tatoeba에서 1회성으로 가져와 Flyway에
  심는 작업과 JLPT N1~N3 수준으로 교체(`docs/decisions/0012-theme-content-data-source.md`),
  테마 학습 단계 게이트 프런트엔드(`ThemeLearningPage`) 최초 구현(콘텐츠는 placeholder),
  프로필 화면 캐릭터/계정 탭 분리.
- 테마 학습(섹션 5) "학습 중인 단어·표현마다 레벨(N3~N1) 화면 표시" 항목을
  `feature/vibe-theme-stage-content-display` 브랜치로 구현했다. `ThemeLearningPage`가
  단계가 바뀔 때마다 `GET /api/themes/{themeId}/stages/{stage}/content`를 호출해 한자(음독·
  훈독·뜻)/단어·표현(표기·읽는 법·뜻)/예문(일본어 문장·번역)과 JLPT 레벨 배지를 렌더링하도록
  바꿨다. 독해(READING)는 백엔드에 콘텐츠가 아직 없어(0012 문서 참고) placeholder를
  유지한다.
  - 검증: `npm run lint`(경고 1건 — useEffect 의존성 배열에 `theme` 전체를 넣어 해결),
    `npm run test`(58개 전부 통과, 콘텐츠 렌더링/로딩/에러/READING 분기 테스트 추가),
    `npm run build` 통과. `code-reviewer` 서브에이전트 리뷰 `REVIEW_PASSED`(경미한 비차단
    제안 2건: advance 시 재조회를 직접 검증하는 테스트 부재, 리스트 key로 index 사용 — 둘 다
    지금 범위에서는 반영하지 않음).
- 위 콘텐츠 화면 표시 작업을 "콘텐츠를 쭉 보여주고 다음 버튼만 누르면 넘어가는" 화면으로
  만들었는데, 사용자가 바로 지적했다 — 요구사항은 "정답을 맞혀야 진행하는 정확도 게이트"인데
  그냥 단어를 외우라고 늘어놓는 화면이 됐다는 것. 문제 형식(타이핑 vs 객관식)을 사용자에게
  확인해 **객관식**으로 정하고 다시 구현했다.
  - 백엔드: `ThemeKanjiItemResponse`/`ThemeVocabularyItemResponse`/`ThemeExampleItemResponse`
    3개를 `ThemeQuizItemResponse`(prompt/options/correctAnswer/jlptLevel) 하나로 통합.
    `ThemeService`가 같은 단계의 다른 항목들(테마 무관, 전체 데이터)에서 오답 보기를 무작위로
    최대 3개 뽑아 정답과 섞는다. 지금 샘플 데이터가 적어서(표현·예문은 테마당 2개뿐) 보기가
    4개보다 적게 나올 수 있다 — 데이터 양의 한계로 기록.
  - 프런트엔드: `ThemeLearningPage`를 콘텐츠 나열 화면에서 한 문제씩 푸는 퀴즈 플로우로
    재작성. 오답은 재시도(3회까지는 안내만), 3회째부터 정답을 보여주되 사용자가 정답을 직접
    선택해야 다음으로 진행(자동으로 안 넘김). 그 단계의 모든 문제를 맞혀야 하단 "다음"(단계
    완료 API) 버튼이 활성화된다. 항상 비활성화였던 "힌트" 버튼은 제거(힌트가 이제 3회 오답
    시 자동으로 뜨는 방식이라 별도 버튼이 의미 없어짐).
  - 검증: 백엔드 `./gradlew spotlessApply test build`(전체 통과, 기존 통합 테스트 2개를 새
    응답 모양에 맞게 갱신). 프런트엔드 `npm run lint`/`npm run test`(62개)/`npm run build`
    통과. `code-reviewer` 1차 리뷰에서 "문제가 여러 개일 때 전부 맞혀야 다음 버튼이 열리는지"
    검증이 1개짜리 테스트만으로는 증명되지 않는다는 `REVIEW_FAILED`를 받아, 2개짜리 퀴즈
    테스트를 추가하고 재검토 `REVIEW_PASSED`.
  - 다음 할 일: 자유 순서 테마 진행, 종합 복습, 발음 체크 등 섹션 5의 남은 항목.
