package com.kotonohamachi.resident;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 마을에 사는 주민(NPC). 성격과 현재 상황이 대화의 말투와 내용을 정한다. */
@Entity
@Table(name = "resident")
public class Resident {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String personality;

  @Column(name = "current_context", nullable = false)
  private String currentContext;

  @Column(nullable = false)
  private String slug;

  @Column(name = "speech_style", nullable = false)
  private String speechStyle;

  @Column(nullable = false)
  private String background;

  @Column(name = "sample_lines", nullable = false)
  private String sampleLines;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected Resident() {}

  public Long getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public String getPersonality() {
    return personality;
  }

  public String getCurrentContext() {
    return currentContext;
  }

  public String getSlug() {
    return slug;
  }

  public String getSpeechStyle() {
    return speechStyle;
  }

  public String getBackground() {
    return background;
  }

  public String getSampleLines() {
    return sampleLines;
  }
}
