# import-theme-content

테마 학습 콘텐츠(한자·단어·표현·예문)를 새 테마용으로 추가할 때 쓰는 1회성 개발 도구다.
백엔드/프런트엔드 앱과 완전히 분리돼 있고, 앱에는 전혀 포함되지 않는다.

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
