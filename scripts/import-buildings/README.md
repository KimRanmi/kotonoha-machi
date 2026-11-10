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
| location | 건물이 있는 장소 이름(최대 30자, 건물끼리 중복 불가). 주민 시트의 `location` 값과 글자가 같으면 그 주민이 이 건물에 속한다 (`꽃집`, `카페` 등) |

예시 행:

```csv
id,label,x,z,width,depth,height,color,location
cafe,カフェ,0,-6,4,3.5,2.5,#C97B4A,카페
```

## 건물과 주민의 연결

건물 시트의 `location`과 주민 시트의 `location`을 **같은 글자로** 적으면 연결된다(`scripts/import-residents` 참고).
한 건물에 여러 주민이 속할 수 있고, 건물이 없는 장소(예: `거리`)나 빈 칸이면 건물 밖에서 지낸다. 문자열로만 잇기 때문에
두 시트의 SQL은 어느 쪽을 먼저 적용해도 된다. 건물에 들어가면 그 건물에 속한 주민 중 가장 먼저 등록된 한 명과 대화한다.

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
- `V25`는 테이블만 만든다. 건물 데이터는 이 스크립트가 만든 SQL이 채운다.
- 건물이 겹치거나 문 앞이 막히지 않는지는 스크립트가 검사하지 않는다. 좌표를 바꾸면 마을에서 직접 확인한다.
