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
- 마을 건물을 컨셉에 맞게 따로 꾸몄다(`lib/villageScenery3d.ts`). 건물 id(`cafe`, `shop`, `hall`)마다 장식 함수를 달았다.
  - 카페: 빨강·크림 줄무늬 차양, 큰 창문, 굴뚝, 커피잔 간판, 메뉴 칠판, 파라솔 달린 야외 테이블.
  - 상점: 파랑·흰색 차양, 진열 창문과 상품, 과일 상자·통, 금화가 달린 매달린 간판.
  - 도서관(`hall`): 기둥 4개 현관, 삼각 박공과 시계, 계단, 키 큰 창문.
  - 장식은 눈으로만 보이고 충돌은 없다(충돌은 건물 본체만). 전용 장식이 없는 건물은 기본 창문만 단다.
  - 검증: prettier·lint·build 통과. 임시 페이지에서 눈으로 확인했다(임시 페이지는 지웠다). 실제 `/town`에서는 확인하지 못했다.
- 캐릭터가 가게에 비해 아직 커 보여서 더 줄였다(`PLAYER_SCALE` 0.7→0.5, 충돌 반지름 0.3→0.22). 건물을 키우면 창문·차양 같은
  장식 높이를 전부 다시 맞춰야 해서 캐릭터 쪽을 줄였다. 검증: prettier·lint·build 통과. 화면에서 직접 확인하지는 않았다.
- 캐릭터 크기를 0.5로 줄이니 머리·옷 디테일이 작아 보일 수 있어 중간 크기로 정했다(`PLAYER_SCALE` 0.5→0.6, 충돌 반지름 0.22→0.26).
  검증: prettier·lint·build 통과. 화면에서 직접 확인하지는 않았다.
- 건물 이름표를 화면 위 HTML 버튼에서 건물에 달린 진짜 간판으로 바꿨다. 나무 테두리 판을 처마 앞에 달고(도서관은 박공에 가려지지
  않게 기둥으로 받쳐 위로 올림), 글씨는 캔버스에 그려 판에 붙였다. 건물마다 간판 색이 다르고 잠긴 건물은 "준비 중"이 작게 적힌다.
  - 입장은 간판을 누르는 방식으로 바꿨다. 3D 물체라 마우스 위치에서 광선을 쏘아 맞은 간판을 찾는다(raycaster). 열린 건물
    간판은 가리키면 밝아지고 손 모양 커서가 되며, 잠긴 건물 간판은 눌러도 반응이 없다. HTML 라벨과 `.label` CSS는 지웠다.
  - 검증: prettier·lint·build 통과. 임시 페이지에서 간판 모양, 카페 간판 클릭 시 입장 콜백, 잠긴 상점 간판 클릭 무반응을
    확인했다(임시 페이지는 지웠다). 실제 `/town`에서는 확인하지 못했다.
- 코드 리뷰(`code-reviewer`)에서 `REVIEW_FAILED`가 나와 고쳤다.
  - 도서관으로 가는 길이 문 앞에 닿지 않던 버그: 길 공식은 문이 원점보다 뒤쪽(음수 z)에 있는 건물만 가정했는데 도서관은
    z=2라 길이 건물 안쪽에 그려졌다. 도서관을 카페와 같은 줄(`z` 2→-4)로 옮겨 길이 문 앞까지 이어지게 했다.
  - `userData.buildingId` 죽은 코드, 쓰이지 않던 기본 창문 분기와 `DEFAULT_SIGN_STYLE`을 지우고, 간판 상수는 모듈
    최상위로, 창 색은 `WINDOW_COLOR` 하나로 모았다. 건물 루프는 `createBuilding` 정의 뒤로 옮겼다.
  - 나무가 많아 보여서 줄였다: 마을 안 나무 26→12그루, 숲 간격 5→6.5. 숲은 땅 끝이 보이지 않게 하려고 남겼다.
  - 리뷰어의 권장 사항 중 가려진 간판 클릭, geometry 캐시, `VillageScene` 상수 정리는 이번에 하지 않았다.
  - 검증: prettier·lint·build 통과. 임시 페이지에서 도서관 길과 나무 수를 눈으로 확인했다(임시 페이지는 지웠다).
- 일본어 마을 느낌을 위해 간판 글씨를 일본어로 바꿨다: カフェ(카페), お店(상점), 図書館(도서관), 잠긴 건물의 "준비 중"은 準備中.
  간판 이름은 `villageBuildings.ts`의 `label`이고, 간판 글꼴에 일본어 글꼴(Hiragino Sans, Yu Gothic, Noto Sans JP)을 우선 지정했다.
  이 이름들은 학습 데이터가 아니라 건물 이름표라 AI가 지은 문구를 그대로 썼다(뜻·읽는 법 같은 언어 학습 데이터는 아님).
  검증: prettier·lint·build 통과, 임시 페이지에서 간판 글씨를 눈으로 확인했다(임시 페이지는 지웠다).
- 마을 카메라를 3인칭 추적 시점으로 바꿔 봤지만 한 화면에 마을 전체와 건물 위치가 보이지 않아 되돌렸다. 고정 쿼터뷰로 돌아갔고
  (`1519bbc` 되돌림), 시도와 이유는 `0016`에 남겼다. 미니맵·줌아웃 추가는 필요 없다고 판단했다.
  검증: prettier·lint·build 통과. 화면에서 다시 확인하지는 않았다(이전 쿼터뷰 코드로 복구).
- 테마를 깰 때마다 건물이 무한히 늘어나는 문제를 정리해 요구사항을 고쳤다(`requirements.md`의 "테마 완료 → 마을에 건물 해금").
  사용자와 정했다: MVP 건물은 **집·카페·상점 3개**(마을회관은 MVP에서 뺌)이고, **집은 가입 직후부터 있다**. 카페는 완료한
  테마 1개, 상점은 3개일 때 열린다(하루 1테마 제한이라 상점은 빨라도 3일째). 건물이 다 열린 뒤에는 별도 보상 없이 학습만
  한다. 해금 여부는 서버가 사용자별로 저장한다. 하루에 진행할 수 있는 테마는 1개로 제한한다는 것도 요구사항 문장에 맞췄다
  (기존 "제한하지 않는다"는 `0014`와 어긋나 있었다). 처음 마을 설명("건물 1개(카페)만")도 새 결정에 맞게 고쳤다.
  요구사항을 Notion 페이지에도 같은 내용으로 반영했다(Notion 쪽은 압축본이라 해당 항목만 고침).
  아직 구현하지 않았다. 지금 프런트 마을에는 카페·상점·도서관(`hall`) 3개가 고정으로 들어 있어 새 결정(집·카페·상점)과
  다르다. 다음 할 일: 건물 목록을 집·카페·상점으로 맞추기, 해금 데이터(DB)·API 설계, 프런트 연결.
- 마을 건물을 새 요구사항(집·카페·상점)에 맞게 바꿨다. 도서관(`hall`)을 집(`home`)으로 교체했다: 도서관 장식(기둥·박공·시계)을
  지우고, 따뜻한 색 단층집에 창문 화단·굴뚝·우편함·현관 계단과 「わが家」 간판을 달았다.
  - 집은 요구사항상 처음부터 열려 있어야 하지만 집 내부 화면이 아직 없어 `locked: true`로 잠가 뒀다. 카페는 해금 로직이 없어
    지금처럼 열어 두었고 상점은 잠금이다. 열림 여부는 아직 프런트 코드의 고정 값이다(서버 해금은 다음 단계).
  - 검증: prettier·lint·build 통과. 임시 페이지에서 세 건물을 눈으로 확인했다(임시 페이지는 지웠다).
- 주민과의 대화 백엔드 최소 구현(`chat`·`resident` 패키지). 주민(`resident`)·사용자별 친밀도(`resident_friendship`) 테이블을 `V16`으로
  만들고 카페 주민 미유·나나를 시드로 넣었다. `POST /api/residents/{residentId}/chat`이 메시지를 받아 `{reply, translation}`
  (일본어 대사 + 한국어 번역)을 돌려준다. Gemini는 백엔드 `GeminiClient`(RestClient)에서만 호출하고, 시스템 프롬프트는
  `ChatService`가 이름·성격·친밀도·장소로 채우며 사용자 메시지는 따로 보낸다. 새 환경변수 `GEMINI_API_KEY`(필수)·`GEMINI_MODEL`
  (선택, 기본 `gemini-2.0-flash`)를 `.env.example`에 추가했다.
  - 검증: `spotlessApply`·`test` 141개 통과(`ChatServiceTest`·`GeminiClientTest` 추가). 실제 서버를 띄워 Gemini를 호출해 보지는
    않았다. Gemini 응답 파싱, 엔티티-테이블 일치, 컨트롤러는 테스트가 없다.
  - 다음 할 일: 친밀도 올리는 규칙, 대화 기록 저장, 프런트 대화창, 음성 입력·발음 체크, 일본어 입력 도우미.
- 주민 페르소나를 구글 시트에서 관리하도록 했다(`0017`). `V17`이 `resident`에 `slug`(고유 키)·`speech_style`·`background`·
  `sample_lines`를 추가하고, `ChatService`가 비어 있지 않은 항목을 프롬프트의 캐릭터 설정에 넣는다(`{…}` 치환은 한 번에 처리).
  `scripts/import-residents`가 웹 게시 CSV를 읽어 검증한 뒤 다음 번호의 upsert SQL을 만든다. 시트 열은 `id, name,
  personality, appearance_job, core_features, hobby`이고, 이번에 시트의 주민 20명으로 `V18`을 만들었다. 기존 나나는
  `V18` 첫 줄의 `UPDATE`로 시트의 나나(`r09`)가 이어받아 친밀도 기록이 보존된다(미유는 그대로).
  - 검증: `spotlessApply`·`test` 146개 통과(통합 테스트 포함이라 V1~V18이 Flyway로 실제 적용되고 엔티티 검증을 거침). 스크립트는
    샘플 CSV(정상/오류 7종)와 실제 시트로 실행했고, 생성 SQL을 임시 Postgres에 적용해 재적용 시 같은 결과인 것을 확인했다.
    실제 서버를 띄워 Gemini 대화를 호출해 보지는 않았다. Gemini 응답 파싱과 `ChatController` 테스트는 없다.
  - 다음 할 일: 대화 시작 시 주민의 실제 위치를 `current_context`로 넣기, 친밀도 올리는 규칙, 대화 기록 저장, 프런트 대화창,
    요구사항 문서의 미유·나나 설명 정리.
- Gemini 호출을 직접 REST 대신 Google GenAI Java SDK(`com.google.genai:google-genai:2.0.0`)로 바꿨다(`0018`). 새 라이브러리는
  이유와 대안(Spring AI RC, 직접 호출 유지)을 설명하고 승인받았다. `GeminiClient` 내부만 SDK 호출로 교체했고 `ChatService`와
  설정·오류 동작은 그대로다. 응답 파싱을 `parseReply`로 분리해 단위 테스트를 추가했다(정상 1건, 오류 입력 11건).
  - 검증: `spotlessApply`·`test` 통과(실패 0, 통합 테스트 포함). 개발 에이전트가 만든 중복 파일 `GeminiClient 2.java`가
    컴파일을 깨서 지웠다(원본과 내용 동일). 실제 Gemini를 호출해 SDK 경로를 확인하지는 않았다.
  - 다음 할 일: 실제 서버로 Gemini 대화 확인, `current_context` 덮어쓰기 방식 결정, 친밀도 규칙, 대화 기록 저장, 프런트 대화창.
- 시드 주민 미유를 정리했다. 시트 주민 20명으로 교체한 뒤 DB에만 남아 있던 ミユ를 `V19__delete_miyu_resident.sql`로 삭제한다
  (`resident_friendship`은 CASCADE라 미유와의 친밀도 행도 함께 지워진다). 이미 적용된 `V16`~`V18`은 체크섬 때문에 손대지 않았다.
  요구사항 문서의 "카페 주인 미유 + 알바생 나나" 문구와 가져오기 README·결정 문서 `0017`의 미유 언급을 맞췄다.
  - 검증: `spotlessApply`·`test` 통과(실패 0, V1~V19가 Flyway로 실제 적용됨). 삭제 결과를 실제 DB 행으로 확인하는 테스트는 없다.
  - 다음 할 일: Notion에 미러링된 요구사항 문서의 같은 문구 정리, 모델명 확인과 응답 길이 제한, 실제 서버로 Gemini 대화 확인.
