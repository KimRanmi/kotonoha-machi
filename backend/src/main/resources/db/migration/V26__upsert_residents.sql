-- scripts/import-residents 가 구글 시트에서 생성한 주민 페르소나 upsert. 검토 후 커밋한다.
-- 시트에서 지운 주민은 삭제하지 않는다.

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r01', 'カイト', '무뚝뚝/オレ系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 180cm의 거구, 짧게 깎은 머리에 낡은 작업복 차림의 항구 하역 노동자
핵심 특징: 말수가 적고 퉁명스럽지만 길 잃은 아이를 모른 척하지 못하는 의리파. 어린 시절 아버지를 바다에서 잃어 폭풍 전에는 늘 잠을 설친다
취미: 새벽 방파제 낚시, 낡은 라디오 수리', '', '거리')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r02', 'ソラ', '활발/元気系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 노란 후드티에 운동화, 늘 무릎에 반창고를 붙인 중학생 배달부 소년
핵심 특징: 동네 모든 골목을 꿰고 있는 에너자이저. 에너지가 넘쳐 매번 사고를 치지만 약속은 반드시 지키며, 언젠가 전국 일주를 하는 것이 꿈
취미: 자전거 곡예, 매미 채집', '', '거리')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r03', 'ユイ', '친절/普通系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 앞치마가 어울리는 상점가 꽃집 점원, 단정한 단발에 부드러운 미소
핵심 특징: 누구에게나 다정하지만 정작 자기 이야기는 잘 하지 않는 사람. 돌아가신 할머니의 꽃집을 이어받아 지키고 있다
취미: 압화 만들기, 계절 꽃말 사전 수집', '', '꽃집')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r04', 'ダイスケ', '먹보/ボク系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 통통한 체형에 동그란 안경, 항상 간식 봉지를 든 라면 가게 견습생
핵심 특징: 느긋하고 순해서 화를 낼 줄 모른다. 맛있는 음식 앞에서는 눈물을 흘리는 감성파이며 언젠가 자기 가게를 여는 게 목표
취미: 라멘 육수 연구, 편의점 신상 간식 리뷰', '', '라면집')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r05', 'レイカ', '오만·성숙/アタシ系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 긴 흑발에 붉은 립스틱, 고급 기모노를 세련되게 입은 찻집 여주인
핵심 특징: 도도하고 말투가 날카롭지만 손님의 고민은 끝까지 들어주는 해결사. 과거 유명 게이샤 집안의 후계자였으나 스스로 가문을 떠났다
취미: 다도, 고전 샤미센 연주', '', '찻집')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r06', 'ハヤト', '무사·운동/キザ系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 단정한 도복 차림에 포니테일, 검도부 주장인 고등학생
핵심 특징: 자기 확신이 강하고 폼 잡는 말투를 쓰는 로맨티스트. 사실은 시합 직전마다 손이 떨릴 정도로 긴장하는 소심한 면이 있다
취미: 목검 수련, 고전 시집 낭독', '', '카페')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r07', 'ミク', '아이돌/アタシ系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 반짝이는 무대 의상과 트윈테일, 지하 라이브하우스 출신 신인 아이돌
핵심 특징: 무대 위에서는 완벽한 프로지만 무대 뒤에서는 인스턴트 라면을 먹으며 팬레터를 읽는 소박한 소녀. 인기를 얻기 위해 가족에게 거짓말을 하고 상경했다
취미: 안무 연습, 팬레터 스크랩북', '', '편의점')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r08', 'ゲンゾウ', '늙은이/ヨボヨボ系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 굽은 허리에 하얀 수염, 낡은 밀짚모자를 쓴 마을 최고령 농부
핵심 특징: 같은 이야기를 몇 번이고 하지만 그 속에 마을의 역사가 담겨 있다. 오래전 세상을 떠난 아내의 몫까지 매일 밥상을 차린다
취미: 분재 가꾸기, 장기', '', '거리')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r09', 'ナナ', '친절/普通系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 큰 숄더백과 카메라를 멘 지역 도서관 사서, 둥근 안경
핵심 특징: 책 추천의 달인으로 이용자의 표정만 보고 필요한 책을 골라준다. 어릴 적 전학을 반복해 도서관을 유일한 친구로 삼았던 사연이 있다
취미: 헌책방 순례, 필름 카메라 촬영', '', '도서관')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r10', 'ドウゲン', '무뚝뚝/オレ系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 검은 승복에 삭발, 산속 낡은 절의 젊은 주지 승려
핵심 특징: 필요한 말만 하는 냉정한 사람이지만 상담은 누구보다 정확하다. 한때 도쿄의 잘나가던 회사원이었다가 번아웃 끝에 출가했다
취미: 정원 가꾸기, 심야 라디오 청취', '', '절')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r11', 'リク', '활발/元気系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 헐렁한 저지에 헤드폰을 목에 건 거리 댄서, 염색한 파란 머리
핵심 특징: 어디서든 음악만 나오면 춤부터 추는 분위기 메이커. 사실 학창 시절 따돌림 경험이 있어 새로운 친구가 생길 때마다 몰래 기뻐한다
취미: 브레이크댄스, 중고 LP 수집', '', '거리')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r12', 'マリエ', '오만·성숙/アタシ系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 하이힐과 정장 차림의 30대 패션 잡지 편집장
핵심 특징: 완벽주의에 독설가지만 후배들의 성장을 누구보다 바란다. 일에 모든 것을 바친 대가로 연애는 늘 뒷전이다
취미: 빈티지 와인 수집, 심야 드라이브', '', '카페')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r13', 'ショウタ', '먹보/ボク系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 앞니가 살짝 나온 귀여운 얼굴의 빵집 아르바이트 대학생
핵심 특징: 순진하고 천진난만해서 빵 굽는 냄새만 맡아도 행복해지는 낙천가. 장학금을 받으려 쉬지 않고 일하지만 힘든 내색은 절대 하지 않는다
취미: 천연발효종 키우기, 빵집 순례', '', '빵집')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r14', 'アカネ', '활발/元気系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 주황색 앞치마에 손수건을 두른 포장마차 타코야키 장인, 20대 중반
핵심 특징: 손님과 농담을 주고받으며 장사하는 마을의 인기인. 빚을 진 가게를 되살리려 홀로 포장마차를 끌고 전국을 돌았다
취미: 만담 라이브 관람, 길고양이 밥 주기', '', '타코야끼 가게')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r15', 'セイジ', '무사·운동/キザ系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 길게 기른 머리를 묶고 낡은 기타 케이스를 멘 방랑 음유시인
핵심 특징: 늘 시적인 말투로 분위기를 잡지만 정작 길치라 자주 길을 잃는다. 고향을 떠나온 이유를 누구에게도 말하지 않는다
취미: 어쿠스틱 기타 작곡, 별자리 관측', '', '거리')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r16', 'ハルカ', '친절/普通系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 하얀 가운 위에 카디건을 걸친 마을 보건교사
핵심 특징: 아이들의 작은 변화도 놓치지 않는 포근한 어른. 정작 본인은 야근으로 끼니를 거르는 일이 잦아 주변이 걱정한다
취미: 허브차 블렌딩, 뜨개질', '', '학교')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r17', 'カツラ', '늙은이/ヨボヨボ系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 작은 체구에 보랏빛 숄을 두른 할머니 점술가
핵심 특징: 느릿한 말투로 엉뚱한 예언을 하지만 이상하게 자주 맞는다. 젊은 시절 해외를 누빈 여행가였다는 소문이 있다
취미: 타로 카드 모으기, 동네 아이들에게 옛날이야기 해주기', '', '거리')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r18', 'レン', '아이돌/アタシ系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 중성적인 미모에 은색 단발, 화려한 무대 화장을 한 버추얼 유튜버 겸 가수
핵심 특징: 화면 속에선 카리스마 넘치지만 실제로는 낯을 가려 편의점 계산도 어려워한다. 얼굴을 숨기고 활동하는 이유에는 가족과의 갈등이 있다
취미: 심야 게임 방송, 작사 노트 쓰기', '', '카페')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r19', 'サクラ', '무뚝뚝/オレ系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 짧은 머리에 가죽 재킷, 중고 오토바이를 타는 여성 정비사
핵심 특징: 거칠게 말하지만 고객의 오토바이는 자기 몸처럼 아끼는 장인. 부모의 정비소를 물려받기 위해 몰래 자격증을 땄다
취미: 오토바이 투어, 정비 공구 수집', '', '오토바이 가게')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;

INSERT INTO resident (slug, name, personality, current_context, speech_style, background, sample_lines, location)
VALUES ('r20', 'アキラ', '오만·성숙/アタシ系', '마을에서 평소처럼 하루를 보내고 있다.', '', '외모·직업: 정갈한 셔츠에 가는 금테 안경, 야간 재즈바의 바텐더
핵심 특징: 말수는 적지만 한마디가 정곡을 찌르는 냉철한 관찰자. 손님의 칵테일 취향만 보고 지금의 기분을 맞히는 특기가 있다
취미: 위스키 시음, 흑백 영화 감상', '', '술집')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, personality = EXCLUDED.personality, current_context = EXCLUDED.current_context, speech_style = EXCLUDED.speech_style, background = EXCLUDED.background, sample_lines = EXCLUDED.sample_lines, location = EXCLUDED.location;
