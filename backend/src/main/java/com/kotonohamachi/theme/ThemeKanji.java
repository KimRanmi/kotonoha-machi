package com.kotonohamachi.theme;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * 테마의 한자(KANJI) 단계에 나오는 한자 하나. 읽는 법·뜻·JLPT 레벨은 kanjiapi.dev(KANJIDIC2)에서
 * 가져온 실제 데이터다 — 자세한 출처는 docs/decisions/0012-theme-content-data-source.md 참고.
 */
@Entity
@Table(name = "theme_kanji")
public class ThemeKanji {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "theme_id", nullable = false)
  private Theme theme;

  @Column(nullable = false)
  private String kanji;

  @Column(name = "on_reading", nullable = false)
  private String onReading;

  @Column(name = "kun_reading", nullable = false)
  private String kunReading;

  @Column(nullable = false)
  private String meaning;

  @Column(name = "jlpt_level", nullable = false)
  private int jlptLevel;

  @Column(name = "display_order", nullable = false)
  private int displayOrder;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected ThemeKanji() {}

  /**
   * 생성자.
   *
   * @param theme 이 한자가 속한 테마
   * @param kanji 한자 글자
   * @param onReading 음독
   * @param kunReading 훈독
   * @param meaning 한글 뜻
   * @param jlptLevel JLPT 레벨(5=N5 ~ 1=N1)
   * @param displayOrder 단계 안에서 보여줄 순서
   */
  public ThemeKanji(
      Theme theme,
      String kanji,
      String onReading,
      String kunReading,
      String meaning,
      int jlptLevel,
      int displayOrder) {
    this.theme = theme;
    this.kanji = kanji;
    this.onReading = onReading;
    this.kunReading = kunReading;
    this.meaning = meaning;
    this.jlptLevel = jlptLevel;
    this.displayOrder = displayOrder;
  }

  /**
   * 한자 글자를 반환한다.
   *
   * @return 한자 글자
   */
  public String getKanji() {
    return kanji;
  }

  /**
   * 음독을 반환한다.
   *
   * @return 음독(쉼표로 구분된 여러 읽는 법일 수 있다)
   */
  public String getOnReading() {
    return onReading;
  }

  /**
   * 훈독을 반환한다.
   *
   * @return 훈독(쉼표로 구분된 여러 읽는 법일 수 있다)
   */
  public String getKunReading() {
    return kunReading;
  }

  /**
   * 뜻을 반환한다.
   *
   * @return 한글 뜻
   */
  public String getMeaning() {
    return meaning;
  }

  /**
   * JLPT 레벨을 반환한다.
   *
   * @return JLPT 레벨(5=N5 ~ 1=N1)
   */
  public int getJlptLevel() {
    return jlptLevel;
  }
}