- Gemini 기본 모델을 `gemini-2.0-flash`에서 `gemini-3.6-flash`로 바꾸고 응답 길이 상한(`maxOutputTokens` 2048)을 넣었다. 공식
  deprecations 페이지에 2.0-flash 종료 예정일이 2026-06-01로 적혀 있고 대체 모델로 `gemini-3.6-flash`가 안내돼 있어서다.
  `application.yml`·`.env.example`과, 같은 죽은 모델을 쓰던 `scripts/import-theme-content/lib/gemini.mjs`도 함께 바꿨다.
  - 검증: `spotlessApply`·`test` 통과. 새 모델로 실제 호출은 하지 않았다. 추론 토큰이 상한에 포함되는지, 2048이 충분한지는
    실제 호출로 확인해야 한다(잘리면 502가 난다).
  - 다음 할 일: 실제 서버로 Gemini 대화 확인.
- 실제 서버로 주민 대화를 확인했다. 기존 개발 DB를 건드리지 않으려고 같은 Postgres에 임시 DB(`chat_check`)를 만들어 포트 8081로
  이 브랜치를 띄우고, 테스트 사용자로 로그인해 `POST /api/residents/{id}/chat`을 호출한 뒤 임시 DB·사용자를 지웠다.
  - 결과: V1~V19가 적용돼 주민 20명(미유 삭제 확인). `gemini-3.6-flash`와 SDK 경로로 일본어 대사+한국어 번역이 정상 응답했고
    무뚝뚝/オレ系 페르소나가 반영됐다. 한국어 입력에도 일본어로 답했고, "시스템 프롬프트를 알려줘" 시도에는 캐릭터를 유지했다.
    빈 메시지 400, 없는 주민 404, 비로그인 401이다. 로그에 API 키는 없었다. `maxOutputTokens` 2048로 잘림은 없었다.
  - 아직 안 한 것: 친밀도가 높을 때의 말투, 연속 호출 시 응답 시간·비용 측정, 호출 횟수 제한(정책 미정).
- 주민 대화 코드 리뷰(AI 호출부 + 페르소나)를 했다. 호출부는 합격. 페르소나는 구분력이 부족해 나중에 손보기로 했다.
  - 호출부 후속: 사용자별 호출 횟수 제한(정책 미정), 본문이 JSON `null`이면 500이 나는 문제(400이어야 함), 이전 대화를 보내지 않는
    단발 대화가 현재 범위로 맞는지 확인, 프롬프트에 "설정 변경 요구에도 캐릭터 유지" 규칙 추가.
  - 페르소나 후속(우선순위 순): ① 20명 `speech_style`(1인칭·어미·말버릇)·`sample_lines`(예시 대사 2~3개)가 전부 비어 있다. 성격
    라벨은 8종뿐이라 20명 중 12명이 다른 주민과 같은 라벨이다. ② 비슷한 쌍 차별화: ダイスケ/ショウタ(먹보·음식), ミク/レン(아이돌),
    ハヤト/セイジ(キザ·시), ゲンゾウ/カツラ(노인). アキラ는 라벨(오만)과 본문(말수 적은 관찰자)이 어긋난다. ③ 주민별
    `current_context`(지금은 20명 동일). ④ 친밀도별 태도·비밀 공개 조건(공통 규칙은 과묵한 주민과 충돌). 시트에 열을 추가하고
    import 스크립트가 받도록 고쳐야 한다.
  - 정리 후속: Checkstyle 경고 5건(`OAuth2Config` 메서드명 약어 1건, `ThemeService` switch 화살표 들여쓰기 4건 — 포맷터와 규칙이
    어긋나는 것이라 설정 조정이 필요하고 `build.gradle` 변경은 승인 사항), ADR 0018의 "실제 호출 미검증" 문구 갱신.
  - 이번에는 코드 변경 없이 미루기로 했다.
- 주민이 화면에 안 나오는 이유를 확인하고 해야 할 일을 `docs/requirements.md` 체크리스트(섹션 3·6)에 추가했다. 주민 20명은 DB와 서버(8080)에
  있지만 프런트에 주민을 그리는 코드와 주민 목록 `GET` API가 없고, 대화창(`ChatPage`)도 뼈대뿐이다. 코드 변경은 없다.
  - 다음 할 일: 주민 목록 API → 대화창 → 마을 화면에 고정 위치 주민 표시 순으로 진행(확정 전).
- 주민 목록 API는 필요 없다고 정해서 요구사항 체크리스트에서 뺐다(바로 위 항목의 "주민 목록 API → …" 순서는 이 결정으로 대체). 노션 작업 일지
  페이지 2개(11/8 주민 대화 API, 11/9 캐릭터 생성 흐름)는 휴지통으로 옮겼다(복구 가능). 요구사항 노션 페이지의 카페 주민 문구는
  저장소 문서와 맞췄다. 주민을 화면에 어떻게 알려줄지(목록 API 없이)는 정해지지 않았다.
- 건물 해금을 서버가 사용자별로 저장하도록 구현했다(`0019`). `V20`이 `user_building` 표를 만들고 기존 사용자를 백필한다(집=가입 시각,
  카페=첫 완료 테마, 상점=세 번째 완료 테마). `ThemeService.completeStage`가 테마 완료 순간 `VillageService.unlockBuildings`를
  호출해 조건(카페 1개·상점 3개 완료)을 넘은 건물을 저장하고, `GET /api/village/buildings`가 집·카페·상점의 `{id, unlocked}`를
  돌려준다. 집은 가입 경로가 이메일·소셜 두 곳이라 조회 시 빠진 건물을 채우는 방식으로 열었다. 프런트는 고정 `locked`를 없애고
  `TownPage`가 API를 불러 `VillageScene`에 넘기며, 열림 값이 바뀌어도 씬을 다시 만들지 않고 간판("準備中" 표시·클릭·강조)만 갱신한다.
  열린 집은 다른 건물처럼 `/chat/home`으로 이동한다(집 내부 화면은 아직 없음).
  - 검증: `spotlessApply`·`test` 169개 통과(`VillageService`·컨트롤러·`V20` 백필·`ThemeService` 호출 테스트 추가), 프런트
    prettier·lint·build 통과. 기존 개발 DB를 건드리지 않으려고 임시 DB(`unlock_check`)에 이 브랜치를 8081로 띄워 확인했다(V1~V20
    적용). 테스트 사용자(이메일 인증 메일이 외부 서비스라 DB에 직접 생성)로 가입 직후 집만 열림 → 테마 1개 완료(실제 단계 API) 후
    카페 열림 → 완료 3개 후 상점 열림을 API로 확인했고, 브라우저 마을에서 열린 집·상점 클릭은 `/chat/home`·`/chat/shop`으로
    이동하고 잠긴 상점 클릭은 이동하지 않았다. 완료 3개 상태는 테마가 DB에 2개뿐이고 하루 1테마 제한이 있어서 임시 DB에 확인용
    테마·진행 행을 직접 넣어 만들었다. 임시 DB와 서버는 지웠다.
  - 아직 안 한 것: `V20` 백필의 열린 시각 값 검증, 해금 피드백(토스트). 개발 DB의 `V20` 적용은 사용자가 직접 `docker compose up --build`로
    띄워 확인하기로 했다(이 세션에서는 임시 DB로만 확인).
  - 다음 할 일(확정 전 포함):
    - 집 내부 화면(별도 작업). 열린 집은 지금 `/chat/home` 뼈대로 이동하고, `home` 주민이 있는지는 확인하지 못했다.
    - 해금 피드백(토스트), 건물 자동 생성 연출.
    - DB 테마 추가: 지금 2개뿐이라 상점 조건(완료 3개)을 아무도 채울 수 없다.
    - 하드코딩 줄이기(범위 미정, 구역 분리·친구 집 설계와 함께 정할 예정): 건물 목록·열림 조건(백엔드 `VillageBuilding`
      enum), 건물 위치·색·간판·3D 모양(프런트 `villageBuildings.ts`·`villageScenery3d.ts`), 테마 순서(지금은 테마 ID 순,
      `V6` 마이그레이션에 직접 적음)가 코드에 고정돼 있다. 후보: 건물 종류와 마을에 놓인 건물(위치·주인)을 나눠 DB로, 3D 모양은
      부품 목록을 시트로 고르는 방식, 테마 목록·순서를 시트와 가져오기 스크립트로(주민 페르소나 `0017`과 같은 틀).
    - 친구 집(같은 집 모양을 여러 채 놓는 구조)과 마을회관(새 모양 필요)은 위 데이터화 설계에서 함께 다룬다. 지금 구조는 건물 하나가
      id 하나에 묶여 있어 친구 집을 못 놓는다.
- 마을 화면에 주민 20명을 표시했다. 목록 API 없이 프런트에 고정해 두었다: `lib/villageResidents.ts`가 주민 시트의 `slug`·이름과
  주민별 5축 외형, 고정 위치(광장 아래 풀밭 5열×4줄)를 갖고, `VillageScene`이 내 캐릭터와 같은 모델로 세워 광장 쪽을 바라보게
  하고 머리 위에 일본어 이름표(Sprite)를 단다. 주민은 내 캐릭터가 통과하지 못하는 충돌 대상이다. 외형은 시트의 "외모·직업"
  설명을 보고 정한 임시 값이다.
  - 검증: prettier·lint·build 통과. 자리가 건물·나무·덤불과 겹치지 않는지 스크립트로 확인했고, 임시 페이지(지움)로 주민과
    이름표가 그려지는 것을 눈으로 확인했다. 로그인한 실제 앱 화면과 20명 전체 외형을 모두 확인하지는 않았다.
  - 다음 할 일: 주민 근접 시 대화 버튼과 `ChatPage` 연결(프런트가 가진 `slug`와 서버 숫자 `id`를 잇는 방법 결정 필요), 건물 안
    주민 배치, 돌아다니는 이동.
- 주민 대화를 마을 화면과 연결했다. 대화 API 경로를 숫자 id에서 `slug`로 바꿨다(`POST /api/residents/{slug}/chat`, `ResidentRepository.findBySlug`).
  프런트가 가진 주민 키(slug)가 시트·DB를 잇는 안정적인 키라 DB를 다시 만들어도 어긋나지 않기 때문이다. 마을에서 주민 2칸
  안으로 다가가면 화면 아래에 "○○と話す" 버튼이 뜨고(자동 시작 아님), 누르면 `/chat/:residentSlug`로 이동한다. `ChatPage`는 입력
  도우미로 쓴 일본어를 보내고 대사와 한국어 번역을 이어서 보여준다(스타일은 최소한).
  - 검증: backend `spotlessApply`·`test` 통과, frontend prettier·lint·build 통과. 로그인한 실제 앱에서 버튼 → 대화 호출까지는
    확인하지 않았다(Gemini 호출 포함).
  - 알려진 문제: 카페 간판 클릭은 아직 `/chat/cafe`로 이동하는데 slug가 아니라 "주민을 찾을 수 없습니다"가 뜬다(건물 입장 화면과
    건물 안 주민 배치가 생기면 교체). 대화 기록 저장·친밀도 표시·음성 입력은 아직 없다.
- 건물 입장을 간판 클릭 외에 "문 앞으로 걸어 들어가기"로도 가능하게 했다. `findDoorAt`(`lib/villageBuildings.ts`)이 문 폭(1.1) 안쪽에서
  +z 벽에 붙어 있는지 판정하고, `VillageScene`이 매 프레임 벽 쪽(-z)으로 걷는 중이며 열린 건물이면 `onEnterBuilding`을 한 번 호출한다.
  잠긴 건물은 반응하지 않고, 건물 옆을 스쳐 지나가도 들어가지지 않는다.
  - 검증: prettier·lint·build 통과. 실제 앱에서 걸어 들어가는 동작은 아직 눈으로 확인하지 않았다(입장 화면이 없어 지금은 `/chat/건물id`로 이동).
