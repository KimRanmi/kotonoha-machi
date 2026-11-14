# import-residents

구글 시트에서 편집한 마을 주민(NPC) 페르소나를 읽어 검토용 Flyway SQL로 만들어 주는 개발 도구다.
백엔드/프런트엔드 앱에는 포함되지 않는다.

## 역할 분리

- **구글 시트**: 주민 설정의 원본. 사람이 편집한다.
- **이 스크립트**: 웹 게시 CSV를 읽어 검증하고 `V<n>__upsert_residents.sql`을 만든다. DB에는 직접 쓰지 않는다.
- **사람**: 생성된 SQL을 검토하고 커밋한다. 배포 시 Flyway가 DB에 반영한다.
- **백엔드(ChatService)**: DB 값으로 프롬프트를 만들어 Gemini에 전달한다.

## 시트 열

첫 행은 아래 헤더 이름이어야 한다 (순서 무관). 다른 이름의 열이 있으면 거부한다.

| 열 | 필수 | 설명 |
| --- | --- | --- |
| id | O | 양의 정수, 중복 불가. 한 번 정하면 바꾸지 않는다 |
| name | O | `가이토 (カイト)` 형식. 마지막 괄호 안의 일본어가 이름이 된다 |
| personality | O | 성격 유형(MBTI 4글자 등). 그대로 사용 (최대 30자) |
| appearance_job | O | 외모·직업 |
| core_features | O | 핵심 특징 |
| hobby | | 취미 |
| gender | | `남` 또는 `여`. DB에는 `M`/`F`로 저장되어 대화 프롬프트와 목소리(여성 ja-JP-Neural2-B, 남성 ja-JP-Neural2-C)를 정한다. 빈 칸은 NULL, 다른 값은 오류. 시트에 `gender` 열이 없으면 SQL에 넣지 않는다 |
| location | | 주민이 지내는 장소(최대 30자). 같은 이름의 건물(`scripts/import-buildings` 시트의 `location`)이 있으면 그 건물에 속하고, 건물이 없는 값(예: `거리`)이나 빈 칸은 건물 밖에서 지낸다 |

## 변환 규칙 (시트 -> resident 테이블)

| DB 열 | 값 |
| --- | --- |
| slug | `r` + id를 2자리 0패딩 (`1` -> `r01`, `20` -> `r20`) |
| name | name의 괄호 안 일본어 (`가이토 (カイト)` -> `カイト`). 괄호가 없거나 비어 있으면 오류. 최대 50자 |
| personality | 시트 값 그대로 |
| current_context | 모든 주민 공통 `마을에서 평소처럼 하루를 보내고 있다.` (`import.mjs` 상단 상수. 나중에 대화 시작 시 실제 위치로 덮어쓸 예정) |
| speech_style, sample_lines | 빈 문자열 |
| location | location 값. 빈 칸이면 NULL. **시트에 `location` 열이 아예 없으면 이 열은 SQL에 넣지 않아** 기존 값이 지워지지 않는다 |
| background | `외모·직업: …` / `핵심 특징: …` / `취미: …` 세 줄 (최대 500자) |

길이는 변환 후 값 기준으로 검사한다. 값에 `{` `}`를 쓸 수 없다. 빈 행은 무시하고, 데이터가 0행이면 거부한다.

예시 행:

```csv
id,name,personality,appearance_job,core_features,hobby
1,가이토 (カイト),무뚝뚝/オレ系,"180cm의 거구, 항구 하역 노동자",말수가 적고 퉁명스럽다,"새벽 방파제 낚시, 낡은 라디오 수리"
```

## 시트 게시 방법

1. 구글 시트에서 파일 > 공유 > 웹에 게시.
2. 대상 시트(탭)를 고르고 형식을 `쉼표로 구분된 값(.csv)`로 선택한 뒤 게시.
3. 나온 URL을 `.env`의 `RESIDENT_SHEET_CSV_URL`에 넣는다. (URL을 아는 사람은 누구나 읽을 수 있으니 공개해도 되는 내용만 쓴다.)

## 준비

```bash
cd scripts/import-residents
cp .env.example .env   # RESIDENT_SHEET_CSV_URL을 채워넣는다
```

의존성 설치는 필요 없다 (Node 22.9 이상).

## 사용법

```bash
npm run import                          # .env의 URL에서 CSV를 가져온다
npm run import -- --csv ./residents.csv # 로컬 CSV 파일 사용
```

- 검증에 실패하면 `행 번호: 이유`를 모두 출력하고, 파일을 만들지 않고 종료 코드 1로 끝난다.
- 통과하면 `backend/src/main/resources/db/migration/`의 다음 번호로 `V<n>__upsert_residents.sql`을 만든다.
  `INSERT … ON CONFLICT (slug) DO UPDATE`라서 같은 slug는 갱신, 새 slug는 추가된다.
  시트에서 지운 주민을 DB에서 삭제하는 문장은 만들지 않는다.
- 시트에서 지운 주민은 DB에서 지워지지 않는다. 필요하면 별도 마이그레이션으로 직접 삭제한다.
- 생성된 SQL을 반드시 직접 읽어 검토한 뒤 커밋한다.

## 나나(ナナ) 승계 안내 (1회성, 수동)

기존 시드의 ナナ(slug `nana`, 카페 알바생)는 시트의 나나(id 9, slug `r09`, 사서)로 교체한다.
upsert만으로는 옛 `nana` 행이 남아 같은 이름이 둘이 되므로, 스크립트는 일반 upsert만 만들고
**생성된 SQL 파일 맨 앞(헤더 주석 다음)에 개발자가 아래 한 줄을 직접 추가**했다.
스크립트를 다시 돌려 SQL을 새로 만들 일이 있으면 이 줄은 사라지므로, 아직 배포 전이라면 다시 추가해야 한다.

```sql
UPDATE resident SET slug = 'r09' WHERE slug = 'nana';
```

`resident_friendship`은 `resident.id`를 참조하므로 slug만 바꾸면 친밀도 기록이 보존된다.
시트에 없는 주민은 DB에 그대로 남는다(지우려면 별도 마이그레이션을 만든다. 시드 ミユ는 `V19`에서 지웠다).
