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
- 독해(READING) 단계를 임시로 퀴즈 게이트에 연결했다(`feature/vibe-theme-stage-content-display`
  브랜치 계속). 요구사항이 확정한 최종 방식(RAG: pgvector 검색 + Gemini로 이해 문제 생성)은
  지문 코퍼스 출처가 아직 미정이고 Gemini API를 실제로 호출하는 코드(`chat` 패키지)도 아직
  없어서 당장 구현할 수 없다는 점을 사용자에게 먼저 확인받아, 이전 커밋(`V9` 마이그레이션)이
  심어둔 테스트용 지문 데이터를 한자·단어·표현·예문과 같은 방식(지문이 문제, 번역이 정답인
  객관식)으로만 연결하기로 범위를 좁혔다 — RAG 인프라는 코퍼스 출처가 정해지면 나중에 다시
  다룬다.
  - 백엔드: `ThemeReadingPassage` 엔티티·`ThemeReadingPassageRepository`를 `theme` 패키지에
    추가하고, `ThemeService.getStageContent`의 `READING` 분기가 501 예외를 던지던 걸 지문
    번역 보기 목록을 만들도록 바꿨다. 더는 쓰이지 않는 `ThemeErrorCode.STAGE_CONTENT_NOT_AVAILABLE`는
    제거했다.
  - 프런트엔드: `ThemeLearningPage`가 `READING` 단계만 콘텐츠 조회를 건너뛰고 "콘텐츠 준비
    중입니다" 문구를 보여주며 다음 버튼을 바로 활성화하던 특례를 제거해, 다른 단계와 똑같이
    퀴즈를 모두 맞혀야 다음으로 진행하게 했다.
  - 검증: 백엔드 `./gradlew spotlessApply test`(기존 501 테스트 2개를 실제 콘텐츠 검증으로
    교체) 통과. 프런트엔드 `npm run lint`/`npm run test`(62개, READING 관련 테스트 2개를 새
    동작에 맞게 갱신)/`npm run build` 통과.
  - 다음 할 일: 독해 지문 코퍼스 출처 결정(별도 결정 문서), pgvector 확장 추가, Gemini API
    클라이언트 구축 — 이 세 가지가 정리되면 지금의 임시 데이터 연결을 실제 RAG 방식으로
    교체한다.

## 2026-10-29

- 독해 지문 코퍼스 출처를 조사했으나 적당한 공개 데이터셋을 찾지 못했다(OpenJLPT 등은
  어휘·한자 리스트뿐이고, Tadoku Supporters는 레벨별 자료는 있지만 재사용 라이선스가
  명시돼 있지 않았다). 사용자와 확인해 이 항목은 당장 결정하지 않고 보류하기로 했다 —
  독해(READING) RAG 작업은 계속 막혀 있다.
- 대신 섹션 5의 다른 미구현 항목 중 요구사항이 이미 확정돼 있고 막힌 선행 조건이 없는
  두 가지를 `feature/vibe-theme-stage-content-display` 브랜치에서 구현했다.
  - **테마 자유 순서 진행**: 코드를 확인해보니 `ThemeProgress`가 테마별로 완전히 독립된
    진행 상태라 이미 자유 순서가 보장돼 있었다 — 추가 구현 없이 체크리스트만 갱신했다.
  - **"오늘의 학습" 배너 하루 1회 제한**: `GET /api/themes/today-recommendation`을
    추가했다. `ThemeService.getTodayRecommendedTheme`이 사용자의 `ThemeProgress` 중
    오늘(한국 시간, `Asia/Seoul`) 완료된 게 있으면 빈 값(204)을, 없으면 미완료 테마 중
    하나를 돌려준다. "오늘"은 별도 컬럼 없이 기존 `updated_at`으로 판단한다(요구사항
    확정 방식). 프런트엔드 `TownPage`는 기존에 쓰던 `getThemes().find(!completed)`(항상
    아무 미완료 테마나 추천)를 이 새 엔드포인트 호출로 교체했다.
  - 검증: 백엔드 `./gradlew spotlessApply test`(전체 통과, 기존 `ThemeServiceTest`는 수정
    없이 통과). 프런트엔드 `npx prettier --write .`/`npm run lint`/`npm run test`(61개,
    `TownPage.test.tsx`를 새 API에 맞게 갱신)/`npm run build` 통과.
  - 다음 할 일: 독해 코퍼스 출처는 여전히 미정으로 보류 중. 섹션 5의 남은 항목(종합 복습,
    학습 진행 상황 서버 저장 — 이미 `ThemeProgress`로 저장되고 있어 재검토 필요, 발음
    체크)을 계속 진행한다.