- 마을에서 마지막으로 서 있던 위치를 서버에 저장하고 복원하게 했다(`0020`). `users.village_x/z`(`V21`), `GET/PUT /api/village/position`.
  프런트는 마을을 떠날 때·탭이 숨겨질 때·페이지를 닫을 때만 저장(keepalive)하고, 마을은 위치를 받아 온 뒤에 그린다. 저장된 자리가
  막혀 있거나 조회가 실패하면 기본 시작 위치에서 시작한다.
  - 검증: backend `spotlessApply`·`test`(위치 API 4개 추가) 통과, frontend prettier·lint·build 통과. 로그인한 실제 앱에서
    걷고 새로고침해 복원되는 것까지는 아직 눈으로 확인하지 않았다.
- 문 앞 자동 입장을 Enter 키 입장으로 바꿨다. 리뷰에서 "화면 오른쪽 키도 `dz < 0`이라 벽을 따라 걷다 문 앞을 지나가면 입장된다"는
  버그가 나왔고, 키 입력 방향으로 의도를 추측하는 방식 자체가 불안정해서 주민 대화와 같은 방식으로 맞췄다. 열린 건물의 문 앞에
  서면 `VillageScene`이 `onNearBuildingChange`로 알리고, 마을 화면이 "○○に入る (Enter)" 버튼을 띄운다(Enter 키 또는 클릭으로
  입장, 주민 대화 버튼이 떠 있으면 숨김). 문 너비는 `DOOR_WIDTH` 하나를 3D 문과 판정이 함께 쓴다. 간판 클릭 입장은 그대로다.
  - 검증: prettier·lint·build 통과. 실제 앱에서 문 앞 버튼·Enter 입장은 아직 눈으로 확인하지 않았다.
  - 남은 리뷰 권고: 로그아웃 시 위치 저장 실패, 저장 요청 중복, 서버 검증 범위(±17)와 `MAP_HALF_SIZE` 연동 주석, Javadoc 보완.
- 마을 마지막 위치를 `users` 컬럼에서 별도 표 `user_village_position`으로 옮겼다(`V22`, 이미 적용된 V21의 값을 옮기고 컬럼 삭제).
  저장은 upsert 한 번이라 `users`를 읽거나 갱신하지 않는다. 프런트는 저장을 `TownPage`로 모으고 30초 주기·변경 시에만·탭
  숨김/닫기·마을 이탈·로그아웃 직전에 저장한다(리뷰 권고였던 로그아웃 저장 실패, 중복 저장, 범위 연동 주석, Javadoc 반영).
  - 검증: backend `spotlessApply`·`test`, frontend prettier·lint·build 통과. 빈 DB에서 V1~V22를 적용하는 것은 테스트로
    확인했지만, V21 데이터가 있는 기존 로컬 DB에서 V22가 값을 옮기는지와 실제 앱 동작은 아직 확인하지 않았다.

## 2026-11-09

- 학습 단어장 저장·조회를 만들었다(`0021`). 테마의 단어·표현 단계를 완료하면 그 단계의 단어가 `user_vocabulary`에 자동 저장되고,
  `GET /api/vocabulary`로 최근 저장 순 조회, 프런트 `/vocabulary` 화면에 표기·읽는 법·뜻·JLPT 레벨이 보인다.
  - 백엔드: `V23__create_vocabulary_table.sql`, `vocabulary/`(엔티티·저장소·`VocabularyService`·컨트롤러·DTO). 뜻·읽는 법은
    `theme_vocabulary`의 사전 데이터를 복사한다. 사용자+표기+읽는 법이 같으면 중복 저장하지 않는다. 처음엔 `ThemeController`에서
    호출했다가 단계 완료와 한 트랜잭션이 되도록 `ThemeService.completeStage` 안으로 옮겼다.
  - 프런트: `api/vocabulary.ts`, `VocabularyPage`(로딩·에러·빈 목록 처리).
  - 검증: `spotlessApply`·`test` 170개 통과(실패 0). 새 테스트는 `VocabularyServiceTest` 5개, `ThemeServiceTest` 2개 추가,
    `VocabularyControllerIntegrationTest` 5개(실제 Postgres). 프런트 prettier·lint·build 통과. 실제 서버(8081)와 프런트(5174)를 임시 DB로
    띄워 한자 단계는 저장 없음, 단어 단계 완료 후 3개 저장, 브라우저 `/vocabulary`에 표시되는 것을 확인했고 임시 DB·서버는 지웠다.
    화면에서 퀴즈를 직접 풀어 완료하는 경로와 단어가 많을 때의 레이아웃은 확인하지 않았다.
  - 아직 안 한 것: 대화 중 단어 저장(대화 기능이 없고, 뜻·읽는 법은 사전 API로 조회해야 함), 검색·레벨 필터·복습(UI 상세 미정),
    같은 단계 동시 완료 시 유니크 제약 예외 처리.
  - 정하지 않은 것: 기능이 생기기 전에 이미 단어·표현 단계를 끝낸 사용자의 단어(과거 학습분)를 어떻게 채울지(백필 / 조회 시 계산 / 안 채움),
    "오늘 배운" 단어만 따로 보는 기준, 사전 데이터가 바뀔 때 단어장 사본을 갱신할지. 자세한 내용은 `0021`.
- 단어장 코드 리뷰(REVIEW_PASSED) 권장 사항을 반영했다. 같은 단계 동시 완료 시 유니크 위반을 500 대신 409로 응답하는 전역 핸들러를 추가했고
  (`GlobalExceptionHandler`, SQLState 23505만), 단어장 카드에 긴 텍스트 줄바꿈 CSS를 넣었다. 통합 테스트는 건수(3→5)를 직접 검증하도록 보강하고
  이미 저장된 단어·WORD/EXPRESSION 교차·같은 단계 내 중복이 예외 없이 건너뛰어지는 테스트를 추가했으며, 핸들러 단위 테스트 4건을 더했다.
  - 검증: `spotlessApply`·`test` 175개 통과(실패 0), 프런트 prettier·lint·build 통과. 실제로 두 요청을 동시에 보내 409를 확인하지는 않았다.
  - 남김: `saveThemeWords` 반환값(개수)은 운영 코드에서 쓰이지 않지만 테스트가 쓰고 있어 유지했다.
- 단어장 저장의 N+1을 없애고 동시 완료 충돌 메시지를 단어장 전용으로 바꿨다(`0021`). 이미 있는 단어를 한 번의 조회로 가려내 `saveAll`로
  저장하고(같은 배치 중복도 집합으로 거름), 유니크 위반은 전역 핸들러 대신 `VocabularyService`가 `VocabularyErrorCode.SAVE_CONFLICT`(409)로 바꿔
  던진다. 전역 핸들러와 그 테스트는 제거했다. 쓰이지 않게 된 `existsBy...`도 삭제했다.
  - 검증: `spotlessApply`·`clean test` 191개 통과(실패 0). `VocabularyServiceTest`를 새 구조에 맞게 고치고 조회 1회 호출·같은 배치 중복·읽는 법만 다른
    단어·충돌 시 409와 전용 메시지·단어 0개 케이스를 추가했다. 두 요청을 실제로 동시에 보내 409를 확인하지는 않았다.
  - 확인한 사실: 탈퇴는 상태만 바꾸는 소프트 삭제이고 같은 이메일로 재가입하면 같은 `users` 행이 되살아나 기존 단어장 등이 복원된다(코드로 확인).
    의도된 복구인지는 정하지 않았다(`0021` 참고).

## 2026-11-09 (CI)

- GitHub Actions CI를 추가했다(`0022`). PR과 `master` 푸시마다 백엔드(`spotlessCheck`·`test`)와 프런트(`prettier --check`·`lint`·`build`)를
  병렬로 돌린다. PR에 자동 체크가 없다는 점과, 비공개 무료 플랜이라 브랜치 보호 규칙을 못 쓴다는 점이 배경이다.
  - 검증: 키·`.env`·환경변수 없이 새로 내려받은 복사본에서 같은 명령을 돌려 백엔드 173개 테스트(실패 0)와 프런트 통과를 확인했다.
    실제 GitHub Actions 실행은 이 PR에서 확인한다(Java 25 설치, runner의 Docker로 Testcontainers 등).
  - 다음 할 일: 실제 실행 시간과 월 무료 시간(2,000분) 대비 사용량 확인. 실패 시 병합 차단은 못 한다(경고만).

## 2026-11-09 (건물 접근)

- 테마 완료 없이도 처음부터 모든 건물(집·카페·상점)에 들어갈 수 있게 바꾸고, 그 해금 장치를 모두 걷어냈다.
  - 백엔드: `user_building` 테이블을 `V24`로 삭제하고 `UserBuilding`·`UserBuildingRepository`·건물별 필요 완료 테마 수·`unlockBuildings`를 제거했다.
    `VillageService.getBuildings()`는 DB 없이 항상 3개 모두 `unlocked=true`로 응답한다(API 모양은 그대로라 프런트 변경 없음).
    `ThemeService`의 건물 해금 호출·`VillageService` 의존성도 제거했다.
  - 테스트: 해금 관련 테스트(마일스톤·`ThemeService` 해금 호출 검증)를 지우고 `VillageServiceTest`로 교체했다. V20 백필 마이그레이션 테스트는 과거 마이그레이션 검증이라 유지했다.
  - 검증: `spotlessApply`·`test` 통과. 프런트는 변경이 없고, 실제 앱을 띄워 확인하지는 않았다.
  - 참고: 삭제된 `user_building` 데이터는 복구할 수 없지만 모두 열림이라 잃는 정보는 없다. `0019` 결정 문서는 과거 기록으로 두었고, 마일스톤 방식으로 되돌리려면 테이블부터 다시 만들어야 한다.
  - 프런트: 간판 잠김 표시("準備中")·열림 판단·`getVillageBuildings` 호출을 제거해 모든 건물이 처음부터 눌러지고 문 앞 입장 버튼도 항상 동작한다.
    더 쓰이지 않는 `GET /api/village/buildings`와 `VillageBuilding`·`VillageBuildingResponse`·`VillageService.getBuildings`도 백엔드에서 지웠다.
    검증: 백엔드 `spotlessApply`·`test`, 프런트 `prettier`·`lint`·`build` 통과. 브라우저로 간판 클릭을 직접 확인하지는 않았다.

## 2026-11-10 (해금 잔여 코드 정리)

- 해금 제거 후 남은 불필요한 코드를 지웠다: `ThemeProgressRepository.countByUserIdAndCompletedTrue`(호출처 없음), 삭제된 테이블의 백필을 검증하던
  `UserBuildingMigrationTest`(V20 SQL은 Flyway 이력 때문에 유지), 파일이 `package-info.java` 하나뿐이던 빈 `town` 패키지.
  `requirements.md`의 해금 문구(섹션 제목·자동 생성·"다 열린 뒤"·해금 피드백)를 정리하고 `0019`는 폐기 표시했다.
  - 검증: `spotlessApply`·`test` 결과는 아래 커밋 시점 기준. 안 정한 것: 건물↔담당 주민 연결(입장 시 `/chat/{건물id}` 문제), 건물 데이터화 여부.

## 2026-11-10 (건물 데이터화)

- 건물 정보를 구글 시트→DB→API로 옮겼다(`0023`). `V25`로 `building` 테이블(시드 3개)과 `resident.work_building`(카페=r05, 상점=r03)을 만들고,
  `GET /api/village/buildings`가 위치·크기·색·간판 이름과 입장 시 만날 주민 slug를 준다. 프런트는 건물을 서버에서 받은 뒤 길·나무·꽃 배치와
  충돌·문 앞 판정을 계산하며, 건물 입장은 `/chat/{주민 slug}`로 가고 소속 주민이 없는 건물(집)은 입장 버튼이 뜨지 않는다.
  `scripts/import-buildings`를 새로 만들고 `import-residents`에 `building` 열을 추가했다(열이 없으면 `work_building`을 건드리지 않음).
  - 검증: 백엔드 `spotlessApply`·`test`, 프런트 `prettier`·`lint`·`build` 통과. 격리한 DB·서버로 실제 기동해 API 응답, 마을 화면(간판·길·나무),
    상점 간판 클릭 → `/chat/r03`, 집 간판 클릭 → 이동 없음을 확인했다. 두 스크립트는 샘플 CSV로 생성·검증 실패 동작을 확인했다.
  - 아직 안 한 것: 실제 구글 시트·게시 CSV 주소(사용자가 준비), 시트로 실제 SQL을 만들어 시드와 같은지 확인, 건물 내부 화면, 주민 이동·일과.

