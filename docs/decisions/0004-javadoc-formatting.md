# 0004. Javadoc 줄바꿈 예외: Palantir Java Format + formatJavadoc(false)

- 날짜: 2026-10-19
- 상태: 확정

## 배경

CLAUDE.md에는 "Javadoc이나 매개변수가 세로로 과도하게 줄바꿈되지 않게, 가로로 길게 쓰는
것을 허용하고 줄 길이 제한을 느슨하게 적용한다"는 규칙이 있었다. 하지만 이 규칙은 실제
포맷터(Spotless의 `googleJavaFormat()`)로는 적용할 방법이 없었다 — Google Java Format은
줄 폭(100자)을 설정할 수 있는 옵션이 아예 없는, 의도적으로 설정 불가능한 포맷터다.

## 시도한 것과 안 된 이유

- **Palantir Java Format으로 교체 후 폭을 120/140자로 늘리기**: 시도했지만 안 됐다.
  Palantir Java Format은 Google Java Format의 포크지만, 폭도 똑같이 100자로 고정돼 있다
  (`--length` CLI 옵션이 있어 보이지만, 이건 "지정한 범위만 포맷"하는 기능이지 폭 설정이
  아니다). 즉 "구글 스타일 계열 포맷터는 전부 100자 고정"이라는 게 실제 제약이었다.

## 결정

Javadoc 주석만 포맷터 대상에서 완전히 제외한다. 나머지 코드(메서드/생성자 매개변수 등)는
그대로 100자 제한을 따른다 — 이쪽은 포맷터가 라인을 어떻게 쪼갤지 결정하는 핵심 알고리즘
자체에 폭이 박혀있어 예외를 둘 수 없다.

- `backend/build.gradle`의 Spotless Java 스텝을 `googleJavaFormat()`에서
  `palantirJavaFormat('2.102.0').style('GOOGLE').formatJavadoc(false)`로 바꿨다.
  - `style('GOOGLE')`로 들여쓰기(2-space)·임포트 정렬 등은 기존과 동일하게 유지했다
    (안 쓰면 Palantir 기본값이 4-space라 전체 코드 들여쓰기가 깨진다 — 실제로 한 번
    겪고 되돌렸다).
  - `formatJavadoc(false)`로 Javadoc 블록(`/** ... */`)은 포맷터가 아예 손대지 않는다.
    한 줄로 길게 쓰든 여러 줄로 나누든 작성한 그대로 유지된다.
- `backend/config/checkstyle/checkstyle.xml`에 `SuppressWithPlainTextCommentFilter`를
  하나 더 추가해, `LineLength` 규칙이 Javadoc 블록(`/**` ~ `*/`) 안의 줄은 검사하지 않게
  했다(기존에 text-block을 예외 처리하던 것과 같은 방식). 이게 없으면 100자 넘는 Javadoc
  줄마다 빌드를 막지는 않지만 경고(WARN)가 계속 뜬다.

## 검증

- `AuthController.java`의 2줄짜리 Javadoc을 162자짜리 한 줄로 바꾼 뒤 `./gradlew
  spotlessApply`를 돌려서 줄바꿈되지 않고 그대로 유지되는 것을 확인했다.
- `./gradlew clean build`로 전체 빌드·테스트(28개)가 그대로 통과하는 것을 확인했다.
- `./gradlew checkstyleMain`에서 해당 Javadoc 줄에 대한 `LineLength` 경고가 사라진 것을
  확인했다(일반 코드 줄의 100자 제한은 그대로 유지됨 — 테스트 메서드명 관련 기존 경고
  22건은 이 변경과 무관해서 그대로 남아있다).

## 한계

- Palantir Java Format은 Google Java Format의 서드파티 포크다. "구글 코드 컨벤션을
  절대 표준으로 따른다"는 CLAUDE.md 원칙에서 아주 살짝 벗어나는 지점이지만, 실제로
  바뀌는 건 "Javadoc을 포맷터가 건드리지 않는다"는 것뿐이고, 나머지 스타일(들여쓰기,
  임포트 정렬, 일반 코드 줄 길이 등)은 전부 기존과 동일하다.
