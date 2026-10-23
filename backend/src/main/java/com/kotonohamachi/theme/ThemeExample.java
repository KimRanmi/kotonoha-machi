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
 * 테마의 예문(EXAMPLE) 단계에 나오는 예문 하나. Tatoeba(CC BY)에서 가져온 실제 예문·번역이다 — 자세한
 * 출처는 docs/decisions/0012-theme-content-data-source.md 참고.
 */
@Entity
@Table(name = "theme_example")
public class ThemeExample {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "theme_id", nullable = false)
  private Theme theme;

  @Column(name = "japanese_sentence", nullable = false)
  private String japaneseSentence;

  @Column(nullable = false)
  private String translation;

  @Column(name = "display_order", nullable = false)
  private int displayOrder;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected ThemeExample() {}

  /**
   * 생성자.
   *
   * @param theme 이 예문이 속한 테마
   * @param japaneseSentence 일본어 예문
   * @param translation 한글 번역
   * @param displayOrder 단계 안에서 보여줄 순서
   */
  public ThemeExample(Theme theme, String japaneseSentence, String translation, int displayOrder) {
    this.theme = theme;
    this.japaneseSentence = japaneseSentence;
    this.translation = translation;
    this.displayOrder = displayOrder;
  }

  /**
   * 일본어 예문을 반환한다.
   *
   * @return 일본어 예문
   */
  public String getJapaneseSentence() {
    return japaneseSentence;
  }

  /**
   * 예문의 한글 번역을 반환한다.
   *
   * @return 한글 번역
   */
  public String getTranslation() {
    return translation;
  }
}
