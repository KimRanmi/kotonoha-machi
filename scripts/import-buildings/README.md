# import-buildings

구글 시트에서 편집한 마을 건물(위치·크기·색·간판 이름)을 읽어 검토용 Flyway SQL로 만들어 주는 개발 도구다.
백엔드/프런트엔드 앱에는 포함되지 않는다. 구조는 `import-residents`와 같다(`docs/decisions/0023`).

## 역할 분리

- **구글 시트**: 건물 정보의 원본. 사람이 편집한다.
- **이 스크립트**: 웹 게시 CSV를 읽어 검증하고 `V<n>__upsert_buildings.sql`을 만든다. DB에는 직접 쓰지 않는다.
- **사람**: 생성된 SQL을 검토하고 커밋한다. 배포 시 Flyway가 DB에 반영한다.
- **백엔드/프런트**: DB 값을 `GET /api/village/buildings`로 받아 마을을 그린다.

## 시트 열

첫 행은 아래 헤더 이름이어야 한다 (순서 무관). 모두 필수이고, 다른 이름의 열이 있으면 거부한다.

| 열 | 설명 |
| --- | --- |
| id | 건물 고유 키. 영문 소문자로 시작하는 소문자·숫자·`_` 20자 이내 (`home`, `cafe`, `shop`). 한 번 정하면 바꾸지 않는다 |
| label | 간판에 적히는 일본어 이름 (최대 20자) |
| x, z | 건물 중심 좌표 (숫자) |
| width, depth, height | x 방향 길이, z 방향 길이, 벽 높이 (0보다 큰 숫자) |
| color | 벽 색 `#RRGGBB` |

예시 행:

```csv
id,label,x,z,width,depth,height,color
cafe,カフェ,-8,-4,5,4,2.5,#C97B4A
```

## 건물과 주민의 연결

건물 시트에는 주민 칸이 없다. 주민이 어느 건물에 속하는지는 **주민 시트의 `building` 열**에 건물 id를 적는다
(`scripts/import-residents` 참고). 한 건물에 여러 주민이 속할 수 있고, 비워 두면 소속 없이 마을에서 지낸다.
주민 SQL의 `work_building`이 건물 `slug`를 참조하므로 **건물 SQL이 먼저** 적용돼야 한다(새 건물을 만들 때는 건물 → 주민 순서로 스크립트를 돌린다).

## 시트 게시 방법

1. 구글 시트에서 파일 > 공유 > 웹에 게시.
2. 건물 시트(탭)를 고르고 형식을 `쉼표로 구분된 값(.csv)`로 선택한 뒤 게시.
3. 나온 URL을 `.env`의 `BUILDING_SHEET_CSV_URL`에 넣는다. (URL을 아는 사람은 누구나 읽을 수 있으니 공개해도 되는 내용만 쓴다.)

## 사용법

```bash
cd scripts/import-buildings
cp .env.example .env   # BUILDING_SHEET_CSV_URL을 채워넣는다
npm run import                           # .env의 URL에서 CSV를 가져온다
npm run import -- --csv ./buildings.csv  # 로컬 CSV 파일 사용
```

의존성 설치는 필요 없다 (Node 22.9 이상).

- 검증에 실패하면 `행 번호: 이유`를 모두 출력하고, 파일을 만들지 않고 종료 코드 1로 끝난다.
- 통과하면 `backend/src/main/resources/db/migration/`의 다음 번호로 `V<n>__upsert_buildings.sql`을 만든다.
  `INSERT … ON CONFLICT (slug) DO UPDATE`라서 같은 id는 갱신, 새 id는 추가된다.
- 시트에서 지운 건물은 DB에서 지워지지 않는다. 필요하면 별도 마이그레이션으로 직접 삭제한다.
- 생성된 SQL을 반드시 직접 읽어 검토한 뒤 커밋한다. 이미 적용된 마이그레이션 파일은 절대 고치지 않는다.
- 처음 시트를 만들 때는 `V25`의 시드(`home`, `cafe`, `shop`)와 같은 값으로 채우면 새 SQL이 값 변화 없이 적용된다.