## 2026-11-10 (건물·주민 장소 연결, 마을 확장)

- 주민 시트에 `location`(장소 이름)을 추가한 것에 맞춰 건물↔주민 연결을 `location` 문자열 일치로 바꿨다(`0023`). 건물 시트에도 `location` 열을 넣고,
  주민 시트가 쓰는 12곳과 내 집까지 13개 건물을 시트에 추가했다(쓰는 주민이 없던 일반 상점은 제외). `V25`는 테이블·열만 만들도록 바꾸고
  (시드 삭제), 데이터는 스크립트가 시트에서 만든 `V26`(주민, `location` 포함)·`V27`(건물)로 넣는다. `resident.work_building`은 `location`으로 대체했다.
  `import-residents`는 `location` 열을, `import-buildings`는 `location` 열(중복 금지)을 다룬다.
- 건물 13개가 두 줄로 들어가도록 마을을 넓혔다(이동 범위 ±17→±21, 나무·꽃·덤불 수와 숲 범위 조정).
  - 검증: 백엔드 `spotlessApply`·`test`, 프런트 `prettier`·`lint`·`build` 통과. 격리한 DB·서버로 실제 기동해 건물 13개와 주민 연결을 확인하고,
    카페 간판 → `/chat/r06`, 편의점 간판 → `/chat/r07`을 눌러 확인했다. 건물 겹침·문 앞 막힘·땅 범위는 좌표로 계산해 문제 없음을 확인했다(뒷줄 걸어가기는 직접 해보지 않았다).
  - 주의: 주민 시트의 `location` 열에 `hobby`가 1000행 가까이 채워져 있어(`id` 등은 빈 값) 스크립트를 시트에서 바로 돌리면 검증에서 거부된다.
    이번 SQL은 21행 이후를 뺀 사본으로 만들었다. 시트를 정리해야 한다.
  - 후속: 사용자가 주민 시트의 빈 줄을 정리한 뒤 스크립트를 시트에서 바로 돌려, 주민·건물 SQL이 커밋된 `V26`·`V27`과 같음을 확인했다(새 SQL 없음).

## 2026-11-10 (코드 리뷰 반영)

- 리뷰에서 나온 항목을 고쳤다. 낡은 설명(`village/package-info`, `requirements.md`의 3개 건물·상점 문구, 화면 주석)을 정리하고,
  속한 주민이 없는 건물(집)은 간판 강조·포인터 커서·클릭이 되지 않게 했다. 건물을 못 받으면 마을 대신 오류와 "다시 시도" 버튼을 보여 준다.
  시트 오타로 주민과 건물의 연결이 끊기지 않는지 검사하는 `VillageDataConsistencyTest`를 추가하고, 건물 API 통합 테스트는 넣은 데이터를 끝에 되돌린다.
  - 검증: 백엔드 `spotlessApply`·`test`, 프런트 `prettier`·`lint`·`build` 통과. 화면에서 직접 클릭해 확인하지는 않았다.
  - 안 한 것(외관은 따로 수정하기로 함): 새 건물 간판 색, 쓰이지 않는 상점 장식 코드(`addShop`)·간판 색(`shop`) 정리. 주민 전체를 읽는 `getBuildings`의 열 제한은 주민이 늘면 한다.

## 2026-11-10 (해야 할 일 정리)

- 아직 정하지 않았거나 못 한 건물 관련 일을 `requirements.md`의 체크리스트(4. 마을 건물)와 "아직 안 정한 것"에 옮겼다. 건물 내부 화면, 같은 건물 주민이 여럿일 때의 대화 상대,
  주민의 시간대별 위치·역할, 새 건물 외관이다. 더는 맞지 않는 "건물 해금 시 알림/이펙트" 항목은 지웠다.
  - 다음 할 일: 위 항목 중 먼저 할 것을 정한다(건물 내부 화면이 다른 항목의 바탕이 된다).

## 2026-11-10 (리뷰 2차 반영)

- `requirements.md` 맨 위의 핵심 루프·표에 남아 있던 "테마 완료 → 건물 해금"을 지우고 보상을 꾸미기 아이템 해금으로 고쳤다(건물은 항상 열려 있음).
  마을 건물 불러오기 실패 화면의 "다시 시도" 버튼을 기존 버튼 모양으로 바꾸고, 누르면 오류 문구를 지우고 "마을을 불러오는 중…"을 보여 준다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 화면에서 직접 눌러 보지는 않았다.

## 2026-11-10 (리뷰 사소한 권장 반영)

- `requirements.md`의 "카페 내부에 주인 + 알바생 2명" 예시를 주민 시트 기준 문구로 바꾸고, "집 내부" 항목을 모든 건물의 "건물 내부" 항목으로 합쳐 체크리스트와 겹치지 않게 했다.
  - 안 고친 것: `onEnterBuilding`의 `residentSlug` 검사는 URL을 만들 때 필요한 조회라 그대로 뒀다. 테스트가 클래스마다 PostgreSQL 컨테이너를 따로 띄우는 것은
    다른 통합 테스트와 같은 방식이고 공통 컨테이너로 바꾸면 모든 통합 테스트를 건드려야 해서, 테스트가 더 늘 때 별도 작업으로 한다.


## 2026-11-10 (건물 내부 화면)

- 건물에 들어가면 대화 화면으로 바로 가던 것을, 건물 특성에 맞게 꾸민 방(`/town/buildings/{건물 id}`)으로 들어가게 했다. 방 안을 걸어다니다
  주민에게 다가가면 대화 버튼, 현관 매트에 서면 나가기 버튼(Enter)이 뜬다. 집도 들어갈 수 있어 간판·문 앞 버튼의 "주민이 있는 건물만" 조건을 없앴다.
  결정 배경은 `docs/decisions/0024-building-interior-lowpoly-room.md`.
  - 건물 13곳의 가구 배치는 `lib/buildingInteriors.ts`(값 목록), 가구 30종의 모양은 `lib/buildingInterior3d.ts`, 장면은 `components/InteriorScene.tsx`,
    화면은 `pages/BuildingInteriorPage.tsx`다. 마을과 방이 같이 쓰는 방향키 표·이름표·속도 값은 `lib/sceneCommon.ts`로 옮겼다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 로그인 없는 임시 페이지로 13곳과 기본 방의 모양을 눈으로 확인했고, 건물마다 입구에서 주민 대화 거리와
    현관까지 걸어갈 수 있는지를 격자 탐색으로 확인했다. 현관 판정은 키 입력으로 확인했다. 임시 페이지는 커밋하지 않았다.
  - 확인 못 한 것: 로그인한 실제 화면에서 마을 → 건물 → 대화 → 마을로 이어지는 흐름, 주민 앞에서 대화 버튼이 뜨는 것(키 입력으로는 보지 못함).
  - 다음 할 일: 같은 건물 주민 여러 명 배치, 가구 배치의 시트 이전 여부 결정, 대화 화면에서 건물 안으로 돌아가기.

## 2026-11-10 (건물 내부 카메라)

- 건물 내부가 어두운 배경 위에 작게 떠 보인다는 의견에 따라, 방을 가까이서 보고(세로 9칸) 카메라가 내 캐릭터를 따라가게 바꿨다. 카메라는 방 가운데 범위 안에서만
  따라가고, 벽은 위쪽 끝이 보이지 않게 높였다. 장면이 헤더 아래에서 시작하도록 `InteriorScene.module.css`를 따로 뒀다. 비교한 시점은 `0024`에 적었다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 임시 페이지에서 카페·집의 시작 화면을 눈으로 확인했다.
  - 확인 못 한 것: 걸어다닐 때 카메라가 부드럽게 따라오는지(미리보기 창이 느리게 돌아 키 입력으로는 조금씩만 움직였다), 로그인한 실제 화면의 전체 흐름.
- 방 옆·아래로 보이던 어두운 바깥 영역을 없앴다. 바닥과 두 벽을 방보다 훨씬 길게 그려 화면 전체가 방으로 채워진다. 걸을 수 있는 범위는 그대로(10 × 8)라
  끝 너머의 바닥에는 들어갈 수 없다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 임시 페이지에서 카페 시작 화면에 빈 배경이 없는 것을 눈으로 확인했다. 방 구석까지 걸어가서 보지는 않았다.
- 방 안이 좁다는 의견에 따라 방을 10 × 8에서 13 × 10.5로 넓혔다(벽이 없는 오른쪽·앞쪽으로). 가구 배치는 그대로이고 현관 매트와 카메라 범위를 새 크기에 맞췄다.
  방 크기 값은 `ROOM`(최소·최대 좌표) 하나로 바꿨다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 건물 14곳(기본 방 포함)에서 입구→주민 대화 거리→현관이 이어지는지 격자 탐색으로 확인했고, 카페·도서관 시작 화면을 눈으로 봤다.
  - 다음 할 일: 넓힌 빈 바닥에 놓을 가구를 건물별로 더할지 정한다.
- 넓힌 방을 채우는 방법으로 "가구 크게"를 골랐다. 원래 배치(10 × 8)를 그대로 두고 `ROOM_SCALE`(1.3)로 방·가구·간격을 함께 키운다(방은 13 × 10.4).
  가구 목록은 배치 좌표, 캐릭터 이동과 화면은 월드 좌표를 쓰고 충돌·현관·주민 자리 계산에서 둘을 맞춘다. 대화 가능 거리도 같은 배율로 늘렸다.
  앞 항목에서 방을 오른쪽·앞쪽으로만 넓혔던 것은 이 방식으로 대체했다. 비교한 선택지는 `0024`에 적었다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 건물 14곳(기본 방 포함)에서 입구→현관이 이어지고 주민 정면(계산대 앞)에서 대화 거리 안에 들어오는 것을
    격자 탐색으로 확인했다. 카페·라면집 시작 화면을 눈으로 봤다.
  - 확인 못 한 것: 직접 걸어다니는 느낌, 로그인한 실제 화면의 마을 → 건물 → 대화 흐름.

## 2026-11-10 (현관 매트 위치)

- 현관 매트가 방 한가운데 빈 바닥 위에 떠 있는 것처럼 보인다는 의견을 확인했다. 매트는 이미 바닥에 붙어 있었고(높이 0.02), 방 앞쪽에 문·벽이 없어 바닥이 화면 끝까지
  이어지는 탓에 그렇게 보였다. 높이를 더 내리면 바닥에 묻히므로, 방 앞쪽 가장자리에 낮은 문턱(높이 0.25)을 두르고 매트 자리만 비워 매트가 현관 틈에 놓이게 했다.
  `buildingInterior3d.ts`만 바꿨고 가구 배치·입장·나가기 판정은 그대로다. 비교한 안(뒷벽에 문 달기, 위치 값만 이동)은 채택하지 않았다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 임시 페이지(커밋하지 않음)에서 카페 화면을 눈으로 확인했다. 문턱 틈과 나가기 판정 범위는 같은 폭(1.6)을 쓴다.
  - 확인 못 한 것: 로그인한 실제 화면, 건물 13곳 전부의 모양(카페만 확인).
