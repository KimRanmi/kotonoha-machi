package com.kotonohamachi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/** 백엔드 애플리케이션 진입점. */
@SpringBootApplication
@EnableAsync
public class KotonohaMachiApplication {

  /**
   * 애플리케이션을 시작한다.
   *
   * @param args 커맨드라인 인자
   */
  public static void main(String[] args) {
    SpringApplication.run(KotonohaMachiApplication.class, args);
  }
}
