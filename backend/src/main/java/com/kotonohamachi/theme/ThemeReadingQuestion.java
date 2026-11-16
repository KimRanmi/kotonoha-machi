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
import java.util.List;

/** 독해 지문({@link ThemeReadingPassage})에 딸린 이해 문제 하나. 보기는 4개이고 정답은 1~4번 중 하나다. */
@Entity
@Table(name = "theme_reading_question")
public class ThemeReadingQuestion {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "passage_id", nullable = false)
  private ThemeReadingPassage passage;

  @Column(nullable = false)
  private String question;

  @Column(name = "choice_1", nullable = false)
  private String choice1;

  @Column(name = "choice_2", nullable = false)
  private String choice2;

  @Column(name = "choice_3", nullable = false)
  private String choice3;

  @Column(name = "choice_4", nullable = false)
  private String choice4;

  @Column(name = "answer_index", nullable = false)
  private int answerIndex;

  @Column(nullable = false)
  private String explanation;

  @Column(name = "display_order", nullable = false)
  private int displayOrder;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected ThemeReadingQuestion() {}

  /**
   * 생성자.
   *
   * @param passage 이 문제가 속한 지문
   * @param question 질문
   * @param choices 보기 4개(순서대로 1~4번)
   * @param answerIndex 정답 번호(1~4)
   * @param explanation 정답 해설(왜 그 보기가 정답인지)
   * @param displayOrder 지문 안에서 보여줄 순서
   */
  public ThemeReadingQuestion(
      ThemeReadingPassage passage,
      String question,
      List<String> choices,
      int answerIndex,
      String explanation,
      int displayOrder) {
    this.passage = passage;
    this.question = question;
    this.choice1 = choices.get(0);
    this.choice2 = choices.get(1);
    this.choice3 = choices.get(2);
    this.choice4 = choices.get(3);
    this.answerIndex = answerIndex;
    this.explanation = explanation;
    this.displayOrder = displayOrder;
  }

  /**
   * 질문을 반환한다.
   *
   * @return 질문
   */
  public String getQuestion() {
    return question;
  }

  /**
   * 보기 4개를 저장된 순서대로 반환한다.
   *
   * @return 보기 목록
   */
  public List<String> getChoices() {
    return List.of(choice1, choice2, choice3, choice4);
  }

  /**
   * 정답 보기를 반환한다.
   *
   * @return 정답 보기 문자열
   */
  public String getCorrectChoice() {
    return getChoices().get(answerIndex - 1);
  }

  /**
   * 정답 해설을 반환한다.
   *
   * @return 정답 해설
   */
  public String getExplanation() {
    return explanation;
  }
}
