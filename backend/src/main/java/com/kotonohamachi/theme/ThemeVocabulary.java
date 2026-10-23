package com.kotonohamachi.theme;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * 테마의 단어(WORD) 또는 표현(EXPRESSION) 단계에 나오는 항목 하나. 두 단계는 표기·읽는 법·뜻·JLPT
 * 레벨이라는 같은 데이터 모양을 가져서 {@link #stage}로만 구분한다. 데이터는 kanjiapi.dev(JMdict)에서
 * 가져온 실제 사전 데이터다 — 자세한 출처는 docs/decisions/0012-theme-content-data-source.md 참고.
 */
@Entity
@Table(name = "theme_vocabulary")
public class ThemeVocabulary {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "theme_id", nullable = false)
  private Theme theme;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ThemeStage stage;

  @Column(name = "surface_form", nullable = false)
  private String surfaceForm;

  @Column(nullable = false)
  private String reading;

  @Column(nullable = false)
  private String meaning;

  @Column(name = "jlpt_level", nullable = false)
  private int jlptLevel;

  @Column(name = "display_order", nullable = false)
  private int displayOrder;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected ThemeVocabulary() {}

  /**
   * 생성자.
   *
   * @param theme 이 항목이 속한 테마
   * @param stage {@link ThemeStage#WORD} 또는 {@link ThemeStage#EXPRESSION}
   * @param surfaceForm 한자·가나로 쓰인 표기
   * @param reading 히라가나 읽는 법
   * @param meaning 한글 뜻
   * @param jlptLevel JLPT 레벨(5=N5 ~ 1=N1)
   * @param displayOrder 단계 안에서 보여줄 순서
   */
  public ThemeVocabulary(
      Theme theme,
      ThemeStage stage,
      String surfaceForm,
      String reading,
      String meaning,
      int jlptLevel,
      int displayOrder) {
    this.theme = theme;
    this.stage = stage;
    this.surfaceForm = surfaceForm;
    this.reading = reading;
    this.meaning = meaning;
    this.jlptLevel = jlptLevel;
    this.displayOrder = displayOrder;
  }

  /**
   * 이 항목이 속한 단계를 반환한다.
   *
   * @return {@link ThemeStage#WORD} 또는 {@link ThemeStage#EXPRESSION}
   */
  public ThemeStage getStage() {
    return stage;
  }

  /**
   * 단어·표현의 표기를 반환한다.
   *
   * @return 한자·가나로 쓰인 표기
   */
  public String getSurfaceForm() {
    return surfaceForm;
  }

  /**
   * 읽는 법을 반환한다.
   *
   * @return 히라가나 읽는 법
   */
  public String getReading() {
    return reading;
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
