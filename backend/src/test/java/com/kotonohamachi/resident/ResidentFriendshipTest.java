package com.kotonohamachi.resident;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** {@link ResidentFriendship}이 친밀도를 올리는 규칙(첫 대화 +5, 이후 +1, 하루 10, 최대 100)을 검증한다. */
class ResidentFriendshipTest {

  private static final LocalDate DAY1 = LocalDate.of(2026, 11, 11);
  private static final LocalDate DAY2 = DAY1.plusDays(1);

  private ResidentFriendship friendship() {
    return ResidentFriendship.start(1L, 1L);
  }

  @Test
  void 하루_첫_대화는_5_이후는_1씩_오른다() {
    ResidentFriendship friendship = friendship();

    assertThat(friendship.earnChatGain(DAY1)).isEqualTo(5);
    assertThat(friendship.earnChatGain(DAY1)).isEqualTo(1);
    assertThat(friendship.getLevel()).isEqualTo(6);
  }

  @Test
  void 하루_합계는_10을_넘지_않는다() {
    ResidentFriendship friendship = friendship();

    int total = 0;
    for (int i = 0; i < 20; i++) {
      total += friendship.earnChatGain(DAY1);
    }

    assertThat(total).isEqualTo(10);
    assertThat(friendship.getLevel()).isEqualTo(10);
    assertThat(friendship.earnChatGain(DAY1)).isZero();
  }

  @Test
  void 날이_바뀌면_다시_첫_대화로_5가_오른다() {
    ResidentFriendship friendship = friendship();
    for (int i = 0; i < 20; i++) {
      friendship.earnChatGain(DAY1);
    }

    assertThat(friendship.earnChatGain(DAY2)).isEqualTo(5);
    assertThat(friendship.getLevel()).isEqualTo(15);
  }

  @Test
  void 친밀도는_100을_넘지_않는다() {
    ResidentFriendship friendship = friendship();
    LocalDate day = DAY1;
    for (int i = 0; i < 30; i++) {
      for (int j = 0; j < 20; j++) {
        friendship.earnChatGain(day);
      }
      day = day.plusDays(1);
    }

    assertThat(friendship.getLevel()).isEqualTo(ResidentFriendship.MAX_LEVEL);
    assertThat(friendship.earnChatGain(day)).isZero();
  }
}