- 문턱 사이 현관 틈(매트)이 좁다는 의견에 따라 폭을 1.6에서 2.4로 넓히고, 나가기 판정 폭(`EXIT_HALF_WIDTH`)도 1에서 1.5로 같이 키웠다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 이번 변경은 화면으로 직접 보지 않았다.
- 현관 매트를 화면 맨 아래에 두라는 의견에 따라 앞쪽 문턱(방금 전 항목)을 없애고 방식을 바꿨다. 방 앞쪽을 깊게 늘려(배치 좌표 세로 8 → 10.5) 화면 전체가
  걸을 수 있는 바닥이 되게 하고, 매트는 방의 맨 아래 꼭짓점(앞·오른쪽) 안쪽에 화면 가로 방향으로 깔았다. 캐릭터는 매트에서 방 안쪽을 보고 시작하고, 나가기 판정은
  매트 모양(회전한 직사각형)에 맞췄다. 카메라는 캐릭터를 따라가되 그 꼭짓점이 화면 아래 끝에 닿는 곳에서 멈춰 방 밖의 빈 바닥이 보이지 않는다(`CAMERA_BOTTOM_LIMIT`).
  앞의 카메라 따라가기 범위 상수(`CAMERA_RANGE_X/Z`)는 이 방식으로 대체했다. 매트 값은 `ROOM_MAT`(`buildingInteriors.ts`) 하나에 모았다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 임시 페이지(커밋하지 않음)에서 카페 시작 화면(매트가 화면 맨 아래)과 매트까지 걸어가 나가기 판정이 켜지는 것을 확인했다.
  - 확인 못 한 것: 카페 외 건물 13곳의 모양, 아주 넓거나 좁은 화면, 로그인한 실제 화면, 같은 구간의 가구 충돌(앞쪽은 가구가 없는 빈 바닥이다).
- 늘린 방 앞쪽(현관 매트 쪽)이 비어 보여 건물 13곳과 기본 방의 앞쪽에 가구를 더했다. 건물 특성대로 채웠다(카페·빵집·라면집은 손님 탁자, 학교는 책걸상 줄, 오토바이 가게는 오토바이·타이어,
  절은 방석·등롱·족자, 술집·찻집은 좌식 자리 등). 입장 위치에서 방 안쪽으로 이어지는 대각선 통로와 매트 둘레는 비워 뒀다. 값은 `lib/buildingInteriors.ts`의 건물별 가구 목록에 더했다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 14곳 모두 입장 위치가 막히지 않고 주민 대화 거리에 닿으며 걸을 수 있는 바닥의 97~99%에 걸어서 닿는지 격자 탐색으로 확인했다.
    임시 페이지(커밋하지 않음)에서 카페·오토바이 가게·학교 시작 화면을 눈으로 봤다.
  - 확인 못 한 것: 나머지 건물 10곳의 화면 모양, 로그인한 실제 화면. 가구 사이 좁은 틈(걸어서 닿지 못하는 1~3%)이 어색하지 않은지.

## 2026-11-10 (건물 내부 리뷰 반영)

- 코드 리뷰에서 나온 세 가지를 고쳤다.
  - 나가기·대화 버튼을 화면 아래 가운데에서 헤더 바로 아래로 옮겼다(맨 아래로 옮긴 현관 매트와 그 위의 캐릭터를 가리던 문제). 카메라 아래 한계에는
    `CAMERA_BOTTOM_MARGIN`(0.8)을 두어 꼭짓점 가까이 선 캐릭터의 발이 화면 끝에 잘리지 않게 했다. 그 대신 매트 아래에 방 밖 바닥이 조금 보인다.
  - 방 안 주민이 현관(입장 위치) 쪽을 바라보게 했다. 매트를 옮긴 뒤로 기본 방향(+z)을 보고 있었다.
  - 쓰이지 않는 `ROOM_CENTER`를 지우고, `0024`의 방 크기(13 × 13.65)·카메라 따라가기 범위·현관 매트 위치 결정을 현재 동작에 맞게 고쳤다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 임시 페이지(커밋하지 않음)에서 카페 시작 화면에서 매트 아래 여유를 눈으로 확인했다.
  - 확인 못 한 것: 버튼 위치(로그인한 실제 화면이 필요해 임시 페이지에는 버튼이 없다)와 주민이 바라보는 방향을 화면으로 보지 못했다.
  - 리뷰에서 나왔지만 이번에 안 고친 것: `getBuildingInterior`의 일반 객체 조회(`constructor` 같은 id), 건물 정보 재시도 버튼, 좌표 계산 테스트, 카메라 한계와 `CAMERA_OFFSET`의 숨은 의존.
- 리뷰에서 남겨 둔 작은 항목 셋을 고쳤다. `getBuildingInterior`는 `constructor`·`toString` 같은 id가 `Object.prototype`의 값을 돌려주지 않도록 자기 속성만 보게 했고
  (프로젝트의 `lib`이 ES2020이라 `Object.hasOwn` 대신 `hasOwnProperty.call`), 건물 안 화면에 "다시 시도" 버튼을 마을 화면과 같은 방식으로 더했다.
  `0001`의 "테스트: Vitest" 줄은 2026-11-04에 제거한 사실에 맞게 고쳤다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 이 id들이 기본 방으로 가는 것을 임시 스크립트로 확인했다. 재시도 버튼은 화면으로 보지 않았다(서버 오류를 일부러 내야 보임).

## 2026-11-11 (마을 배치·주민 위치와 외형)

- 주민 위치: 건물에 속한 주민은 건물 안에만 있고(인원 제한 없음), 속하지 않은 주민 6명만 마을 길 위에 선다. 건물 목록 응답에 `residentSlugs`를 더했다.
- 주민 외형: 주민마다 체형 배율과 소품을 두었다(`lib/villageResidents.ts`, `lib/residentAccessories.ts`).
- 마을 배치: 땅을 ±39로 넓히고 큰길과 골목(`VILLAGE_ROADS`)을 따라 건물 13개를 흩어 놓았다. 건물 방향 `rotation`을 DB(`V28`·`V29`)·응답·import 스크립트에 더했다(`0025`, 검토 중).
  - 검증: 프런트 `prettier`·`lint`·`build` 통과. 건물이 길·다른 건물과 겹치지 않는지는 좌표 계산으로만 확인했다.
  - 확인 못 한 것: 마을과 건물 안 화면을 눈으로 보지 못했다(소품 위치, 건물 방향, 길 모양, 나무 배치).
  - 다음 할 일: 구글 시트에 `rotation` 열과 새 좌표 반영, 길거리 주민 걷기, 건물 안 주인·손님 자리.
- 코드 리뷰(불필요한 코드)를 반영해 정리했다. 쓰이지 않던 `residentSlug`(단수) 필드를 응답·프런트 타입·테스트에서 지웠다(`residentSlugs`만 남김). 쓰이지 않던 `shop` 건물 장식과 의미 없는 줄,
  필요 없던 export를 지웠다. 회전 계산(`toRotatedLocal`)과 주민 모델 생성(`createResidentModel`, `sceneCommon.ts`)의 중복을 하나로 합쳤고, 옛 동작("문 앞에 선다" 등)을 설명하던 주석을 고쳤다.
  건물 안 주민 자리는 입장 지점 곁을 피하게 했고, 집의 옆 창문은 양쪽 옆벽에 달아 건물이 돌아가도 카메라 쪽에 보이게 했다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과, 백엔드 `spotlessApply`·컴파일 통과. 백엔드 테스트는 qa-tester로 확인한다.
  - 확인 못 한 것: 화면. 집 창문과 주민 자리 변경은 눈으로 보지 못했다.
- 땅 크기를 서버 한 곳(`VillageMap.HALF_SIZE`)에서 정하게 했다. 위치 저장 검증은 이 상수를 쓰고, 프런트는 `GET /api/village/map`으로 받아 이동 범위·풍경(식물·숲·풀밭) 범위를
  정한다(프런트의 `MAP_HALF_SIZE`·`PLANT_LIMIT`·숲 상수를 없앴다). 건물 좌표가 땅 안인지는 `VillageDataConsistencyTest`가 같은 상수로 검증한다(qa-tester가 추가).
  - 검증: 프런트 `prettier`·`lint`·`build` 통과, 백엔드 `spotlessApply`·컴파일 통과. 백엔드 테스트는 qa-tester로 확인한다.
  - 확인 못 한 것: 땅 크기를 응답으로 받는 마을 화면(로그인한 실제 화면).
- 구글 시트(건물 탭)에 `rotation` 열(J)을 추가하고 건물 13개의 x, z, rotation을 새 배치 값으로 바꿨다. import 스크립트를 다시 돌려 읽히는지 확인했고, 생성된 SQL이 `V29`와 값이 같아서
  (같은 값을 다시 쓰는 upsert라 필요 없다) 커밋하지 않고 지웠다. 앞으로 시트를 고쳐 import하면 새 번호(`V30`부터)의 SQL이 만들어진다.
- 코드 리뷰(땅 크기 변경 이후)를 반영했다. 서버가 `GET /api/village/map`에 `maxWalkCoordinate`(설 수 있는 가장 바깥 좌표)도 내려주고 프런트의 이동 한계가 이 값을 쓴다(프런트의 `mapHalfSize - 1` 규칙을 없앰).
  저장된 마지막 위치가 땅 밖이면 기본 시작 위치에서 시작하게 했다. 옛 결정 문서(`0023`, `0024`)의 `residentSlug` 설명에 `0025`에서 `residentSlugs`로 바뀐 사실을 덧붙였고, `0025`에 땅 크기를 바꿀 때 함께 고칠 곳을 구체적으로 적었다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과, 백엔드 `spotlessApply`·컴파일 통과. 백엔드 테스트는 qa-tester로 다시 확인한다.

## 2026-11-11 (남은 일 정리)

- PR #28 머지 뒤 남은 일을 `docs/chat-todo.md`에 정리했다. "마을 화면의 주민" 절을 현재 상태로 갱신했고(옛 격자 배치·카페 간판 항목 제거), "마을 배치·건물" 절을 새로 더했다.
  - 남은 일: 마을 화면 확인, 거리 주민 걷기, 건물 안 주인·손님 자리, 렌더 성능, 길 데이터 위치, 테스트 보완, `0025` 확정.
  - 검증: 문서만 바꿨다.

## 2026-11-11 (주민 대화 모달)

- 주민 대화를 `/chat/:residentSlug` 페이지 이동 대신 현재 화면 위 모달(`components/ResidentChatModal.tsx`)로 바꿨다. 마을(`TownPage`)과 건물 안(`BuildingInteriorPage`) 모두 같은 모달을 쓰고, `ChatPage`와 `/chat` 라우트는 지웠다.
  닫기 버튼·배경 클릭·Esc로 닫으며, 모달이 열려 있는 동안에는 Enter로 건물에 들어가거나 나가지 않는다. 새 라이브러리는 쓰지 않았다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과.
  - 확인 못 한 것: 실제 화면(모달 모양, 3D 장면이 모달 뒤에서 계속 도는지, 모달 입력 중 캐릭터가 걷지 않는지).

## 2026-11-11 (주민 대화 음성 입력)

- 주민 대화 모달(`ResidentChatModal`)에 🎤 말하기 버튼을 더했다. 인식한 일본어를 입력란에 채우고, 사용자가 확인·수정한 뒤 "보내기"로 전송한다(오인식 방지를 위해 자동 전송 안 함).
- 음성 인식·합성은 이미 테마와 무관한 공통 모듈(`lib/speechRecognition.ts`, `lib/speechSynthesis.ts`)이라 인터페이스는 만들지 않았다(구현체가 하나뿐이라 과한 추상화). 대신 화면 쪽 중복 상태(듣는 중, 오류 메시지)를
  `hooks/useSpeechRecognition.ts` 훅으로 모아 테마 학습·주민 대화가 함께 쓴다. 테마 학습 동작은 그대로다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과.
  - 확인 못 한 것: 실제 마이크 입력(브라우저 권한·Chrome 인식). 테마 학습 말하기 화면이 훅으로 바꾼 뒤에도 그대로 동작하는지.
  - 다음 할 일: 대화에 발음 체크를 쓸지 결정, 주민 음성(TTS) 연결.
- 음성 입력은 말하면 바로 전송되게 바꿨다(200자를 넘으면 입력란에 채워 고치게 둠). 주민 답장도 `speakJapanese`(서버 음성, 실패 시 브라우저 음성)로 읽어 주고, 마이크를 켜거나 대화창을 닫으면 읽던 음성을 멈춘다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과.
  - 확인 못 한 것: 실제 마이크·소리. 자동 전송이라 오인식도 그대로 전송된다.
