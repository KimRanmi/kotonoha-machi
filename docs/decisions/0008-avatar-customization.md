# 0008. 캐릭터 아바타 꾸미기: DiceBear(voxel-art)로 2D 미리보기

- 날짜: 2026-10-22
- 상태: 확정

## 배경

프로필 화면의 캐릭터 꾸미기(피부색/머리색/헤어스타일/옷/신발 5축, 요구사항
`docs/requirements.md` "프로필" 절)를 구현하면서, 선택값을 미리보기 이미지로 보여줄
외부 서비스가 필요했다. 결제 없이 쓸 수 있고, 나중에 다른 서비스로 바꾸기 쉬운 쪽을
우선 기준으로 뒀다(아직 Three.js 캐릭터 에셋이 없는 단계라, 지금 고른 서비스는 임시
미리보기 용도다).

고려한 후보:

- **DiceBear**: 무료·오픈소스, API 키 불필요, URL 파라미터만으로 SVG를 즉시 받는다.
  다만 대부분의 스타일이 상반신(얼굴+어깨)만 그려서 "신발" 축을 표현할 수 없는 게
  문제였다.
- **Ready Player Me**: 전신 3D 아바타를 지원하지만 OAuth/SDK 연동이 필요해 지금 당장
  드는 비용이 훨씬 크다. "가볍게 시작해서 나중에 바꾼다"는 기준에 맞지 않았다.

DiceBear 10.4에서 추가된 **voxel-art** 스타일을 확인한 결과, 전신 복셀 캐릭터이고
`skinColor`/`hairColor`/`topVariant`(헤어스타일)/`outfitVariant`(옷)/`shoesColor`
(신발 색)를 모두 지원해 5축을 전부 커버할 수 있었다.

## 결정

**DiceBear voxel-art**를 2D 미리보기 렌더러로 쓴다. API 키/백엔드 연동 없이
프런트엔드에서 `https://api.dicebear.com/10.x/voxel-art/svg?...` URL을 직접
`<img src>`에 넣는다(`frontend/src/lib/avatarPreview.ts`).

**저장 데이터와 렌더러를 분리**했다: 백엔드는 DiceBear를 전혀 모른다. `User` 엔티티와
API는 우리가 정한 5개 enum(`AvatarSkinColor`, `AvatarHairColor`, `AvatarHairStyle`,
`AvatarClothesStyle`, `AvatarShoesColor`)만 다루고, enum 이름 → DiceBear 파라미터
매핑은 프런트엔드의 `avatarPreview.ts` 한 파일에만 있다. 색상 축(피부색/머리색/신발
색)은 미리 정한 16진 색상값으로, 스타일 축(헤어스타일/옷)은 이름을 소문자로 바꾸면
DiceBear 파라미터 값과 그대로 맞는다. 나중에 다른 렌더러로 바꿔도 저장된 데이터와
DB 스키마는 그대로 두고 이 파일만 고치면 된다.

선택지 개수는 다섯 축 모두 DiceBear voxel-art가 실제로 지원하는 값 중 일부를 골라
확정했다(`AvatarHairStyle` 8종, `AvatarClothesStyle` 10종, 색상 축은 각 5종). 축별
전체 목록은 `GET /api/users/me/avatar/options`로 서버가 내려주므로, 화면이 값을
하드코딩하지 않고 항상 서버 기준을 따른다.

## 적용 범위

- `users` 테이블에 컬럼 5개 추가(`V5__add_avatar_columns.sql`), 기존 사용자도 가입
  직후와 같은 기본값(연한 피부색/흑발/짧은 머리/기본 옷/흰 신발)으로 시작한다.
- `PATCH /api/users/me/avatar`: 다섯 축을 한 번에 바꾼다(부분 수정은 지원하지 않음).
- `GET /api/users/me/avatar/options`: 축별 선택지 전체 목록(고정값, 사용자별로
  다르지 않음).
- 닉네임 수정과 같은 화면(프로필 화면)에서, 닉네임 폼 바로 아래에 둔다(요구사항의
  "닉네임 수정과 캐릭터 꾸미기를 같은 화면에서" 조건).

## 한계 (알고 있는 트레이드오프)

- voxel-art는 복셀(블록) 스타일 그림체라, 나중에 Three.js로 만들 실제 3D 캐릭터
  외형과는 다르게 보인다. 지금은 "선택한 값이 어떻게 보이는지 감만 잡는" 임시
  미리보기이고, 마을 화면의 3D 캐릭터 렌더링은 별도로 구현해야 한다(요구사항 3번
  항목, 아직 미구현).
- DiceBear 공개 API를 그대로 호출하므로, 그 서비스가 느려지거나 응답하지 않으면
  미리보기 이미지만 안 보인다(선택/저장 자체는 영향받지 않는다). 재시도 로직은
  지금 범위에 넣지 않았다.

## 나중에 재검토할 조건

- 실제 3D 캐릭터 에셋 제작 단계에 들어가면, 그 에셋이 지금 정한 5개 enum 값(색상
  16진값·헤어스타일/옷 종류)을 그대로 쓸 수 있는지 다시 확인한다. 안 맞으면
  `avatarPreview.ts`의 매핑만 바꾸거나, enum 값 자체를 조정한다(DB 마이그레이션 필요).
