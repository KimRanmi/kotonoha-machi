package com.kotonohamachi.vocabulary;

import com.kotonohamachi.user.User;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;

/** 한 사용자의 단어장에 저장된 단어 하나. 같은 표기+읽는 법은 사용자당 한 번만 저장된다. */
@Entity
@Table(
    name = "user_vocabulary",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "surface_form", "reading"}))
public class VocabularyEntry {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "surface_form", nullable = false)
  private String surfaceForm;

  @Column(nullable = false)
  private String reading;

  @Column(nullable = false)
  private String meaning;

  @Column(name = "jlpt_level")
  private Integer jlptLevel;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private VocabularySource source;

  @Column(name = "saved_at", nullable = false, updatable = false)
  private OffsetDateTime savedAt;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected VocabularyEntry() {}

  /**
   * 생성자.
   *
   * @param user 단어장 주인
   * @param surfaceForm 한자·가나로 쓰인 표기
   * @param reading 히라가나 읽는 법
   * @param meaning 한글 뜻
   * @param jlptLevel JLPT 레벨(5=N5 ~ 1=N1, 모르면 null)
   * @param source 단어가 들어온 경로
   */
  public VocabularyEntry(
      User user,
      String surfaceForm,
      String reading,
      String meaning,
      Integer jlptLevel,
      VocabularySource source) {
    this.user = user;
    this.surfaceForm = surfaceForm;
    this.reading = reading;
    this.meaning = meaning;
    this.jlptLevel = jlptLevel;
    this.source = source;
  }

  @PrePersist
  private void onCreate() {
    savedAt = OffsetDateTime.now();
  }

  /**
   * 단어 표기를 반환한다.
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
   * @return JLPT 레벨(5=N5 ~ 1=N1, 모르면 null)
   */
  public Integer getJlptLevel() {
    return jlptLevel;
  }

  /**
   * 단어가 들어온 경로를 반환한다.
   *
   * @return 저장 경로
   */
  public VocabularySource getSource() {
    return source;
  }

  /**
   * 단어장에 저장된 시각을 반환한다.
   *
   * @return 저장 시각
   */
  public OffsetDateTime getSavedAt() {
    return savedAt;
  }
}