- 섹션 5의 남은 두 항목(종합 복습, 발음 체크)을 사용자와 상의해 하나로 합쳐 구현했다 — 테마의
  마지막 라운드를 "배운 표현을 소리 내어 따라 읽는 발음 체크"로 만들면 두 요구사항을 동시에
  만족한다는 제안을 사용자가 승인했다. 같은 브랜치에서 계속 작업했다.
  - 설계 확인(2건, 사용자 승인): ① 이 라운드를 `ThemeStage`에 `REVIEW`라는 6번째 단계로
    추가해 기존 게이트 구조에 그대로 편입시킬지(승인) vs 완료 후 비필수 보너스로 둘지 →
    REVIEW 추가로 결정. ② 따라 읽을 콘텐츠 범위를 단어+표현만으로 좁힐지 vs 한자·단어·
    표현·예문 전부로 할지 → 전부로 결정.
  - 백엔드: `ThemeStage`에 `REVIEW`를 추가해 READING 다음 마지막 단계로 삼았다(이제 REVIEW를
    끝내야 테마가 `completed`된다). `ThemeService.getStageContent`의 REVIEW 분기가 테마의
    한자·단어(WORD)·표현(EXPRESSION)·예문을 순서대로 모아 `ThemeQuizItemResponse`로 돌려주는데,
    REVIEW는 선택지(`options`)가 항상 빈 목록이고 `correctAnswer`가 뜻이 아니라 `prompt`와
    같은 값(음성 인식 결과와 비교할 기준 문자열)이라는 점이 다른 단계와 다르다 — 새 DTO를
    만들지 않고 기존 `ThemeQuizItemResponse`를 이 용도로 재사용했다(Javadoc에 명시).
  - 프런트엔드: `lib/speechRecognition.ts`(신규)가 Web Speech API(`SpeechRecognition`/
    `webkitSpeechRecognition`, 표준 TS DOM 타입에 없어 최소한의 타입을 직접 선언)를 감싸
    일본어(`ja-JP`) 음성 한 번을 텍스트로 바꿔준다. `ThemeLearningPage`는 REVIEW 단계일 때
    기존 선택지 버튼 목록 대신 "🎤 말하기" 버튼을 보여주고, 인식된 텍스트와 정답(공백만
    제거하고 비교)이 맞으면 기존 정답 처리 흐름(다음 문제/완료 버튼)을 그대로 재사용한다.
    음성 인식을 지원하지 않는 브라우저에서는 안내 문구를 보여주고 버튼을 비활성화한다.
  - 검증: 백엔드 `./gradlew spotlessApply test`(전체 통과 — 기존 "READING까지 끝내면 완료"
    테스트를 "READING은 REVIEW로 넘어감 + REVIEW까지 끝내면 완료" 2개로 나누고, REVIEW 콘텐츠
    테스트를 단위/통합 양쪽에 추가). 프런트엔드 `npx prettier --write .`/`npm run lint`/
    `npm run test`(66개, REVIEW 단계 렌더링·정답/오답·음성 인식 실패·브라우저 미지원 케이스
    5개 추가)/`npm run build` 통과.
  - 알려진 한계: Web Speech API가 Chrome 계열에서만 안정적으로 동작해, 다른 브라우저
    사용자는 이 라운드를 진행할 방법이 없다(텍스트 대체 입력 등 미구현, 다음에 재검토).
  - 다음 할 일: 독해 코퍼스 출처 결정은 여전히 보류 중. 섹션 5 체크리스트가 전부
    끝나(독해 RAG 제외) 섹션 6(주민과의 대화) 등 다른 기능으로 넘어갈 수 있다.
- REVIEW 발음 체크를 정확히 일치해야만 통과하는 방식에서, 듀오링고류로 **정확도(%) 채점 +
  80% 기준 통과**로 바꿨다 — 사용자가 "정확히 똑같지 않아도 몇 % 맞았는지 보여주고 80%
  넘으면 통과, 아니면 재시도"를 요청해 반영했다. 같은 브랜치에서 계속 작업했다.
  - 프런트엔드만 변경(백엔드 콘텐츠 API는 그대로). `lib/textSimilarity.ts`(신규)가
    레벤슈타인 거리로 두 문자열의 글자 단위 유사도(0~1)를 계산한다. `ThemeLearningPage`가
    음성 인식 결과와 정답의 정확히 일치 여부 대신 이 유사도를 계산해 0.8(80%) 이상이면
    정답 처리, 미달이면 "정확도 N%였습니다. 80% 이상이어야 통과합니다. 다시 말해보세요."를
    보여준다. 정답 처리 시에도 "정확도 N%로 정답입니다!"로 퍼센트를 같이 보여준다.
  - 검증: 프런트엔드 `npx prettier --write .`/`npm run lint`/`npm run test`(67개, 80%
    이상이면 완전 일치 없이도 통과하는 케이스·미달 시 퍼센트 안내 케이스로 기존 REVIEW
    테스트 2개를 교체)/`npm run build` 통과. 백엔드 변경 없음.
  - 한계: 글자 단위 텍스트 유사도라 발음의 음소·억양 품질과는 직접 관련이 없다(예: 완전히
    다른 단어를 말해도 글자 수·구성이 비슷하면 우연히 높은 정확도가 나올 수 있음) — 요구사항
    문서가 처음부터 "정밀한 발음 채점은 아니다"로 범위를 좁혀둔 것과 일치하는 한계로 기록.
