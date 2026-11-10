package com.kotonohamachi.village;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * 마을에 서 있는 건물 하나. 위치(x, z)는 건물 중심, width는 x 방향, depth는 z 방향 길이다. 값의 원본은 구글 시트이고, 읽기
 * 전용으로 쓴다.
 */
@Entity
@Table(name = "building")
public class Building {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String slug;

  @Column(nullable = false)
  private String label;

  @Column(nullable = false)
  private double x;

  @Column(nullable = false)
  private double z;

  @Column(nullable = false)
  private double width;

  @Column(nullable = false)
  private double depth;

  @Column(nullable = false)
  private double height;

  @Column(nullable = false)
  private String color;

  @Column(nullable = false)
  private String location;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected Building() {}

  public String getSlug() {
    return slug;
  }

  public String getLabel() {
    return label;
  }

  public double getX() {
    return x;
  }

  public double getZ() {
    return z;
  }

  public double getWidth() {
    return width;
  }

  public double getDepth() {
    return depth;
  }

  public double getHeight() {
    return height;
  }

  public String getColor() {
    return color;
  }

  /**
   * 건물이 있는 장소 이름(주민 시트의 location 값과 같다)을 반환한다.
   *
   * @return 장소 이름
   */
  public String getLocation() {
    return location;
  }
}