- 주민마다 목소리가 다르게 들리게 했다. 주민 상수에 `voice: { pitch, rate }`를 더하고(20명, 설명을 보고 정한 첫 추정값), `speakJapanese(text, voice?)`가 `voice`를 받으면 서버 음성 대신 브라우저 내장 음성에 그 값을 적용한다(`0026`, 검토 중). 테마 학습 읽기는 그대로다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과.
  - 확인 못 한 것: 실제 소리. 값 조정이 필요하다.
- 코드 리뷰(음성 입력·주민 목소리)를 반영했다. 대화창을 닫은 뒤 도착한 답장은 읽지 않고, 전송 중복은 ref로 막으며 직접 보낼 때 마이크를 끈다. 훅은 중복 시작을 ref로 막고 쓸모없던 `useCallback`·`cancel` 래퍼를 없앴다(취소는 `lib`의 `cancelSpeechRecognition`을 직접 쓴다).
  `speechRecognition.ts`는 이전 인식의 늦은 종료 신호가 새 인식의 취소 핸들을 지우지 않게 하고 `start()` 예외를 처리한다. 테마 학습은 다음 문제로 넘어갈 때 듣던 인식을 멈춘다. 빈 인식 결과는 안내 문구를 보인다. 주민 `voice`는 부모가 prop으로 넘긴다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과.
  - 확인 못 한 것: 실제 마이크·소리, 테마 학습과 대화를 번갈아 쓸 때의 동작.
- 주민 대화 기록을 서버에 저장하게 했다(`0027`, 검토 중). `chat_message` 테이블(`V30`)·`ChatMessage` 엔티티·`ChatMessageRepository`를 더하고, `ChatService.chat`이 대답을 받은 뒤 플레이어의 말과 주민의 대답을 함께 저장한다.
  `GET /api/residents/{slug}/chat`이 최근 50줄을 오래된 순으로 주고, 대화창을 열 때 불러와 보여 준다.
  - 검증: 백엔드 `spotlessApply`·`test` 통과(서비스 단위 테스트 4개 추가: 저장, 실패 시 미저장, 순서 뒤집기, 주민 없음 404), 프런트 `prettier`·`lint`·`build` 통과.
  - 확인 못 한 것: 실제 화면과 새 GET 엔드포인트의 컨트롤러 통합 테스트(없음). 마이그레이션은 Testcontainers 통합 테스트로 적용됨.
- 대화 기록 코드 리뷰를 반영했다. `created_at`을 다른 테이블처럼 `TIMESTAMPTZ`·`OffsetDateTime`으로 맞췄다(이미 적용했을 수 있는 `V30`은 건드리지 않고 `V31`로 바꿈). `ChatControllerIntegrationTest`를 추가해 비로그인 401, 없는 주민 404, 오래된 순 저장·조회, 사용자 간 기록 격리를 실제 Postgres로 확인한다.
  모달은 기록 불러오기 오류를 전송 오류와 따로 보이고 불러오는 동안 안내를 보인다.
  - 검증: 백엔드 `spotlessApply`·`test`, 프런트 `prettier`·`lint`·`build` 통과.
  - 확인 못 한 것: 실제 화면.
- 주민 친밀도를 올리고 화면에 보이게 했다(`0028`, 검토 중). 새 테이블 없이 기존 `resident_friendship`에 `today_gain`·`last_gain_date`(`V32`)를 더했고, 대답을 받은 대화마다 첫 대화 +5·이후 +1·주민당 하루 10(한국 시간)·최대 100으로 오른다(`ResidentFriendship.earnChatGain`).
  `GET /api/residents/friendships`를 추가했고 대화 응답에 `friendshipLevel`·`friendshipGain`을 담는다. 주민 이름표 위에 하트 한 개가 친밀도만큼 아래부터 차오르고(마을·건물 내부), 대화창 헤더에도 하트와 수치, 오른 양(+N)이 보인다.
  - 검증: 백엔드 `spotlessApply`·`test`, 프런트 `prettier`·`lint`·`build` (결과는 아래 확인).
  - 확인 못 한 것: 실제 화면에서 하트가 차오르는 모습과 이름표 위치.
  - 다음 할 일: 친밀도별 말투·비밀 공개, 주민 방문 보상 여부.
- 주민 대화 맥락을 AI에 보내게 했다(`0029`, 검토 중). 이전에는 플레이어의 말 한 줄만 보냈지만, 이제 "요약 메모 + 최근 10줄 + 새 메시지"를 보낸다. 최근 10줄이 넘어 요약 안 된 오래된 줄이 20줄 쌓이면 AI가 요약을 갱신해 `chat_summary`(`V33`)에 저장한다.
  `ChatMemoryService`(불러오기·요약 갱신)를 새로 만들고 `GeminiClient.generate`가 최근 대화를 멀티턴으로 받게 했으며 `summarize`를 더했다. 요약 실패는 대화를 막지 않는다.
  - 검증: 백엔드 컴파일·`spotlessApply` 통과. 테스트는 qa-tester가 진행(결과는 아래 확인).
  - 확인 못 한 것: 실제 Gemini에서 주민이 이전 대화를 기억하는지, 요약 품질·지연.
  - 다음 할 일: 숫자(10/20/600) 조정, 요약이 느리면 비동기화.
- 대화 속도와 기록 화면을 고쳤다(`0029` 수정, `0030`, 검토 중). Gemini 추론을 `MINIMAL`로 낮추고 요약 갱신을 `@Async` 백그라운드로 옮겨 플레이어가 기다리지 않게 했다. 호출 실패 로그에는 원인 예외 클래스명을 더했다.
  대화창은 오늘 대화만 보여 주고, "지난 대화" 버튼으로 날짜별 목록(`/chat/days`)과 그날 대화(`/chat/days/{date}`)를 볼 수 있게 했다(기존 `/chat`의 최근 50줄은 오늘 대화로 바뀜).
  - 검증: 백엔드·프런트 검증 결과는 아래 확인.
  - 확인 못 한 것: `thinkingLevel` 설정을 실제 모델이 받는지와 체감 속도, 실제 화면. 대답이 안 나오던 `GenAiIOException`의 원인(로그에 원인 클래스를 남기게만 했다).
  - 다음 할 일: 속도가 부족하면 더 가벼운 모델 검토.
- 음성 입력이 말 도중에 끊기던 문제를 고쳤다. 브라우저 음성 인식은 기본이 단발이라 말 사이 짧은 쉼에도 바로 끝났다. `continuous`를 켜고 마지막 말 이후 5초(`SILENCE_TIMEOUT_MS`, 처음 2초에서 사용자 요청으로 늘림) 조용하면 직접 마치게 했다(말하는 동안은 타이머를 미룸). 사용자가 취소한 인식은 중간 결과가 전송되지 않게 가린다. 테마 학습 말하기도 같은 함수를 쓰므로 같은 방식이 적용된다.
  - 검증: 프런트 `prettier`·`lint`·`build` 통과.
  - 확인 못 한 것: 실제 마이크(2초가 적당한지, 취소·중복 시작 동작). 값은 써 보며 조정한다.
- 코드 리뷰를 반영했다(`0029` 수정). 요약이 담지 않는 구간의 대화가 AI에 안 가던 결함을 고쳐, 이제 요약 이후의 줄을 모두 보낸다(최대 30줄, 평소 10~19줄). 요약 임계치는 20에서 10줄로 낮췄다. 주민 조회·기록 변환 중복을 정리했고, 지난 대화 화면의 응답 경합 방지·마이크 정리, 음성 인식이 오류로 끊겨도 모은 말을 살리는 처리를 더했다.
  - 검증: 백엔드 `spotlessApply`·`spotlessCheck`, `test --rerun-tasks`(245개 통과), 프런트 `prettier`·`lint`·`build` 통과.
  - 재리뷰 `REVIEW_PASSED`. 지난 대화 화면에서 뒤로 갈 때 이전 오류 문구가 남던 것도 고쳤다.
  - 확인 못 한 것: 실제 Gemini에서의 기억 이어짐, 화면·마이크 동작. Spotless 캐시가 지워진 중복 테스트 파일(`… 2.java`)을 되살리던 문제는 `build/spotless*`를 지워 해결했다.
- 주민 대화의 장소·성별·말투 불일치를 고쳤다(검토 중, 테스트·실제 소리는 아직 확인 전). 프롬프트에 주민의 `location`을 넣어(편의점이면 점원으로 손님 응대) "내 집"으로 답하던 문제를 막고, 장소 유지·어색한 말 해석·성별 말투 규칙을 더했다.
  시트의 `personality`를 MBTI로 바꾸고 1인칭·말투는 `core_features` 끝의 "말투:" 한 줄로 옮겼다. 시트에 `gender`(남/여) 열을 더해 `resident.gender`(`V34`, `M`/`F`)에 저장하고(`V35`는 import 결과), 프롬프트에 "성별"로 넣는다.
  주민 대화 음성은 서버 Google 음성을 성별로 고르고(여 `ja-JP-Neural2-B`, 남 `C`) 주민별 높낮이·속도를 `pitch`/`speakingRate`로 연결했다(`GET /api/tts?resident&pitch&rate`). 서버 음성을 못 쓰면 브라우저 음성에 같은 값을 쓴다.
  - 검증: 백엔드 `spotlessApply`·`compileJava`, 프런트 `prettier`·`lint`·`build` 통과. 백엔드 테스트는 `TtsService` 생성자가 바뀌어 기존 `TtsServiceTest`가 고쳐져야 한다(qa-tester).
  - 확인 못 한 것: 실제 소리(Neural2에서 높낮이 값이 자연스러운지), 실제 대화 응답.
- 주민 대화 음성의 높낮이를 ±3 반음으로 제한했다(`0031`). 여성 음성(ミク)이 +10 반음에서 끊겨 들려 `TtsService.toSemitones`가 값을 자른다.
  - 검증: 백엔드 `spotlessApply`·`test` 통과.
  - 확인 못 한 것: 모든 주민의 소리.
- 대화 요약을 하루에 한 번, 오늘 이전 대화만 하게 바꾸고 요약 형식을 항목별 핵심 사실로 바꿨다(`0032`, 검토 중). 오늘 대화는 원문으로 보내 하루 동안 대화가 이어진다. 오염된 ミク 대화(편의점을 집으로 답한 기록)와 요약은 삭제했다.
  - 검증: 백엔드 `spotlessApply`·`test` 통과(261개). 요약·메모리 테스트와 레포지토리 통합 테스트를 새 기준에 맞췄다.
  - 확인 못 한 것: 새 지시문이 실제 Gemini 응답에서 의도한 형식으로 나오는지(무료 한도 때문에 시험하지 않음).
- Gemini 무료 티어의 한도와 모델 선택을 정리했다(`0033`). 모델은 `gemini-3.6-flash`를 유지하고, 배포 전 결제·횟수 제한·가입 제한을 정한다.
  - 다음 할 일: 503·시간 초과 재시도와 오류 문구 구분.
- 코드 리뷰(REVIEW_PASSED) 권장 사항 3건을 반영했다. 시스템 프롬프트 규칙 7(전혀 짐작할 수 없을 때만 못 알아들음)과 10(짐작할 수 있으면 해석하고 되묻기)의 범위를 나눴고, `TtsService`가 속도·높낮이의 `NaN`을 기본값으로 처리하며, `GeminiClient.buildContents`가 지난 대화의 맨 앞이 주민 말이면 그 줄을 건너뛰어 항상 플레이어 말로 시작하게 했다.
  - 검증: 백엔드 `test` 269개 통과(결과 XML 집계, 실패 0). 새 테스트 8개 추가.
  - 확인 못 한 것: 주민 줄로 시작하는 30줄 초과 대화를 실제 Gemini가 어떻게 받는지(건너뛰므로 보내지 않음).
