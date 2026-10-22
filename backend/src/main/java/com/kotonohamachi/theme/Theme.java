package com.kotonohamachi.theme;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * 학습 테마 하나. 실제 한자/단어/표현/예문/독해 콘텐츠는 아직 별도로 설계되지 않아 제목만 가진다 — 콘텐츠 데이터 모델은
 * 이후 작업에서 다룬다.
 */
@Entity
@Table(name = "themes")
public class Theme {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String title;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected Theme() {}

  /**
   * 생성자.
   *
   * @param title 테마 제목
   */
  public Theme(String title) {
    this.title = title;
  }

  /**
   * 테마 ID를 반환한다.
   *
   * @return 테마 ID
   */
  public Long getId() {
    return id;
  }

  /**
   * 테마 제목을 반환한다.
   *
   * @return 테마 제목
   */
  public String getTitle() {
    return title;
  }
}
