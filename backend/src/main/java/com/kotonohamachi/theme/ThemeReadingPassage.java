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
 * 테마의 독해(READING) 단계에 나오는 지문 하나. 실제 JLPT 독해 코퍼스를 RAG로 검색하는 최종 방식은 코퍼스
 * 출처가 아직 미정이라, 그 전까지 임시로 직접 작성해 심어둔 테스트용 지문이다 — 자세한 배경은
 * {@code V9__create_theme_reading_passage_table.sql} 참고.
 */
@Entity
@Table(name = "theme_reading_passage")
public class ThemeReadingPassage {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "theme_id", nullable = false)
  private Theme theme;

  @Column(name = "jlpt_level", nullable = false)
  private int jlptLevel;

  @Column(nullable = false)
  private String passage;

  @Column
  private String translation;

  @Column(name = "display_order", nullable = false)
  private int displayOrder;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected ThemeReadingPassage() {}

  /**
   * 생성자.
   *
   * @param theme 이 지문이 속한 테마
   * @param jlptLevel JLPT 레벨(5=N5 ~ 1=N1)
   * @param passage 일본어 지문
   * @param translation 한글 번역
   * @param displayOrder 단계 안에서 보여줄 순서
   */
  public ThemeReadingPassage(
      Theme theme, int jlptLevel, String passage, String translation, int displayOrder) {
    this.theme = theme;
    this.jlptLevel = jlptLevel;
    this.passage = passage;
    this.translation = translation;
    this.displayOrder = displayOrder;
  }

  /**
   * JLPT 레벨을 반환한다.
   *
   * @return JLPT 레벨(5=N5 ~ 1=N1)
   */
  public int getJlptLevel() {
    return jlptLevel;
  }

  /**
   * 일본어 지문을 반환한다.
   *
   * @return 일본어 지문
   */
  public String getPassage() {
    return passage;
  }

  /**
   * 지문의 한글 번역을 반환한다.
   *
   * @return 한글 번역
   */
  public String getTranslation() {
    return translation;
  }
}