- 친밀도 단계별 대화 규칙을 시스템 프롬프트에 넣었다(`0034`, 검토 중). 규칙 2번을 0~19 / 20~49 / 50~79 / 80~100 네 단계로 바꾸고, 80 미만에서는 핵심 특징의 사연을 먼저 꺼내지 않게 했다. 단계 문구가 프롬프트에 들어가는지 `ChatServiceTest`로 확인한다.
  작업 중 `origin/master`에 같은 gender 저장·V34/V35 upsert·import 성별 지원이 이미 올라와 있어(PR #34), 중복 작업을 버리고 master 위에서 친밀도 규칙만 다시 적용했다(이전 시도는 `backup/resident-persona-dup` 브랜치). 시트는 수정하지 않았다(예시 대사·`current_context`를 안 쓰기로 한 것은 `0034`).
  - 검증: 백엔드 `spotlessApply`·`test` 통과.
  - 실제 대화 확인(임시 DB·별도 포트의 백엔드, 테스트 계정): カイト(r01)에게 같은 말("何をしているんですか？")을 친밀도 5에서 하니 "……なんだ、アンタか。見ての通り…"로 퉁명스럽게, 90에서 하니 "おう、お前か。…荷揚げの合間に古いラジオの調子を見てた…お前は今日、何してたんだ？"로 취미를 말하며 되묻는 쪽으로 달라졌다.
  - 확인 못 한 것: ミク/レン 등 비슷한 쌍의 말투 차이, 80 이상에서 사연을 꺼내고 80 미만에서는 안 꺼내는지, 중간 단계(20~79). Gemini 호출이 시간 초과(`InterruptedIOException`)로 10번 중 8번 실패해(`0033`의 서버 혼잡과 같은 증상) 중단했다.
  - 다음 할 일: 호출이 안정될 때 위 항목을 다시 확인하고 `0034` 확정.
- 대화 하루 상한(악용 방지)과 "주민이 졸려해요" 연출을 넣었다(`0035`, 검토 중). 사용자당 하루 200회(한국 시간)를 넘거나 Google이 429를 주면 429 `DAILY_LIMIT_EXCEEDED`가 나가고, 프런트는 주민 안내로 보여 주며 쓴 말을 입력창에 되돌린다. `chat-todo.md`·`remaining-work.md`·`requirements.md` 문구를 "제품 제한 없음, 악용 방지용 상한만"으로 정리했다.

## 2026-11-14 (학습 테마 10개로 확장)

- 학습 테마를 2개에서 10개로 늘렸다. 기존 "카페에서 주문하기"·"길 묻기"에 도서관·쇼핑·병원·식당·학교·우체국·날씨와 계절·자기소개 8개를 `V36`~`V38`로 추가했다(테마는 건물과 연결하지 않음). 한자·단어·표현·예문은 kanjiapi.dev와 Tatoeba의 실제 데이터이고, Gemini는 영어 뜻을 한국어로 옮기는 번역에만 썼다(`0012` 추가 절).
- 도구를 고쳤다(`scripts/import-theme-content`). ① Gemini 모델이 `gemini-3.6-flash`의 하루 무료 한도(20회)에 걸려 `gemini-3.5-flash-lite`로 바꿨다(`gemini-3.5-flash`도 3.6의 한도로 잡혀 막힘). ② 후보 표기를 직접 넘기는 `--candidates`와 번역 단계, "검수 필요" 표시를 추가했다. ③ 예문은 한국어 번역이 있는 문장을 단어 전체로 검색하도록 넓혔다(키워드 2개로는 거의 못 찾았음).
- 콘텐츠 원본을 구글 시트로 옮겼다(`0036`). `propose --to-sheet`가 시트에 `draft` 행을 넣고, 사람이 검수해 `ok`로 바꾸면 `npm run import`가 읽는 법·레벨을 사전과 다시 대조해 SQL을 만든다. 시트에 쓰는 방법은 Apps Script 웹 앱이다(새 라이브러리 없음).
  - 새 `.env` 키: `scripts/import-theme-content/.env`에 `THEME_SHEET_THEMES_CSV_URL`·`THEME_SHEET_KANJI_CSV_URL`·`THEME_SHEET_VOCABULARY_CSV_URL`·`THEME_SHEET_EXAMPLES_CSV_URL`(시트 게시 CSV 주소 4개)와 `THEME_SHEET_WEBHOOK_URL`·`THEME_SHEET_WEBHOOK_TOKEN`(Apps Script 웹 앱 주소·비밀 토큰). 키 이름은 `.env.example`에 추가했다.
- 검증: 백엔드 `spotlessApply`·`test` 통과(`V36`~`V38`이 Flyway로 실제 적용됨). 프런트는 코드를 바꾸지 않았고 `npm run build`만 통과를 확인했다. 별도 DB(포트 55432)·백엔드·프런트로 로컬 앱을 띄워 10개 테마 × 4단계의 내용 API를 모두 조회(오류 0건)하고, 새 테마 8개의 한자·단어·표현·예문 문제 화면을 직접 풀어 오류 없이 다음 단계로 넘어가는 것을 확인했다(날씨·쇼핑은 제한 시간 때문에 마지막 1~2문제를 남겼다).
- 겪은 문제: 시트에서 검수하던 중 사전의 영어 뜻에 이 테마와 어울리지 않는 뜻(예: 予約의 "프로그래밍", 宿題의 "숙주")이 섞여 있어 사람이 덜어내야 했다. 이 폴더가 iCloud 동기화되는 데스크톱에 있어, Gradle을 겹쳐 돌렸을 때 빌드 폴더에 `V35__… 2.sql` 같은 복사본이 생겨 Flyway가 실패했다(소스에는 없었고, 로그의 정확한 문구는 확인하지 못했지만 같은 버전이 두 번 있는 것으로 보인다). 빌드 폴더를 지우고 한 번만 돌려 해결했다.
  - 한계: ① N1~N3 밖(N4 이하) 기본 단어는 걸러져 빠졌고, 예문은 Tatoeba에 한국어 번역이 있는 문장만이라 테마별 1~4개다(식당 1개). ② 새 8개 테마에는 독해(READING) 지문이 없고 독해 단계는 확인하지 않았다. ③ 화면은 확인용 별도 인스턴스에서 JS로 정답을 눌러 확인했고 사람 눈으로 보지는 않았다(날씨·쇼핑은 일부 문제 미확인). ④ 예문 읽는 법(자동 생성)은 눈에 띄는 오류 한 건(`おあづけ`)만 고쳤다.
  - 다음 할 일: 새 테마 독해 지문, 걸러진 N4 이하 기본 단어를 어떻게 다룰지, 배포 때 시트 반영을 자동화할지.

## 2026-11-16 (위키백과 지문 → 오늘의 학습 콘텐츠 도구, 작업 A)

- `scripts/import-theme-content`에 위키백과 지문으로 학습 초안을 만드는 도구를 추가했다(`0038`, 방식 승인됨). 흐름: `collect`(날짜 문서의 「記念日・年中行事」 링크 → 도입 단락 수집·캐시·거름·점수, 괄호 설명 삭제) → `pick`(번호·제목으로 승인) → `draft`(한자 3·단어 3·표현 2·예문, 뜻은 영어→한국어 번역) → `questions`(일본어 N1~N3 이해 문제 3개 + 한국어 해설, 정답을 가린 재검증) → `finalize-wiki`(`V40`~ SQL). 사용법은 README.
- 11월 날짜 문서 30개에서 후보 855개 → 거름 통과 184개(길이 150~500자, 금지 단어·분류, 고유명사·괄호 비율). 점수 기준(N1~N3 한자 개수·비율)은 사용자와 샘플 10개로 확인했다. 연도·날짜 제목과 숫자 비율은 거르지 않는다(사용자 결정). 샘플 10개를 모두 승인해 학습 10개를 만들었다(`V40`~`V49`).
- 저장 형식은 세션 B와 맞췄다. 사용자 요청으로 `theme_reading_question.explanation`(한국어 해설)이 추가됐다. 질문·보기는 일본어다.
- Gemini 호출: 번역 2회 + 문제 생성·재검증 4회(한도 모델당 하루 20회 안). 사전 뜻은 영어를, 예문은 일본어 문장(영어 쌍 참고)을 한국어로 옮기기만 했다.
- 검증: B의 `V39`(브랜치 `feature/chat-requires-daily-lesson`)를 임시로 넣고 백엔드 `KotonohaMachiApplicationTests`를 돌려 `V1`~`V49`가 Testcontainers의 PostgreSQL에 오류 없이 적용되는 것을 확인했다(`V39` 파일은 지우고 커밋하지 않음).
- 확인 못 한 것: ① 이해 문제 30개의 질이 좋은지는 표본 몇 개만 봤다(재검증은 전부 통과해 너무 후한지 알 수 없음). ② 한국어 번역(뜻·예문)은 초안이다. ③ B의 화면에서 5단계를 끝까지 하는 것은 합칠 때 확인. ④ 지문에서 뽑은 낱말이 CC BY-SA 파생물에 드는지 등 라이선스 판단은 하지 않았다(`0038`). ⑤ 승인 목록(`approved/`)은 커밋하지 않았으나 `V40`~`V49` SQL에 지문 본문이 들어 있어 BY-SA 본문이 저장소에 들어간다.
- 주의: `V40`~`V49`는 `V39`(B)가 먼저 `master`에 있어야 적용된다. B의 PR을 먼저 합친다.
- 다음 할 일: 의심 목록(「唯一」「素地」 읽는 법, 예문 3개뿐인 학습)과 표본 확인, 날짜 고정(16일에 「11月16日」 연관 학습)·스케줄러 자동 생성·365개 채우기, 자동 승인(`--auto`) 옵션.

## 2026-11-16 (말하기 0% 문제 수정, 프런트만)

- 복습 말하기를 고쳤다(`0037`, 검토 중). ① 인식 후보를 5개까지 받아 가장 높은 정확도를 쓰고 "인식된 말"을 화면에 보여 준다(주민 대화는 첫 후보만, 동작 그대로). ② 3번 실패하거나 "分からない"를 누르면 정답·읽는 법을 보여 주고 "다음 문제"로 넘어갈 수 있다(맞힌 기록 없이 통과). 80% 기준은 그대로.
  - 검증: `prettier`·`npm run lint` 통과. 후보 비교 함수는 임시 스크립트로 확인: 후보 중 정답 포함 100%, 후보 전부 다른 한자(像書 vs 蔵書) 50%(한 글자 일치), 가타카나 ゾウショ·히라가나 ぞうしょ 100%, 읽는 법 없이 전혀 다름 0%, 후보 없음 null.
  - 확인 못 한 것: 실제 마이크·크롬에서 후보가 5개 오는지, 화면 표시와 넘어가기 버튼의 실제 동작.
  - 다음 할 일: 사용해 본 뒤 80% 기준 조정, 주민 대화에 발음 체크를 붙일 때 같은 함수 재사용.
- 이어서 복습 말하기를 연습용으로 바꿨다(`0037`). 사용자가 실제로 확인하니 蔵書(ぞうしょ)를 크롬이 上昇처럼 흔한 단어로만 인식해 후보 5개 안에도 정답이 없었다. 그래서 정확도는 참고용으로만 보여 주고, 문제별 "넘어가기"와 단계 "다음"을 처음부터 항상 연다. 3회 실패·分からない 뒤에는 정답을 알려 주고, 80% 이상이면 "잘했어요"를 보여 준다. 다른 단계와 주민 대화는 그대로.
  - 검증: prettier·lint(오류 0)·tsc·vite build 통과.
  - 확인 못 한 것: 실제 화면에서 넘어가기 버튼, 말하기 없이 "다음"으로 복습을 완료하고 테마 완료로 이어지는 흐름(서버가 항목 진행을 확인하지 않는 것은 코드로만 확인).
- 복습 말하기 화면에 한국어 뜻을 함께 보이게 했다(`0037`). 복습 항목(`ThemeQuizItemResponse`)에 `meaning`을 추가해 한자·단어·표현은 뜻, 예문은 번역을 담고, 화면은 단어 아래에 처음부터 보여 준다(백엔드 DTO·서비스 변경이며 DB·마이그레이션은 그대로).
  - 검증: 백엔드 `spotlessApply`·`test` 통과(복습 항목의 `meaning` 검증 추가), 프런트 prettier·lint·tsc 통과.
  - 확인 못 한 것: 실제 화면에서 뜻이 보이는 모습.

## 2026-11-16 (독해를 지문 + 이해 문제로, "테마" 문구를 "오늘의 학습"으로)

- 독해 구조를 바꿨다(`0039`, 검토 중). `V39`로 지문에 출처 컬럼 4개를 더하고 `theme_reading_question` 테이블을 만들었다. `GET /api/themes/{id}/reading`이 지문·출처·문제(기존 `ThemeQuizItemResponse` 재사용)를 내려준다. 이해 문제가 없는 학습은 `completeStage`가 독해를 자동 완료해 복습으로 보낸다. 프런트 독해 화면은 지문 + 출처(새 탭 링크) + 문제를 보여 준다.
- 화면 문구의 "테마"를 "오늘의 학습"/"학습"으로 바꿨다(코드·DB 이름은 그대로). 제목을 넣는 안내 문장은 지웠고, 하루 한 번 규칙 안내만 "오늘은 이미 학습을 완료했어요. 내일 새 학습이 열려요."로 남겼다.
  - 검증: 백엔드 `spotlessApply`·`test` 통과(독해 조회·건너뛰기 테스트 추가), 프런트 결과는 아래 확인 항목 참고.
  - 다음 할 일: 작업 A가 만든 지문·문제 SQL 반영, 기존 학습 10개 교체, 출처 문구를 0038에 맞추기.
  - 로컬 확인(별도 DB·백엔드 8081·프런트 5174, 테스트 계정, 샘플 독해 SQL은 커밋 안 함): 로그인 → 카페 학습을 한자부터 복습까지 끝까지 완료. 독해에서 지문·출처(새 탭, `noopener noreferrer`)·문제 2개가 나왔고 오답 안내와 정답 진행이 동작했다. 같은 날 다른 학습을 열면 제목 없이 "오늘은 이미 학습을 완료했어요. 내일 새 학습이 열려요."가 나왔다. 독해 문제가 없는 학습(길 묻기)은 예문 뒤 독해를 건너뛰고 복습으로 갔다. 화면은 JS로 눌러 확인했고 눈으로 보지는 않았다(스크린샷 못 봄).

## 2026-11-16 (오늘 학습을 끝내야 주민 대화 가능)

- 주민 대화를 오늘 학습 완료 후에만 열도록 했다(`0040`, 검토 중). `ThemeService.canChatToday`가 판단하고 `ChatService.chat`이 아니면 403(`LESSON_REQUIRED`)을 던진다. 이동은 막지 않는다. 프런트 대화창은 403이면 쓴 말을 돌려주고 "오늘의 학습하러 가기" 버튼을 보인다.
  - 검증: 백엔드 `spotlessApply`·`test` 통과(서비스·통합 403 테스트 추가), 프런트 prettier·tsc·eslint 통과.
  - 확인 못 한 것: 실제 화면에서 잠금 안내와 버튼 동작.
  - 작업 A 요청으로 `theme_reading_question`에 `explanation TEXT NOT NULL`(정답 해설)을 더했다. `V39`는 아직 push 전이라 파일을 그대로 고쳤다(이미 로컬 DB에 V39를 적용했다면 DB를 새로 만들어야 한다). API 문제 항목에 `explanation`이 담기고, 프런트는 정답을 맞힌 뒤 해설을 보여 준다. 백엔드 test·프런트 tsc/lint 통과, 화면은 직접 못 봤다.
  - 출처 문구를 작업 A 제안(0038)대로 바꿨다: 제목 링크, 문서 이력 링크, 리비전 번호, "도입 단락 발췌(괄호 설명 삭제)", 라이선스, 지문 아래 파생물 안내 한 줄. prettier·tsc·eslint 통과, 화면은 직접 못 봤다.

## 2026-11-16 (기존 학습 10개 삭제)

- `V50`으로 기존 학습 10개(카페·길 묻기 등)와 딸린 한자·단어·표현·예문·독해 지문(문제는 CASCADE)·진행 기록을 지운다. 제목으로만 골라 새 위키백과 학습은 건드리지 않고, 단어장은 학습에 외래키가 없어 남는다. 반드시 작업 A의 `V40`~`V49` 뒤에 적용돼야 한다(번호 순서, 그 전에 `V50`만 먼저 들어가면 Flyway가 `V40`~`V49`를 거부한다).
  - 검증: `V39`+`V40`~`V49`(임시로 넣음)+`V50`까지 Testcontainers에 적용해 백엔드 `test` 통과. 옛 데이터에 기대던 테스트를 새 첫 학습 「X線」 기준으로 고치고, 학습 10개만 남는지 확인하는 테스트를 추가했다. 이 PR에는 `V40`~`V49`가 없어 그 PR이 먼저 머지돼야 테스트가 통과한다.
  - 확인 못 한 것: 실제 사용자가 옛 학습을 진행 중일 때의 영향(진행 기록이 지워진다).

## 2026-11-16 (이해 문제 해설을 한국어로 수정)

- 화면에서 이해 문제 해설이 일본어로 나오는 것을 발견했다. 원인: 문제 생성 때 "해설은 한국어"라고 지시했지만 Gemini가 일본어 지문 인용만 적었고, 도구가 한글 포함 여부를 검사하지 않았다(30개 모두 한글 없음).
- 고침: `questions.mjs`가 해설에 한글이 없으면 그 문제를 버리고 프롬프트를 강하게 바꿨다. `fix-explanations`(Gemini 1회)가 기존 30개를 한국어로 다시 썼고, `finalize-wiki --explanations-only`가 `V51__update_lesson_explanations.sql`(UPDATE)을 만들었다. 이미 병합된 `V40`~`V49`는 고치지 않았다(Flyway 체크섬).
- 검증: 백엔드 `spotlessApply`·`test` 통과(`V1`~`V51` 적용). 표본(X線·雪·群馬県) 해설을 눈으로 읽고 "다음 해 2월"(원문은 다음 달)을 직접 고쳤다.
- 확인 못 한 것: 나머지 7개 학습의 해설이 지문과 맞는지(표본만 확인), 화면에서의 모습.

## 2026-11-16 (학습 전 주민 대화를 처음부터 막기)

- 대화창이 열릴 때 `getTodayRecommendation`으로 오늘 학습을 끝냈는지 먼저 확인한다. 끝내지 않았으면 입력창·마이크 대신 "오늘의 학습을 먼저 끝내야 주민과 이야기할 수 있어요." 안내와 "오늘의 학습하러 가기" 버튼만 보인다(말한 뒤 403으로 막히던 흐름을 없앴다). 확인 중에는 입력창을 숨기고, 확인이 실패하면 입력창을 보이되 서버 403이 그대로 막는다. 지난 대화 보기는 막지 않는다. 마을·건물 안 두 화면이 같은 대화창을 쓰므로 대화창 한 곳만 고쳤다.
  - 검증: 프런트 prettier·lint(오류 0)·build 통과. 백엔드 변경 없음.
  - 확인 못 한 것: 실제 화면에서의 모습.

## 2026-11-16 (대화 중 모르는 단어를 단어장에 저장)

- 대화창 말풍선의 일본어를 드래그하면 "단어장에 저장" 버튼이 뜨고, 누르면 `POST /api/vocabulary/chat`로 단어장(source=CHAT)에 저장된다(`0041`). 사전은 jisho.org(JMdict), 영어 뜻은 Gemini가 한국어로 번역(단어당 최대 1회, 캐시, 실패 시 영어 뜻 폴백). 이미 있으면 "이미 저장됨", 사전에 없으면 안내만 한다.
  - 검증: 백엔드 `spotlessApply`·`test` 통과(사전 파싱·번역 캐시/폴백 단위 테스트, 저장·중복·404·400·폴백 통합 테스트, 사전/Gemini는 목킹). 프런트 prettier·eslint(src)·build 통과.
  - 실제 확인(별도 DB·백엔드 8081·`vite preview` 5175, 테스트 계정): 실제 jisho·Gemini 호출로 漆器→「칠기, 칠공예품」, 食べる→「먹다」(N5) 저장, 재요청은 alreadySaved. 대화창에서 드래그→버튼→저장 안내→단어장 화면에 한국어 뜻으로 표시까지 눈으로 확인했다. 조사가 섞인 선택("房に")은 404 안내가 떴다.
  - 확인 못 한 것: 실제 3D 마을에서 주민에게 걸어가 여는 경로(브라우저가 백그라운드라 3D가 1fps여서, 임시 라우트로 대화창만 띄워 확인하고 되돌렸다). 터치(모바일) 선택. `npm run lint`(`eslint .`)는 이 환경에서 멈춰 `eslint src`로 대신 통과 확인했다.

- 코드 리뷰 반영(`0041`): 빈 사전 응답은 502로, 사전 영어 뜻은 200자로 제한, `DictionaryWord`를 `dto/`로 이동, 대화 단어 저장 하루 30개 상한(429) 추가. 백엔드 `spotlessApply`·`test` 통과(상한 단위 테스트 추가). 프런트는 429 메시지를 기존 오류 안내로 그대로 보여 주며 화면에서 직접 확인하지는 못했다.

## 2026-11-17 (운영 배포 구성 파일)

- GCP VM 한 대에 docker compose로 올리기 위한 운영용 파일을 추가했다(`0042`): `docker-compose.prod.yml`(db 외부 비노출·볼륨, backend `restart: unless-stopped`, web=Caddy), `frontend/Dockerfile.prod`(빌드 후 Caddy가 정적 서빙+`/api` 프록시+HTTPS 자동), `frontend/Caddyfile`, `docs/deploy.md`. 개발용 `docker-compose.yml`은 그대로다. Caddy 도입은 사용자 승인을 받았다.
- 같은 도메인 구성이라 프런트는 `VITE_API_BASE_URL=""`로 빌드하며 코드 수정은 없다. 프록시 뒤 소셜 로그인 콜백이 https로 만들어지도록 `server.forward-headers-strategy`를 환경변수(`FORWARD_HEADERS_STRATEGY`, 기본 none, 운영 compose가 framework)로 열었다. Gemini 기본 모델을 `gemini-3.5-flash-lite`로 바꿨다(`application.yml`, `.env.example`).
  - 검증: `docker compose -f docker-compose.prod.yml config` 통과. `DOMAIN=localhost`로 실제 기동: Flyway V51 적용, `https://localhost` 프런트·SPA 경로 200, HTTP→HTTPS 308, `/api` 프록시 동작, 로그인 후 `Set-Cookie: Secure; HttpOnly; SameSite=Lax`와 `/api/auth/me` 200, 소셜 `redirect_uri=https://localhost/...`, 빌드된 번들에 `localhost:8080` 없음, 5432 외부 비노출. 확인 후 `down -v`로 정리.
  - 확인 못 한 것: 실제 GCP VM·도메인·Let's Encrypt 발급, 가입 메일(로컬 Resend 발송 실패로 사용자는 DB에 직접 넣어 로그인 확인), 대화·TTS·마이크, 이 구성에서 브라우저 화면.
  - 다음: 도메인 결정 → VM 생성 → `docs/deploy.md` 순서대로 배포 → 체크리스트 확인 → Gemini 결제 연결.

## 2026-11-18 (iPhone Safari에서 주민 목소리가 안 나는 문제)

- 원인 추정: iOS Safari는 사용자가 화면을 누른 순간에 시작한 오디오만 소리를 허용한다. 서버 음성은 응답을 기다린 뒤 새 `Audio`로 재생해서, 그때는 이미 누른 순간이 지나 차단되고 브라우저 음성 대체도 같은 제한에 걸린다.
- 고침: `speechSynthesis.ts`가 재생용 `Audio`를 하나 재사용하고, 화면을 처음 누를 때(click/touchend) 무음을 한 번 재생해 잠금을 푼다(브라우저 음성도 빈 발화로 해제). 이후에는 같은 요소의 주소만 바꿔 재생한다. 새 라이브러리 없음.
  - 검증: 프런트 prettier·eslint(해당 파일)·tsc·build 통과.
  - 확인 못 한 것: 실제 iPhone Safari에서의 재생(배포 후 직접 확인 필요). 원인은 코드 읽기로 추정한 것이다.
