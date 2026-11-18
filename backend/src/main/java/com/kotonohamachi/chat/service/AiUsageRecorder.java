package com.kotonohamachi.chat.service;

import com.kotonohamachi.chat.AiCallType;
import com.kotonohamachi.chat.AiUsage;
import com.kotonohamachi.chat.repository.AiUsageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Gemini 호출을 DB에 기록한다. 기록은 부가 기능이라 실패해도 예외를 밖으로 내보내지 않는다(대화·번역은 그대로 성공). 호출한 쪽이 이미
 * 열어 둔 트랜잭션과 섞이지 않게 항상 새 트랜잭션에서 저장한다.
 */
@Component
public class AiUsageRecorder {

  private static final Logger log = LoggerFactory.getLogger(AiUsageRecorder.class);

  private final AiUsageRepository repository;
  private final TransactionTemplate newTransaction;

  /**
   * 생성자.
   *
   * @param repository 호출 기록 저장소
   * @param transactionManager 트랜잭션 관리자
   */
  public AiUsageRecorder(
      AiUsageRepository repository, PlatformTransactionManager transactionManager) {
    this.repository = repository;
    this.newTransaction = new TransactionTemplate(transactionManager);
    this.newTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
  }

  /**
   * 호출 한 번을 기록한다.
   *
   * @param userId 호출을 일으킨 사용자 ID
   * @param callType 호출 종류
   * @param model 사용한 모델 이름
   * @param inputTokens 입력 토큰 수(모르면 null)
   * @param outputTokens 추론 토큰을 포함한 출력 토큰 수(모르면 null)
   * @param success 응답을 받았는지
   * @param errorStatus 실패했을 때 Google의 HTTP 상태 코드(없으면 null)
   */
  public void record(
      Long userId,
      AiCallType callType,
      String model,
      Integer inputTokens,
      Integer outputTokens,
      boolean success,
      Integer errorStatus) {
    try {
      // 새 트랜잭션이라 기록이 실패해도 호출한 쪽의 트랜잭션(있다면)은 롤백 표시가 되지 않는다.
      newTransaction.executeWithoutResult(status -> repository.save(
          AiUsage.of(userId, callType, model, inputTokens, outputTokens, success, errorStatus)));
    } catch (RuntimeException e) {
      // 기록 실패가 대화를 막으면 안 된다. 예외 메시지에는 값이 섞일 수 있어 클래스 이름만 남긴다.
      log.warn("AI 사용량 기록 실패(무시): {}", e.getClass().getSimpleName());
    }
  }
}