- REVIEW 발음 체크가 음성 인식 결과를 한자 표기와 읽는 법(가나) 둘 다와 비교하도록 개선하고,
  향후 테마 콘텐츠 추가를 위한 임포트 도구를 새로 만들었다. 같은 브랜치에서 계속 작업했다.
  - 문제: 한자·단어·표현은 이미 읽는 법 컬럼이 있어 음성 인식이 한자로 인식하든 가나로
    인식하든 둘 중 하나와 비교해 맞힐 수 있었지만, 예문(`theme_example`)만 읽는 법이 없어
    한자 표기로만 비교됐다 — 음성 인식이 같은 발음을 가나로 인식하면 억울하게 오답 처리됐다.
  - 백엔드: `theme_example`에 `reading` 컬럼 추가(`V10` 마이그레이션, 기존 예문 4개는 사람이
    직접 음독해 적은 값으로 백필) 후 `ThemeExample`/`ThemeQuizItemResponse`/`ThemeService`에
    전달 경로 추가. `toReviewItems`가 한자·단어·표현·예문 각각의 읽는 법을 `reading` 필드로
    함께 내려준다(한자는 `onReading`의 첫 번째 읽는 법만 사용).
  - 프런트엔드: `textSimilarity.ts`에 가나 통일용 `toHiragana`(가타카나→히라가나 코드포인트
    변환) 추가. `ThemeLearningPage`의 `calculateSpeechAccuracy`가 인식 결과를 한자 표기·
    읽는 법(둘 다 히라가나로 통일) 각각과 비교해 유사도를 계산한 뒤 더 높은 쪽을 채점에
    사용한다.
  - 검증: 백엔드 `./gradlew spotlessApply test`, 프런트엔드
    `npx prettier --write .`/`npm run lint`/`npm run test` 모두 통과. 초기 마이그레이션이
    V7 시절 예문 문장을 `WHERE` 조건으로 써서 V8이 교체한 실제 예문과 안 맞아 테스트가 50개
    실패했던 버그를 고쳤다(V8의 실제 예문으로 `WHERE` 조건 수정).
  - 신규 도구 `scripts/import-theme-content/`(백엔드/프런트엔드 앱과 완전히 분리, 1회성
    개발 도구): 향후 새 테마 콘텐츠를 추가할 때, Gemini가 "어울리는 표기"만 추천하고
    kanjiapi.dev·Tatoeba가 실제 뜻/읽는 법/JLPT 레벨/예문을 조회·검증(N1~N3 범위 밖이면
    자동 거부)한 뒤 사람이 `drafts/*.json`을 검토·승인해야 Flyway 마이그레이션 SQL이
    생성되는 파이프라인이다. "AI가 콘텐츠를 짓지 않는다" 제약을 지키기 위해 뜻/읽는 법/레벨
    같은 사실 데이터는 전부 실제 사전·코퍼스 API로만 조회하고, Gemini는 어떤 데이터도 직접
    만들지 않는다(후보 표기 제안과 Tatoeba 검색 키워드 제안만 담당).
  - 검증 범위: `kanjiApi.mjs`(kanjiapi.dev 실제 호출), `tatoebaApi.mjs`(Tatoeba 실제 호출),
    `furigana.mjs`(kuromoji 실제 호출), `finalize.mjs`(손으로 만든 샘플 draft로 SQL 생성
    확인, 버전 번호 자동 증가 확인) 모두 실제로 호출해 검증했다. `gemini.mjs`와
    `propose.mjs`의 Gemini 호출 경로는 API 키가 없어 문법 검사만 하고 실제 호출은 검증하지
    못했다 — 사용자가 `scripts/import-theme-content/.env`에 본인 `GEMINI_API_KEY`를 넣고
    `npm run propose`를 직접 한 번 실행해 확인해야 한다.

## 2026-11-04

- 프런트엔드 테스트(Vitest, Testing Library, jsdom)와 테스트 파일 9개를 제거했다. 학습용 개발을
  우선하는 방침이라 프런트 테스트는 두지 않기로 했다(백엔드 JUnit/Testcontainers 테스트는 유지).
  프런트 검증은 `npm run lint`와 `npm run build`로 바꿨다.
  - 검증: `npm install` 후 `npm run lint`, `npm run build` 통과.
- `CLAUDE.md`를 정리했다: 프런트 검증 명령어 변경, 언어 데이터는 AI가 짓지 않는다는 원칙과 문서 기록
  규칙 추가, 중복 문구 삭제(32줄 → 29줄). 서브에이전트(`qa-tester`, `developer`, `ci-validator`)
  지침도 프런트 테스트 제거에 맞춰 고쳤다.
- `docs/requirements.md` 하단의 구현 진척도 체크리스트(완료 23개, 미완료 28개)와 일부 배경·검토 메모가
  삭제된 상태로 커밋됐다(`9cba2f6`). 삭제 경위는 확인하지 못했고, 이전 내용은
  `git show 9cba2f6^:docs/requirements.md`로 볼 수 있다.
- Gemini API 키는 `scripts/import-theme-content/.env`(git 무시 대상)에 두고, 로컬 `.env.example`은
  `skip-worktree`로 git이 변경을 보지 않게 했다. 로컬 `pre-commit` 훅이 키로 보이는 값의 커밋을
  막는다(이 훅은 `.git` 안에만 있어 다른 컴퓨터에는 적용되지 않는다).
- 다음 할 일(후보): 아래 순서는 의존 관계를 기준으로 한 제안이고 확정된 것은 아니다. 작업 하나를
  세션 하나, 브랜치 하나로 진행하고 끝나면 `main`에 합친 뒤 다음 작업을 시작한다.
  1. 일본어 입력 도우미 — 로마자 → 히라가나 자동 변환(`wanakana`)과 히라/가타카나 전환 토글.
     프런트만, 다른 작업과 독립적이다.
  2. 학습 단어장 백엔드 — 테마 학습 중 배운 단어 자동 저장과 조회 API.
  3. 학습 단어장 화면 — 뜻·읽는 법 함께 표시(2번 이후).
  4. 주민 음성(TTS) — 브라우저 음성 합성, 주민마다 다른 목소리, 다시 듣기 버튼.
  5. 마을 화면 ① — 캐릭터를 방향키/WASD로 이동(Three.js 첫 사용).
  6. 마을 화면 ② 이후 — 구역 전환, 건물 아이콘 입장, 주민 배치 등 작업마다 세션을 나눈다.
  7. 주민 대화 ① — 백엔드의 Gemini 호출 구조(`chat` 패키지)와 키 관리.
  8. 주민 대화 ② — 대화 API와 화면(1번 입력 도우미가 먼저 있으면 좋다).
  9. 보류 중: 독해(READING) 지문 코퍼스 출처 결정 → pgvector → Gemini 이해 문제 생성.
  10. 남은 것: 건물 해금, 온보딩 튜토리얼, 이메일 재발송 60초 쿨다운.

