-- 독해(READING) 단계용 지문 테이블. 요구사항 문서가 정한 최종 방식(실제 JLPT 지문 코퍼스를
-- pgvector로 검색하고 AI가 이해 문제만 생성하는 RAG)을 쓰기에는 아직 그런 코퍼스를 구하지
-- 못했다(검토 결과는 docs/requirements.md의 "독해(READING) 지문은 RAG 방식으로 만든다" 항목
-- 참고). 그래서 지금은 한자/단어/표현/예문과 같은 방식으로, 테스트용 지문 소수를 직접 작성해
-- 심어두기만 한다.
--
-- 이 마이그레이션은 데이터만 준비하는 단계라, Java 엔티티/리포지토리/API는 아직 연결하지
-- 않았다 — GET /api/themes/{themeId}/stages/READING/content는 계속 501을 반환한다.
CREATE TABLE theme_reading_passage (
    id BIGSERIAL PRIMARY KEY,
    theme_id BIGINT NOT NULL REFERENCES themes (id),
    jlpt_level INTEGER NOT NULL,
    passage TEXT NOT NULL,
    translation TEXT NOT NULL,
    display_order INTEGER NOT NULL
);

-- 카페에서 주문하기
INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order)
VALUES
    (
        (SELECT id FROM themes WHERE title = '카페에서 주문하기'),
        3,
        '今日のカフェは混雑していて、席がなかなか空かなかった。彼女はカウンターで甘いカフェラテを注文し、会計を済ませた。しばらく待っていると、ようやく窓際の席が空いたので、そこに座ることにした。',
        '오늘 카페는 혼잡해서 자리가 좀처럼 나지 않았다. 그녀는 카운터에서 단 카페라테를 주문하고 계산을 마쳤다. 잠시 기다리다 보니 마침내 창가 자리가 비어서, 그곳에 앉기로 했다.',
        1
    ),
    (
        (SELECT id FROM themes WHERE title = '카페에서 주문하기'),
        2,
        '店員に飲み物の種類を聞かれたが、苦い飲み物が苦手なので、甘いものを選んだ。満席だった店内も、彼が席を立つ頃には少し空いていた。',
        '점원에게 음료 종류를 물어봤지만, 쓴 음료를 잘 못 마셔서 단 걸로 골랐다. 만석이었던 매장 안도, 그가 자리에서 일어날 때쯔음엔 조금 비어 있었다.',
        2
    );

-- 길 묻기
INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order)
VALUES
    (
        (SELECT id FROM themes WHERE title = '길 묻기'),
        3,
        '彼は駅の周辺で道に迷ってしまい、近くにいた人に道を尋ねた。「次の交差点を渡って、まっすぐ行けば着きますよ」と教えてもらい、ようやく目的地までの道順がわかった。',
        '그는 역 주변에서 길을 잃어버려, 근처에 있던 사람에게 길을 물었다. "다음 교차로를 건너서 곧장 가면 도착해요"라고 알려줘서, 마침내 목적지까지 가는 길을 알게 되었다.',
        1
    );
