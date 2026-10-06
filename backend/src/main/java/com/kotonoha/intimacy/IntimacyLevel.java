package com.kotonoha.intimacy;

import java.util.List;

// 친밀도 단계. minExchanges는 해당 단계에 도달하는 데 필요한 누적 대화 횟수(주고받기 1회 = 1).
// 사용자에게는 수치/게이지/단계명 없이 서술형 문구(description)만 보여준다 — 현실의 관계처럼
// "정확히 얼마나 남았는지" 알 수 없게 하는 것이 의도다. 마지막 단계가 상한이다.
public record IntimacyLevel(int minExchanges, String description, String prompt) {

    private static final List<IntimacyLevel> LEVELS = List.of(
            new IntimacyLevel(0, "아직 낯선 사이예요",
                    "상대와는 아직 거의 초면입니다. 예의 바르고 조금 거리를 둔 정중한 말투를 쓰고, 이름이나 사는 곳 같은 가벼운 화제 위주로 이야기하세요. 사적인 이야기는 꺼내지 마세요."),
            new IntimacyLevel(3, "얼굴은 알아보는 사이가 됐어요",
                    "상대와 몇 번 얼굴을 마주친 사이입니다. 얼굴을 알아보고 반갑게 인사하되 여전히 정중한 말투를 유지하고, 날씨나 오늘 하루 같은 일상적인 화제를 이야기하세요."),
            new IntimacyLevel(8, "요즘 자주 얘기해서 편해졌어요",
                    "상대와 자주 이야기해서 편해진 사이입니다. 말투가 한결 부드러워지고 가끔 편한 표현이 섞여도 좋습니다. 이전 대화에서 나온 내용을 자연스럽게 기억해 언급하고, 취미나 좋아하는 음식 같은 화제를 꺼내세요."),
            new IntimacyLevel(15, "서로 안부를 묻는 친구예요",
                    "상대와는 친구 사이입니다. 반말에 가까운 편한 말투(だよ・だね 등)를 섞어 쓰고, 안부를 먼저 묻거나 최근 있었던 소소한 일, 마을 사람들 이야기를 자연스럽게 나누세요."),
            new IntimacyLevel(25, "속마음까지 나누는 사이예요",
                    "상대와는 아주 친한 친구입니다. 편한 반말 중심으로 이야기하고, 고민이나 꿈, 어릴 적 추억 같은 속마음을 조금씩 털어놓으세요. 상대의 근황에도 깊이 공감하세요."),
            new IntimacyLevel(40, "둘도 없는 친구가 됐어요",
                    "상대와는 둘도 없는 단짝입니다. 격의 없는 반말로 이야기하고, 둘만 아는 농담이나 함께한 추억을 언급하며, 마음속 깊은 이야기와 새로운 에피소드(마을의 비밀, 앞으로 하고 싶은 일 등)를 스스럼없이 나누세요."));

    // 누적 대화 횟수에 해당하는 가장 높은 단계.
    public static IntimacyLevel of(int exchanges) {
        IntimacyLevel result = LEVELS.get(0);
        for (IntimacyLevel level : LEVELS) {
            if (exchanges >= level.minExchanges) result = level;
        }
        return result;
    }

    // 시스템 프롬프트 뒤에 덧붙일 친밀도별 대화 지침. 단계 이름이나 "친밀도"라는 말은 대사에 드러내지 않고
    // 태도와 화제로만 표현하도록 지시한다 (메타 UI 없이 대화 내용 자체가 신호가 되게 하기 위함).
    public static String promptFor(int exchanges) {
        return "\n\n[상대와의 관계]\n" + of(exchanges).prompt
                + "\n관계나 친밀도 자체를 언급하지 말고, 말투와 화제로만 자연스럽게 드러내세요. "
                + "위의 대화 원칙(일본어로만 응답 등)은 그대로 지킵니다.";
    }
}