- 프런트엔드·백엔드·DB를 로컬 직접 실행 대신 Docker로 실행하도록 바꿨다.
  - 루트 `docker-compose.yml`(db/backend/frontend 3개 서비스)로 통합하고, DB만 있던
    `backend/docker-compose.yml`은 삭제했다. 백엔드는 멀티 스테이지 Dockerfile(JDK 25 빌드 →
    JRE 25 실행), 프런트엔드는 Vite 개발 서버 컨테이너(소스 볼륨 마운트로 HMR 유지)다.
  - 브라우저가 `localhost:8080`을 직접 호출하는 구조라 프런트 코드/CORS 설정은 그대로다.
    컨테이너 안에서는 compose의 `environment`가 `DB_HOST=db`로 `.env` 값을 덮어쓴다.
  - 검증: `docker compose up --build`로 3개 컨테이너 기동, Flyway 마이그레이션 8건 검증/적용,
    `localhost:5173` 200, `localhost:8080/api/auth/me`가 401 + CORS 헤더(`Origin: 5173` 허용)
    응답 확인. 자동화 테스트(`./gradlew test`, `npm run test`)는 이번 변경 범위가 아니라
    실행하지 않았다.
  - 한계: 백엔드는 jar를 이미지에 굽기 때문에 코드 수정 후에는 `docker compose up --build
    backend`가 필요하다(핫 리로드 없음). 이전 `backend/docker-compose.yml`의 DB 볼륨
    (`backend_kotonoha-machi-db`)은 새 스택과 별개라 기존 로컬 DB 데이터는 이어지지 않는다.

- 테마 학습 읽기·듣기 개선 (2026-11-04).
  - 복습(말하기) 단계에 "分からない 🥺" 힌트(카드 오른쪽 위), 말하기 중 취소 버튼, 한 글자 항목 제외를 추가했다.
  - 한자·단어·표현·예문 단계에 "🔊 듣기"와 "あ/ア 읽는 법"(히라가나/가타카나) 버튼을 추가했고, 읽는 법을
    복습 단계에서만 내려주던 API(`ThemeQuizItemResponse.reading`)를 독해를 제외한 모든 단계로 넓혔다.
  - 음성은 `docs/decisions/0013-tts-google-cloud.md`대로 백엔드 `tts` 패키지(`GET /api/tts`, Google Cloud
    TTS Neural2, `tts_audio` 캐시, 사용자당 하루 200회 제한)를 추가하고 프런트 🔊가 이를 우선 쓰게 했다.
    실패하면 브라우저 내장 음성으로 대신한다.
  - 검증: `./gradlew spotlessApply && ./gradlew test` 통과(`TtsServiceTest` 포함, Flyway V11 적용 포함),
    `npm run lint`, `npm run build` 통과. **실제 Google 호출과 소리는 아직 확인하지 못했다**(API 키 설정 전).
  - 새 `.env` 키: `GOOGLE_TTS_API_KEY`, `GOOGLE_TTS_VOICE`(`backend/.env.example`에 추가함).
  - 다음 할 일: API 키를 `backend/.env`에 넣고 백엔드를 다시 빌드한 뒤 소리 확인, Google 콘솔의 예산 알림·API
    할당량 제한 설정, 독해 지문 읽는 법 데이터 추가, 하루 제한을 DB 기준으로 옮길지 검토.
  - 코드 리뷰(`code-reviewer`)에서 나온 결함을 고쳤다: 구글 응답이 비었거나 잘못되면 502로 처리해 빈 음성이
    캐시에 저장되지 않게 했고, 하루 횟수는 합성 성공 후에만 차감하며(오래된 기록은 정리), 프런트는 페이지를 떠나거나
    다음 문제로 넘어갈 때 소리·마이크를 멈추고 같은 문장 중복 요청과 80ms 타이머 경합을 막았다. 🔊 버튼은 브라우저
    음성 지원 여부와 상관없이 항상 보인다. 임의 문장 합성 허용(비용 남용 가능성)은 마을 대화에서도 같이 쓸 예정이라
    고치지 않고 `0013` 문서에 한계로 적었다.
  - 검증: `./gradlew check` 통과(`GoogleTtsClientTest` 추가, 실패 시 횟수 미차감 테스트 포함), `npm run lint`,
    `npm run build` 통과. 수정 후 코드 리뷰와 실제 소리 확인은 아직 하지 않았다.


- 일본어 입력 도우미(로마자 → 히라가나 변환 + 히라/가타카나 토글)를 만들었다.
  - `frontend/src/components/JapaneseInput.tsx`: `wanakana`의 `toKana(..., { IMEMode })`로 입력값을
    매번 변환한다. IMEMode라서 끝의 `n`은 다음 글자가 오기 전까지 `ん`으로 바뀌지 않는다
    (`nn` → `ん`, 실제 IME와 같다). 히라/가타카나는 버튼으로 직접 전환한다.
  - `ChatPage.tsx`에 확인용 입력란을 임시로 붙였다. 대화 기능이 생기면 교체한다.
  - 검증: `prettier`, `npm run lint`, `npm run build` 통과. `toKana` 변환 결과는 node로 확인했다.
    브라우저에서 직접 입력해 보는 확인은 하지 않았다(로그인이 필요한 화면).
  - 한계: 입력란 중간을 편집하면 변환 후 커서가 끝으로 갈 수 있다. 토글을 바꿔도 이미 입력한
    글자는 변환하지 않는다. 가상 키보드는 같은 날 이어서 추가했다(아래).
  - 다음 할 일: 학습 단어장 백엔드.
- 일본어 가상 키보드를 `JapaneseInput`에 추가했다.
  - 오십음도 + 탁음·반탁음 + 작은 글자 + `ー`, 지우기 키. '키보드' 버튼으로 열고 닫는다. 키를 누르면
    입력값 끝에 붙고, 가타카나 모드면 `toKatakana`로 바꿔 보여 준다.
  - 검증: prettier, lint, build 통과. 브라우저에서 직접 눌러 보는 확인은 하지 않았다.
  - 한계: 글자는 항상 끝에만 붙는다(커서 위치 무시). 스타일은 아래에서 추가했다.
- 일본어 입력 도우미에 스타일을 넣었다.
  - `JapaneseInput.module.css`: `theme.css`의 색·간격 토큰만 써서 입력란, 토글·키보드 버튼, 키 판을
    꾸몄다(다크 모드는 토큰이 처리). 켜진 토글은 주색으로 표시한다.
  - 검증: prettier, lint, build 통과. 화면에서 눈으로 보는 확인은 하지 않았다.
