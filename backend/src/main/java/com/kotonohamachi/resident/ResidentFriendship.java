package com.kotonohamachi.resident;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

/** 사용자와 주민 사이의 친밀도(0~100). 행이 없으면 0으로 취급한다. */
@Entity
@Table(name = "resident_friendship")
public class ResidentFriendship {

  public static final int MAX_LEVEL = 100;

  /** 하루의 첫 대화로 오르는 양. */
  static final int FIRST_CHAT_GAIN = 5;

  /** 그날 두 번째부터의 대화로 오르는 양. */
  static final int NEXT_CHAT_GAIN = 1;

  /** 한 주민에 대해 하루에 오를 수 있는 최대 양. */
  static final int DAILY_GAIN_LIMIT = 10;

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "resident_id", nullable = false)
  private Long residentId;

  @Column(nullable = false)
  private int level;

  @Column(name = "today_gain", nullable = false)
  private int todayGain;

  @Column(name = "last_gain_date")
  private LocalDate lastGainDate;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected ResidentFriendship() {}

  /** 친밀도 0에서 시작하는 새 행을 만든다. */
  public static ResidentFriendship start(Long userId, Long residentId) {
    ResidentFriendship friendship = new ResidentFriendship();
    friendship.userId = userId;
    friendship.residentId = residentId;
    return friendship;
  }

  public Long getResidentId() {
    return residentId;
  }

  public int getLevel() {
    return level;
  }

  /**
   * 대화 한 번에 해당하는 만큼 친밀도를 올린다. 그날 첫 대화는 +5, 이후는 +1이고, 하루 합계는 10을 넘지 않으며 전체는 100을 넘지 않는다.
   *
   * @param today 오늘 날짜(한국 시간)
   * @return 실제로 오른 양(한도에 막히면 0)
   */
  public int earnChatGain(LocalDate today) {
    boolean firstChatToday = !today.equals(lastGainDate);
    if (firstChatToday) {
      lastGainDate = today;
      todayGain = 0;
    }
    int wanted = firstChatToday ? FIRST_CHAT_GAIN : NEXT_CHAT_GAIN;
    int gain = Math.min(wanted, Math.min(DAILY_GAIN_LIMIT - todayGain, MAX_LEVEL - level));
    gain = Math.max(gain, 0);
    todayGain += gain;
    level += gain;
    return gain;
  }
}
