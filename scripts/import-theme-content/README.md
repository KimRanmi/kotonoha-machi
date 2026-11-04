# import-theme-content

테마 학습 콘텐츠(한자·단어·표현·예문)를 새 테마용으로 추가할 때 쓰는 1회성 개발 도구다.
백엔드/프런트엔드 앱과 완전히 분리돼 있고, 앱에는 전혀 포함되지 않는다.

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

워크트리에서 실행하면 `propose`가 메인 저장소의 `scripts/import-theme-content/.env`도 함께 읽는다
(워크트리의 `.env`가 있으면 그 값이 우선). 그래서 워크트리마다 `.env`를 복사할 필요가 없다.

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