- 가상 키보드를 오십음도 격자에서 실제 키보드 모양 두 가지로 바꿨다(처음엔 비교용으로 둘 다 구현했고, 아래에서 플릭만 남겼다).
  - `FlickKeyboard.tsx`: 스마트폰 일본어 키보드처럼 키를 누른 채 위·아래·좌·우로 밀면 같은 행의
    다른 글자(예: か→き·く·け·こ)가 나온다. `小゛゜` 키는 직전 글자를 か→が, は→ば→ぱ처럼 바꾼다.
  - `QwertyKeyboard.tsx`: PC 배열. 누른 로마자를 입력란의 기존 변환으로 히라가나로 바꾼다.
  - `JapaneseInput`의 `keyboard` prop(`'flick' | 'qwerty'`)으로 고른다. ChatPage 임시 입력란은 둘 다
    보여 준다. 
  - 검증: prettier, lint, build 통과. 브라우저에서 か→け 플릭, `゛` 키(げ), QWERTY로
    `konnnichiha`→こんにちは 입력을 직접 확인했다. 터치 기기와 다크 모드 외 환경은 확인하지 않았다.
  - 한계: 플릭 키는 포인터 이벤트만 써서 키보드(Tab/Enter)로는 누를 수 없다. 대문자·숫자 키는 없다.
- 가상 키보드는 플릭만 남기기로 하고 QWERTY를 지웠다.
  - 이유: 로마자 타이핑은 입력란이 이미 지원하므로(PC·폰 공통) 화면 QWERTY는 같은 일을 반복한다.
    가상 키보드의 역할은 글자를 직접 골라 입력하는 것이라 폰에서 익숙한 플릭이 맞다.
  - `QwertyKeyboard.tsx`, `keyboard` prop, ChatPage의 두 번째 입력란을 제거했다.
  - 검증: prettier, lint, build 통과. 지우기만 했고 플릭 동작은 이전 확인 그대로다.
- 일본어 입력 도우미 코드 리뷰(`code-reviewer`)에서 나온 필수 결함 3건을 고쳤다(`fix/japanese-input-review`).
  - 가타카나 모드에서 플릭 키를 눌러도 히라가나가 입력되던 버그: 변환을 `FlickKeyboard`의
    `handlePointerUp` 한 곳에서만 하도록 했다.
  - `小゛゜` 키가 현재 모드가 아니라 바꾸는 글자 자신의 종류(`isKatakana`)를 따르게 했다
    (가타카나 `ハ`는 히라가나 모드에서도 `バ`).
  - 플릭 키가 `pointerId`를 기억해 두 번째 손가락과 마우스 우클릭을 무시한다.
  - 리뷰어가 의심한 "대문자가 가타카나로 바뀜"은 `toKana`로 확인해 보니 재현되지 않아 고치지 않았다.
  - 검증: prettier, lint, build 통과. 브라우저에서 가타카나 플릭·`゛` 문자 종류 유지·두 번째
    손가락/우클릭 무시를 포인터 이벤트로 직접 확인했다. 실제 터치 기기는 확인하지 않았다.
  - 남긴 것(수정 안 함): 접근성(`aria-label` 등, Tab/Enter 입력), 주색 위 흰 글자 대비(새 토큰 필요),
    팝업이 가장자리 키에서 잘리는지 확인.
- 테마를 완료한 당일에도 그 테마를 볼 수 있게 했다(하루 1개 완료 제한은 그대로).
  - `ThemeService.getTodayRecommendedTheme`: 오늘 완료한 테마가 있으면 빈 값 대신 그 테마(완료 상태)를 돌려준다.
    새 테마는 여전히 추천하지 않는다.
  - `TownPage` 배너는 완료 상태면 "오늘 완료 · 복습하기 / 다시 보기"로 바뀐다. `ThemeLearningPage`는 완료한
    테마에서 한자~복습 단계 칩을 눌러 각 단계 내용을 다시 볼 수 있다(완료 처리는 하지 않는 열람 모드).
  - 검증: backend `spotlessApply`·`test`, frontend prettier·lint·build 통과. 브라우저에서 직접 눌러 보는
    확인과 이 동작을 직접 겨냥한 자동 테스트는 하지 않았다.
  - 한계: 다음 날 0시(한국 시간)가 지나면 완료한 테마는 배너에서 사라지고 다음 테마가 추천된다.
- 코드 리뷰(REVIEW_PASSED) 권고를 반영했다.
  - 오늘 완료한 테마가 여러 개면 `updatedAt`이 가장 최근인 것을 고른다(순서가 임의이던 `findFirst` 대체).
  - 단계 전환 시 `cancelSpeechRecognition()`을 호출해, 열람 모드에서 이전 단계의 마이크 인식 결과가 새 단계에
    반영되지 않게 했다.
  - 하루 1개 제한이 서버 강제가 아니라 추천 로직뿐이라는 한계를 `docs/decisions/0014-...md`에 적었다.
  - 검증: 아래 명령 통과 확인(backend spotless·test, frontend prettier·lint·build).
- 하루 1개 테마 완료 제한을 서버에서 강제했다.
  - `ThemeService.completeStage`: 오늘 다른 테마를 이미 완료했으면 `DAILY_THEME_LIMIT_REACHED`(409)로 거부한다.
    `ThemeServiceTest`에 오늘 완료(거부)·어제 완료(허용) 테스트를 추가했다.
  - 검증: backend `spotlessApply`·`test` 통과. 프런트는 바꾸지 않았다(기존 에러 표시가 서버 메시지를 보여 준다).
  - 한계: 동시 요청 경합은 막지 않는다. 막힌 테마도 퀴즈는 풀 수 있고 "다음"에서 메시지를 본다.
