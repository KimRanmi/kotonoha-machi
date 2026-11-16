# import-theme-content

테마 학습 콘텐츠(한자·단어·표현·예문)를 새 테마용으로 추가할 때 쓰는 1회성 개발 도구다.
백엔드/프런트엔드 앱과 완전히 분리돼 있고, 앱에는 전혀 포함되지 않는다.

## 위키백과 지문 → 오늘의 학습 (1단계: 지문 후보 고르기)

결정 배경은 `docs/decisions/0038-wikipedia-passage-daily-lesson.md`. 시트·Apps Script는 쓰지 않는다.

```bash
npm run collect -- --month 11            # 11월 전체 날짜 문서의 「記念日・年中行事」 링크에서 후보 수집
npm run collect -- --date 11月16日        # 날짜 하나만
npm run collect -- --category 良質な記事 --limit 200   # 보조: 분류에서
npm run pick -- --pick 3,7,12            # 후보 파일의 번호로 승인 → approved/readings.json
```

- `collect`는 위키백과 공식 API로 도입 단락·리비전 번호(`oldid`)·분류를 가져와 `cache/`에 저장하고(다시 부르지 않음),
  거름·점수를 매겨 `candidates/wiki/<이름>.md`에 상위 후보(기본 10개)와 제외 이유를 쓴다. 429가 나면 다시 실행하면 캐시부터 이어서 한다.
- 자동 거름: 길이 150~500자, 괄호·고유명사 비율, 제목 패턴(一覧 등. 연도·날짜 제목과 숫자 비율은 거르지 않음), 금지 단어·제외 분류(`config/wiki-filter.json`).
- 점수: N1~N3 한자의 서로 다른 개수와 비율이 높을수록 +, JLPT 목록 밖 한자·고유명사·괄호가 많으면 −(`lib/passageScore.mjs`).
  기준이 어긋나면 항목을 고치지 말고 이 상수·설정 파일을 고친다.
- **기계가 못 거르는 것**: 금지 단어에 안 걸리는 민감한 맥락(논란·편향된 서술), 본문 오류, 지문으로서의 재미·적합성.
  그래서 사람이 후보 파일의 본문을 눈으로 확인하고 번호를 고른다.
- `cache/`, `candidates/wiki/`, `drafts/wiki/`, `approved/`는 git에 올리지 않는다(위키백과 본문, CC BY-SA). `approved/readings.json` 커밋 여부는 아직 미정.
- API 규칙: 요청은 하나씩, 1.2초 간격, `maxlag`, User-Agent는 `kotonoha-import-tool/0.1`(연락처 없음).

### 2~3단계: 지문 → 학습 초안 → 이해 문제 → SQL

```bash
npm run pick -- --pick 3,7,12                 # (1단계) 지문 승인 → approved/readings.json
npm run draft -- --translate                  # 한자 3·단어 3·표현 2·예문 초안 + 영어 뜻/예문의 한국어 번역(Gemini 2회)
npm run questions                             # 이해 문제 생성 + 정답을 가린 재검증(Gemini 지문 5개당 2회)
npm run finalize-wiki -- --all                # drafts/wiki/*.json → V<n>__upsert_lesson_<제목>.sql
```

- `draft`: kuromoji로 명사→단어(WORD), 동사·형용사→표현(EXPRESSION), 한자는 지문 안 N1~N3 중 어려운 순. 뜻·읽는 법·레벨은
  kanjiapi.dev(우선순위로 못 정하는 다의어, 지문과 사전의 읽는 법이 다른 단어는 "확인 필요"), 예문은 Tatoeba(한국어 번역이 없으면
  영어 쌍을 찾아 Gemini가 일본어 문장을 한국어로 옮김). 같은 한자의 변형(称す/称する)은 하나만 쓴다.
- `questions`: 질문·보기는 일본어(N1~N3), 해설은 한국어. 만든 문제를 정답 없이 다시 풀게 해서 정답이 다르거나 유일하지 않으면 버린다.
  남은 문제가 2개 미만이면 그 학습은 보류(`status`)다.
- **Gemini 무료 한도는 모델당 하루 20회**다. 10개 학습이면 번역 2회 + 문제 4회 정도다. 한도(429)에 걸리면 저장된 곳까지 두고 멈추며,
  다시 실행하면 문제가 없는 학습부터 이어서 한다. 앱 대화도 같은 한도를 쓰니 주의한다.
- 학습마다 "확인 필요" 목록은 `drafts/wiki/*.json`의 `suspects`와 `finalize-wiki` 출력에 나온다. 사람은 이 목록과 표본 몇 개만 본다.
- `finalize-wiki`는 번호를 `max(로컬, origin/master, 39) + 1`부터 쓴다(39는 세션 B의 스키마). B의 스키마(`theme_reading_passage`의
  `source_*` 열, `theme_reading_question`)가 `master`에 올라온 뒤에 로컬 DB에 적용해 검증한다.

아래는 이전 방식(테마별 콘텐츠)이다.

