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
 * 테마의 독해(READING) 단계에 나오는 지문 하나. 일본어 위키백과 글에서 가져오므로 출처 정보(제목·주소·라이선스·발췌
 * 여부)를 함께 가진다. 출처 정보와 번역은 옛 지문에는 없을 수 있어 null이다({@code
 * V39__add_reading_source_and_questions.sql} 참고).
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

  private String translation;

  @Column(name = "source_title")
  private String sourceTitle;

  @Column(name = "source_url")
  private String sourceUrl;

  private String license;

  @Column(name = "is_excerpt", nullable = false)
  private boolean excerpt;

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
   * 지문 ID를 반환한다.
   *
   * @return 지문 ID
   */
  public Long getId() {
    return id;
  }

  /**
   * 출처 글 제목을 반환한다.
   *
   * @return 출처 글 제목(없으면 null)
   */
  public String getSourceTitle() {
    return sourceTitle;
  }

  /**
   * 출처 글 주소를 반환한다.
   *
   * @return 출처 글 주소(없으면 null)
   */
  public String getSourceUrl() {
    return sourceUrl;
  }

  /**
   * 라이선스 표기를 반환한다.
   *
   * @return 라이선스(없으면 null)
   */
  public String getLicense() {
    return license;
  }

  /**
   * 글의 일부만 발췌했는지 반환한다.
   *
   * @return 발췌이면 true
   */
  public boolean isExcerpt() {
    return excerpt;
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