- 하루 제한에 걸린 테마의 화면을 다듬었다(서버 409만 믿고 끝에서 에러를 보여 주던 흐름 개선).
  - `ThemeLearningPage`: 열 때 `getTodayRecommendation`으로 오늘 완료한 테마를 확인해, 다른 테마를 오늘 이미
    완료했다면 퀴즈를 불러오지 않고 안내 문구("내일 이어서 진행")와 "오늘 완료한 테마 다시 보기" 링크,
    "마을로 돌아가기"만 보여 준다. 조회가 실패하면 그냥 열고, 서버 409 메시지가 기존 에러 영역에 나온다.
  - 검증: prettier·lint·build 통과. 브라우저에서 직접 눌러 보는 확인은 하지 않았다.
- 오늘의 테마가 아닌 테마는 주소로 들어가도 진행·열람하지 못하게 했다.
  - 서버: `completeStage`가 오늘의 테마가 아니면 `NOT_TODAY_THEME`(409), 오늘 이미 완료했으면 `DAILY_THEME_LIMIT_REACHED`(409).
    `ThemeServiceTest`·`ThemeControllerIntegrationTest`에 테스트 추가.
  - 화면: `ThemeLearningPage`가 "오늘의 테마가 아닙니다" 안내와 오늘의 테마로 가는 링크를 보여 주고 퀴즈를 불러오지 않는다.
  - 검증: backend `spotlessApply`·`test`, frontend prettier·lint·build 통과. 브라우저 확인은 하지 않았다.
  - 한계: 테마 순서가 ID 순으로 고정된다. 이전에 완료한 테마도 오늘은 다시 볼 수 없다. 동시 요청 경합은 막지 않는다.
- 테마의 마지막 단계(복습)를 끝내면 "오늘 테마를 완료했습니다!" 확인 화면을 보여 주고, "확인"을 누르면 `/town`으로 이동한다.
  - `ThemeLearningPage`: 완료 직후에만(`justCompleted`) 이 화면을 보여 준다. 나중에 다시 열면 기존처럼 단계별 열람 화면이다.
  - 검증: prettier·lint·build 통과. 브라우저 확인은 하지 않았다.
- 완료한 테마 목록 화면을 추가했다.
  - `CompletedThemesPage`(`/town/themes`): `GET /api/themes`에서 `completed`인 테마만 보여 주고, 누르면 열람 모드로 연다.
    마을 화면 헤더(캐릭터 설정 옆)에 "완료한 테마" 아이콘 버튼을 뒀다. 새 API·라이브러리는 없다.
  - `ThemeLearningPage`: 완료한 테마는 오늘의 테마가 아니어도 막지 않는다(0014 문서의 "이전 완료 테마 못 봄" 부분을 바꿈).
  - 검증: prettier·lint·build 통과. 브라우저 확인은 하지 않았다.

## 2026-11-05

- 캐릭터를 DiceBear 2D 이미지에서 Three.js 저폴리 3D 모델로 교체하고, 마을에서 걸어다닐 수 있게 했다
  (`0009`·`0010`에서 확정한 방향의 첫 구현).
  - `lib/avatarModel.ts`: 5축 값으로 박스/구를 조합해 캐릭터를 만든다(헤어 8종, 옷 10종, 색 3축).
    프로필과 마을이 같은 함수를 쓰므로 모습이 항상 같다.
  - `components/AvatarPreview.tsx`: 프로필 미리보기(전신, 천천히 회전)와 마을 헤더 썸네일(얼굴).
  - `components/VillageScene.tsx`: 고정 쿼터뷰(직교 카메라), 방향키/WASD 이동, 이동 방향으로 몸 회전,
    카메라는 캐릭터를 따라가되 각도는 고정, 땅 경계에서 멈춘다. 걷기 애니메이션은 없다(`0010`).
  - `buildAvatarPreviewUrl`(DiceBear)과 그 색상 매핑 주석을 제거했다. 백엔드/저장 데이터는 그대로다.
  - 검증: prettier, lint, build 통과. 임시 페이지에서 헤어 8종·옷 10종 렌더링과 마을 장면 표시를 눈으로
    확인했고 임시 페이지는 지웠다. 로그인한 실제 화면(프로필→마을)과 키를 누른 채 이동하는 동작은
    확인하지 않았다(도구로 키를 누르고 있을 수 없음).
  - 한계: 옷 색은 프런트 상수(`CLOTHES_LOOK`)라 백엔드 enum과 따로 관리된다. 마을은 빈 초록 땅뿐이고
    건물·NPC·구역 이동·충돌은 아직 없다. 번들이 845kB로 커졌다(three).
  - 다음 할 일: 실제 화면에서 모양 다듬기(사용자 피드백), 건물(카페)·NPC 배회, 구역 이동.
- 캐릭터를 동물의 숲 같은 둥근 모양으로 다시 만들었다(`lib/avatarModel.ts`).
  - 큰 둥근 머리 + 작은 알 모양 몸 + 짧은 다리/둥근 신발, 점 눈·볼터치·작은 미소. 헤어 8종·옷 10종을
    둥근 덩어리로 다시 짰다(5축 값과 함수 이름은 그대로). 마을에서는 캐릭터를 더 크게 보이도록 확대했다.
  - 검증: prettier, lint, build 통과. 임시 페이지에서 헤어 8종·옷 8종을 눈으로 확인했다(체크·넥타이 옷과
    마을 화면의 새 모양은 다시 안 봄). 임시 페이지는 지웠다.
  - 참고: 이 저장소에 v1이 없어 v1 카페 캐릭터와는 맞추지 못했다. 스크린샷을 받으면 비율·색을 맞춘다.
