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

  @Column
  private String location;

  @Column
  private String gender;

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

  /**
   * 주민이 지내는 장소 이름을 반환한다. 같은 이름의 건물이 있으면 그 건물에 속한 주민이다.
   *
   * @return 장소 이름. 정하지 않았으면 null
   */
  public String getLocation() {
    return location;
  }

  /**
   * 주민의 성별을 반환한다. 대화 말투와 음성 목소리를 정하는 데 쓴다.
   *
   * @return M(남성) 또는 F(여성). 정하지 않았으면 null
   */
  public String getGender() {
    return gender;
  }
}