## 새 흐름: 구글 시트가 원본 (`npm run import`)

테마 콘텐츠의 원본은 구글 시트 "kotonoha-machi 테마 콘텐츠"(탭 `themes`, `kanji`, `vocabulary`,
`examples`)다. `propose`가 만든 후보(또는 사람이 직접 쓴 값)를 시트에 올리고, 사람이 시트에서
검수한 행의 `review` 열을 `draft` → `ok`로 바꾼다.

```bash
npm run import -- [--themes "테마1,테마2"] [--csv-dir <폴더>] [--accept-mismatch]
```

- `review`가 `ok`인 행만 반영한다(`draft`=검수 전, `applied`=이미 DB에 반영된 행이라 건너뜀).
- 한자·단어의 읽는 법/JLPT 레벨을 kanjiapi.dev와 대조해 다르면 SQL을 만들지 않고 멈춘다
  (의도한 값이면 `--accept-mismatch`). 한국어 뜻과 예문 읽는 법은 사람이 정한 값을 믿는다.
- 테마별로 "없으면 만들고, 내용은 지우고 다시 넣는" SQL을 `V<n>__upsert_theme_….sql`로 만든다
  (번호는 `origin/master`까지 봐서 충돌을 피한다. 먼저 `git fetch`).
- 시트 각 탭을 CSV로 웹에 게시한 URL을 `.env`의 `THEME_SHEET_*_CSV_URL` 4개에 넣는다.
  `propose`로 후보를 뽑을 때는 `--candidates <후보.json>`으로 후보를 직접 넘길 수 있다
  (Gemini는 영어 뜻을 한국어로 옮기는 번역에만 쓴다).

### `propose --to-sheet`로 시트 자동 채우기 (1회 설정)

`npm run propose -- --title "<제목>" --topic "<주제>" --to-sheet`를 실행하면 후보 추천 → 사전·Tatoeba
조회 → 한국어 번역 결과가 시트에 `review=draft` 행으로 들어간다(같은 테마를 다시 실행하면 그 테마의
draft 행만 교체되고 검수한 행은 그대로). 설정은 처음 한 번만 한다.

1. 시트에서 확장 프로그램 → Apps Script를 열고 `apps-script/Code.gs` 내용을 붙여 넣는다.
2. Apps Script 왼쪽 프로젝트 설정 → 스크립트 속성에 `SHEET_TOKEN`을 추가하고 임의의 긴 비밀 문자열을 넣는다.
3. 배포 → 새 배포 → 유형 "웹 앱", 실행 계정 "나", 액세스 권한 "모든 사용자"로 배포하고 나온 `/exec` 주소를 복사한다.
4. `.env`에 `THEME_SHEET_WEBHOOK_URL`(그 주소)과 `THEME_SHEET_WEBHOOK_TOKEN`(2번의 문자열)을 넣는다.

주소를 아는 사람이 호출할 수 있으므로 토큰이 맞을 때만 쓰도록 했다. 토큰은 공개하지 않는다.

아래는 시트 없이 초안 JSON으로 바로 SQL을 만들던 이전 방식이다.

## 역할 분리

- **Gemini**: "이 테마에 어울리는 단어가 뭘지"만 추천한다. 뜻/읽는 법/레벨은 추천하지 않는다.
- **kanjiapi.dev / Tatoeba**: 실제 뜻/읽는 법/레벨/예문을 조회·검증한다. N1~N3 범위 밖이면
  자동으로 거부한다.
- **사람**: `drafts/*.json` 초안을 직접 읽고 검토·수정한 뒤 `finalize`를 실행해야 한다. 이
  도구는 사람의 최종 승인 없이 DB나 SQL 파일을 바로 만들지 않는다.

자세한 배경은 `docs/decisions/0012-theme-content-data-source.md`와
`docs/requirements.md`의 "테마 콘텐츠 추가 방식" 항목 참고.

## 준비

```bash
cd scripts/import-theme-content
npm install
cp .env.example .env   # GEMINI_API_KEY를 채워넣는다
```

## 사용법

1. 후보 제안 + 검증:
   ```bash
   npm run propose -- --title "테마 제목" --topic "주제 설명(예: 편의점에서 물건 사기)"
   ```
   `drafts/<테마-제목>.json`이 생성된다.

2. 초안을 직접 열어서 확인한다. 이상한 후보(테마랑 안 어울림, 번역이 부자연스러움 등)가
   있으면 지우거나 고친다. `rejected` 배열에는 레벨이 안 맞거나 못 찾은 후보가 왜 빠졌는지
   적혀 있다.

3. 승인한 초안으로 마이그레이션 생성:
   ```bash
   npm run finalize -- --draft drafts/<파일명>.json
   ```
   `backend/src/main/resources/db/migration/`에 다음 번호의 SQL 파일이 생긴다.

4. 생성된 SQL 파일을 한 번 더 읽어보고, `cd backend && ./gradlew spotlessApply test`로
   실제로 적용·검증한 뒤 평소처럼 커밋한다.