- 캐릭터에 "옷 색" 축을 추가했다(옷이 다 비슷해 보인다는 피드백).
  - 백엔드: `AvatarClothesColor` enum(11색), `V12__add_avatar_clothes_color.sql`(기본값 `SKY`), `User`·DTO·서비스·
    컨트롤러에 옷 색 반영. 기존 사용자는 옷 색이 하늘색으로 시작한다(예전 옷별 고유 색은 사라짐).
  - 프런트: 프로필에 옷 색 선택 추가. 색이 쓰이는 곳은 옷마다 다르다(후드·재킷 등은 상의, 오버올은 멜빵바지,
    줄무늬·체크는 무늬 색, 넥타이는 타이 색). 흰색을 골라도 무늬·타이가 보이게 어둡게 보정한다.
  - 실수로 커밋됐던 중복 파일 `avatarModel 2.ts`를 지웠다.
  - 검증: backend `spotlessApply`·`test` 통과, frontend prettier·lint·build 통과. 임시 페이지에서 옷 종류별
    색 적용을 눈으로 확인했다. 실제 로그인 화면(저장 후 마을 반영)은 확인하지 않았다.
  - 한계: 새 옷 "종류"는 늘리지 않았다. 옷 색 목록·색상값은 백엔드 enum과 프런트 상수가 따로라 같이 고쳐야 한다.
- 옷 색을 11색에서 파스텔 8색으로 줄였다(크림·분홍·코랄·복숭아·노랑·민트·하늘·라벤더).
  - `V13__reduce_avatar_clothes_colors.sql`이 이미 저장된 옛 값을 비슷한 새 색으로 옮긴다
    (흰색→크림, 검정·보라→라벤더, 빨강→코랄, 주황→복숭아, 초록→민트, 파랑→하늘). V12는 이미 적용됐을 수
    있어 고치지 않고 새 마이그레이션으로 처리했다.
  - 파스텔은 밝아서 무늬·타이 보정 기준을 더 밝은 색(크림 정도)에만 걸리게 조정했다.
  - 검증: backend `spotlessApply`·`test`, frontend prettier·lint·build 통과. 임시 페이지에서 8색을 눈으로
    확인했다.
- 색 팔레트를 백엔드 한 곳에서만 관리하도록 바꿨다(색을 바꿀 때 프런트까지 고치지 않기 위해).
  - 백엔드: 피부색·머리색·옷 색·신발 색 enum이 한글 이름(`label`)과 색상값(`hex`)을 가진다(`AvatarColor`
    인터페이스). `GET /api/users/me/avatar/options`의 색 목록이 `{value, label, hex}` 배열로 바뀌었다
    (`ColorOption`). 저장 값(enum 이름)과 DB는 그대로다.
  - 프런트: 색 이름·색상값 상수를 지우고, 선택지 응답으로 팔레트(`buildAvatarPalette`)를 만들어 프로필 선택 UI와
    3D 모델(`createAvatarModel(avatar, palette)`)에 쓴다. 마을 화면도 선택지를 같이 불러온다.
  - 이제 색 추가·삭제·이름·색상 변경은 백엔드 enum만 고치면 된다. 옷/헤어 "모양"은 여전히 프런트 모델 코드가 필요하다.
  - 정리: 어디선가 생긴 `이름 2.tsx` 같은 중복 파일 7개가 이전 커밋에 섞여 들어가 있어 지웠다(원본과 동일했다).
  - 검증: backend `spotlessApply`·`test`, frontend prettier·lint·build 통과. 바뀐 API 응답을 실제 서버로 호출해
    프로필→마을을 보는 확인은 하지 않았다(Docker 재빌드 필요).
- 옷 종류를 정리했다: 어색하게 보이던 후드·재킷·코트·수트·넥타이·체크·드레스를 지우고 카디건·교복·원피스를 새로 만들었다.
  남은 옷은 기본·카디건·교복·원피스·오버올·스트라이프 6종이다.
  - 후드는 기본 옷과 구별이 안 되고 코트는 드레스처럼 보이는 등 모양이 어색해서 뺐다(내가 큰 화면으로 보고
    판단한 것이라 되살리고 싶은 옷이 있으면 다시 만들 수 있다).
  - `V14__replace_avatar_clothes_styles.sql`이 이미 저장된 옛 옷을 비슷한 새 옷으로 옮긴다(후드·타이→기본,
    재킷·코트→카디건, 수트→교복, 드레스→원피스, 체크→스트라이프).
  - 검증: backend `spotlessApply`·`test`, frontend prettier·lint·build 통과. 임시 페이지에서 6종을 눈으로
    확인했다(캐릭터가 좌우로 도는 중이라 앞모습의 단추·리본은 작게 보인다). 임시 페이지는 지웠다.
- 신발 색을 파스텔 6색(흰색·분홍·베이지·민트·하늘·라벤더)으로 바꿨다(옷 색과 어울리게).
  `V15__pastel_avatar_shoes_colors.sql`이 저장된 옛 값을 옮긴다(검정→라벤더, 갈색→베이지, 빨강→분홍,
  파랑→하늘). 검증: backend `spotlessApply`·`test`, frontend prettier·lint·build 통과. 화면으로는 확인하지 않았다.
- 캐릭터 꾸미기를 저장하면 프로필에 머무르지 않고 마을(`/town`)로 돌아가게 했다. 저장 성공 문구는 화면이 바로
  바뀌므로 지웠고, 저장 실패 시에는 프로필에 남아 오류 문구를 보여 준다. 검증: prettier, lint, build 통과.
  화면에서 직접 눌러 보는 확인은 하지 않았다.
- 코드 리뷰(`code-reviewer`)는 `REVIEW_PASSED`였고, 권장 사항을 반영했다.
  - 색 축 타입을 `string`으로 풀었다(색 추가·삭제는 백엔드 enum만 고치면 됨). 결정은 `0015`에 기록했다.
  - `AvatarPreview`·`VillageScene` 정리 단계에 `forceContextLoss()`를 넣어 WebGL 컨텍스트가 쌓이지 않게 했다.
  - 마을에서 Ctrl/Cmd/Alt 조합키는 이동으로 막지 않고, 첫 프레임 시간 차이가 음수가 되지 않게 했다.
  - 서버 팔레트에 없는 색 이름은 회색으로 칠한다. 저장 성공 시 불필요한 상태 갱신을 없앴다.
  - `ProfileController` 생성자 Javadoc을 현재 역할에 맞게 고쳤다.
  - 검증: backend `spotlessApply`·`test`, frontend prettier·lint·build 통과. 화면에서 직접 확인하지는 않았다.
- 마을에 건물 3개(카페·상점·마을회관)를 세우고 캐릭터가 통과하지 못하게 막았다. 와이어프레임
  (`Town.dc.html`)의 배치와 색을 따랐고, 건물 데이터와 충돌 판정은 `lib/villageBuildings.ts`로 분리했다.
  - 충돌은 v1 `walk.ts`처럼 X, Z를 따로 검사해 벽에 비스듬히 부딪히면 벽을 따라 미끄러진다.
  - 상점·마을회관은 `locked: true`로 데이터만 두었다. 잠금 표시, 건물 아이콘·라벨, 클릭 입장은 다음 단계다.
  - 검증: frontend prettier·lint·build 통과. 화면에서 직접 걸어 보는 확인은 하지 않았다(로그인 필요, Docker 실행 필요).
  - 다음 할 일: 건물 아이콘/라벨(클릭 시 카페는 대화 화면, 나머지는 잠금), 구역 분리, 주민 배치.
- 마을 건물 위에 이름표 버튼을 달았다. 카페는 누르면 걷지 않고 바로 `/chat/cafe`로 들어가고, 상점·마을회관은
  자물쇠와 "(나중에)"가 붙은 비활성 버튼이다. 이름표는 3D가 아니라 화면 위 HTML 버튼이고, 매 프레임 건물 지붕
  위치를 화면 좌표로 바꿔 따라다니게 했다. 건물 id가 곧 담당 주민 id라는 임시 연결이다(주민 데이터가 생기면 교체).
  - 검증: prettier·lint·build 통과. 로그인 없이 임시 페이지로 띄워 라벨 표시, 카페 클릭 시 입장 콜백, 잠긴 버튼
    비활성, 가로 스크롤바가 생기지 않는 것까지 확인했다(임시 페이지는 지웠다). 실제 `/town`에서 이동은 확인하지 않았다.
  - 카메라가 너무 가까워 먼 건물의 이름표가 화면 밖에 있었다. 줌아웃(`VIEW_HEIGHT` 9→20)으로 시작 위치에서
    건물 3개와 이름표가 한 화면에 보이게 했다. 대가로 캐릭터가 작아졌다. 맵 가장자리로 걸어가면 반대쪽
    건물은 다시 화면 밖으로 나간다(건물이 늘어나면 가장자리 표시 등을 다시 검토).
- 마을을 꾸몄다(건물 외형, 길, 나무, 꽃, 덤불). 새 파일 2개를 만들었다.
  - `lib/villageScenery.ts`: 길·나무·꽃·덤불의 위치 데이터와 나무 충돌. 고정 시드 난수로 정해서 새로 고쳐도 같은
    마을이 나오고, 건물·길과 겹치는 자리는 피한다. 나무(26그루)는 캐릭터가 통과하지 못하고, 꽃과 덤불은 지나다닐 수 있다.
  - `lib/villageScenery3d.ts`: Three.js 모델. 건물은 뾰족 지붕·문·창문을 달았고, 나무는 둥근 나무와 소나무 두 종류다.
    같은 모양·색은 하나만 만들어 나눠 쓰고 화면을 떠날 때 한 번에 정리한다.
  - 검증: prettier·lint·build 통과. 임시 페이지에서 눈으로 확인했고(임시 페이지는 지웠다), 처음엔 나무가 빽빽해
    상점이 가려져 26그루로 줄이고 건물·길과의 간격을 넓혔다. 나무 충돌을 직접 걸어 확인하지는 않았다.
- 캐릭터가 집에 비해 커 보여서 캐릭터를 줄였다(`PLAYER_SCALE` 1.2→0.7, 충돌 반지름 0.5→0.3). 캐릭터가 너무 작아
  보이지 않게 카메라를 조금 당겼다(`VIEW_HEIGHT` 20→18). 검증: prettier·lint·build 통과, 임시 페이지에서 눈으로 확인했다
  (임시 페이지는 지웠다). 확인한 창이 작아서 실제 `/town` 화면의 이름표 잘림 여부는 아직 모른다.
- 마을이 상자에 갇힌 것처럼 보이던 것을 고쳤다: 화면 전체가 마을이 되게 했다.
  - 땅이 36×36 마름모로 끝나 모서리에 하늘색이 보였다. 풀밭을 120×120으로 키우고(`GROUND_HALF_SIZE`), 걸어 다니는
    땅(±17) 바깥에는 숲을 둘렀다(`VILLAGE_FOREST`, 약 300그루). 숲은 들어갈 수 없는 곳이라 충돌 판정이 없고,
    수백 그루를 가볍게 그리려고 `InstancedMesh`(같은 부품을 한 번에 그리는 방식)로 만들었다.
  - 장면을 헤더 아래가 아니라 화면 맨 위까지 깔고(`inset: 0`) 헤더·배너가 위에 얹히게 했다.
  - 카메라를 멀리 뺐다(`CAMERA_OFFSET` 10→50). 직교 카메라라 화면 크기는 같고, 카메라 앞쪽의 나무가 시야 앞면에
    잘려 속이 빈 것처럼 보이던 문제를 없앴다.
  - 검증: prettier·lint·build 통과. 임시 페이지에서 눈으로 확인했다(임시 페이지는 지웠다). 실제 `/town`에서
    헤더·배너와 함께 보이는 모습과 맵 가장자리 끝까지 걸어 보는 것은 확인하지 못했다.
- 오늘 테마를 완료하면 마을 화면의 "오늘의 학습" 배너를 숨기게 했다. 완료한 테마는 완료한 테마 목록(`/town/themes`)에서만
  본다. 프런트 `TownPage`가 `completed`인 테마를 배너 상태에 넣지 않으며, 백엔드 응답은 그대로다.
  - 검증: frontend prettier·lint·build 통과. 화면에서 직접 확인하지는 않았다.
