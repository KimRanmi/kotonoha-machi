package com.kotonohamachi.vocabulary.service;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.theme.ThemeStage;
import com.kotonohamachi.theme.ThemeVocabulary;
import com.kotonohamachi.theme.repository.ThemeVocabularyRepository;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import com.kotonohamachi.vocabulary.VocabularyEntry;
import com.kotonohamachi.vocabulary.VocabularyErrorCode;
import com.kotonohamachi.vocabulary.VocabularySource;
import com.kotonohamachi.vocabulary.dto.ChatWordResponse;
import com.kotonohamachi.vocabulary.dto.DictionaryWord;
import com.kotonohamachi.vocabulary.dto.VocabularyResponse;
import com.kotonohamachi.vocabulary.repository.VocabularyRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용자의 학습 단어장에 단어를 저장한다. 뜻·읽는 법·JLPT 레벨은 AI가 만들지 않고 DB에 있는 실제 사전 데이터를
 * 그대로 복사한다.
 */
@Service
public class VocabularyService {

  private static final int MAX_WORD_LENGTH = 30;
  /** 하루에 대화로 새로 저장할 수 있는 단어 수. 번역(Gemini 무료 한도)과 사전 호출이 바닥나지 않게 막는다. */
  static final int DAILY_CHAT_WORD_LIMIT = 30;

  private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");
  /** 선택 영역 양끝에 딸려 온 문장부호(일본어·영어)를 떼는 정규식. */
  private static final String EDGE_PUNCTUATION =
      "^[\\p{Punct}\\p{IsPunctuation}\\s]+|[\\p{Punct}\\p{IsPunctuation}\\s]+$";

  private final VocabularyRepository vocabularyRepository;
  private final ThemeVocabularyRepository themeVocabularyRepository;
  private final UserRepository userRepository;
  private final DictionaryClient dictionaryClient;
  private final MeaningTranslator meaningTranslator;

  /**
   * 생성자.
   *
   * @param vocabularyRepository 단어장 저장소
   * @param themeVocabularyRepository 테마 단어·표현 콘텐츠 저장소
   * @param userRepository 사용자 저장소
   * @param dictionaryClient 사전 조회 클라이언트
   * @param meaningTranslator 영어 뜻을 한국어로 옮기는 번역기
   */
  public VocabularyService(
      VocabularyRepository vocabularyRepository,
      ThemeVocabularyRepository themeVocabularyRepository,
      UserRepository userRepository,
      DictionaryClient dictionaryClient,
      MeaningTranslator meaningTranslator) {
    this.vocabularyRepository = vocabularyRepository;
    this.themeVocabularyRepository = themeVocabularyRepository;
    this.userRepository = userRepository;
    this.dictionaryClient = dictionaryClient;
    this.meaningTranslator = meaningTranslator;
  }

  /**
   * 대화 중 사용자가 고른 단어를 사전에서 찾아 단어장에 저장한다. 읽는 법·JLPT·뜻은 사전 데이터이고, AI는 영어 뜻을 한국어로
   * 번역만 한다. 같은 표기+읽는 법이 이미 있으면 번역(Gemini 호출) 없이 기존 항목을 돌려준다. 외부 호출이 길어질 수 있어 이
   * 메서드 전체를 트랜잭션으로 묶지 않는다.
   *
   * @param userId 단어장 주인 ID(로그인한 본인)
   * @param rawWord 사용자가 고른 일본어 표기
   * @return 저장 결과(이미 있었는지 여부 포함)
   * @throws ApiException 단어가 형식에 맞지 않거나(400), 사전에 없거나(404), 사전 서버 문제(502)
   */
  public ChatWordResponse saveChatWord(Long userId, String rawWord) {
    String word = normalizeWord(rawWord);
    DictionaryWord found = dictionaryClient
        .lookup(word)
        .orElseThrow(() -> new ApiException(VocabularyErrorCode.WORD_NOT_FOUND));

    Optional<VocabularyEntry> existing = vocabularyRepository.findByUserIdAndSurfaceFormAndReading(
        userId, found.surfaceForm(), found.reading());
    if (existing.isPresent()) {
      return new ChatWordResponse(true, VocabularyResponse.from(existing.get()));
    }

    // 이미 있는 단어는 위에서 돌려보냈으므로, 여기부터가 번역을 쓰는 새 저장이다.
    OffsetDateTime todayStart =
        LocalDate.now(KOREA_ZONE).atStartOfDay(KOREA_ZONE).toOffsetDateTime();
    if (vocabularyRepository.countByUserIdAndSourceAndSavedAtGreaterThanEqual(
            userId, VocabularySource.CHAT, todayStart)
        >= DAILY_CHAT_WORD_LIMIT) {
      throw new ApiException(VocabularyErrorCode.DAILY_WORD_LIMIT_EXCEEDED);
    }

    String meaning = meaningTranslator.toKorean(found, userId);
    VocabularyEntry entry = new VocabularyEntry(
        findUserOrThrow(userId),
        found.surfaceForm(),
        found.reading(),
        meaning,
        found.jlptLevel(),
        VocabularySource.CHAT);
    try {
      return new ChatWordResponse(false, VocabularyResponse.from(vocabularyRepository.save(entry)));
    } catch (DataIntegrityViolationException exception) {
      // 같은 단어 저장이 동시에 들어와 뒤에 온 요청이 유니크 제약에 걸린 경우: 먼저 저장된 항목을 돌려준다.
      return vocabularyRepository
          .findByUserIdAndSurfaceFormAndReading(userId, found.surfaceForm(), found.reading())
          .map(saved -> new ChatWordResponse(true, VocabularyResponse.from(saved)))
          .orElseThrow(() -> new ApiException(VocabularyErrorCode.SAVE_CONFLICT));
    }
  }

  /** 앞뒤 공백·문장부호(「」。、 등)를 떼고, 비었거나 공백이 섞였거나 너무 길면 거절한다. */
  static String normalizeWord(String rawWord) {
    String word = rawWord == null ? "" : rawWord.strip().replaceAll(EDGE_PUNCTUATION, "");
    if (word.isEmpty() || word.length() > MAX_WORD_LENGTH || word.matches(".*\\s.*")) {
      throw new ApiException(VocabularyErrorCode.WORD_INVALID);
    }
    return word;
  }

  /**
   * 테마 학습의 한 단계에서 배운 단어를 단어장에 저장한다. 단어({@link ThemeStage#WORD})와 표현({@link
   * ThemeStage#EXPRESSION}) 단계만 대상이고, 다른 단계는 아무것도 저장하지 않는다. 이미 단어장에 있는 단어는
   * 건너뛰므로 같은 단계를 다시 호출해도 안전하다. 이미 있는 단어는 단어마다 묻지 않고 한 번에 조회해서 가려낸다.
   *
   * @param userId 단어장 주인 ID(로그인한 본인)
   * @param themeId 배운 테마 ID
   * @param stage 완료한 단계
   * @return 이번에 새로 저장한 단어 수
   * @throws ApiException 같은 단계의 완료가 동시에 처리되어 저장이 겹치면(409). 이 예외로 호출한 쪽의 트랜잭션 전체(단계 완료
   *     포함)가 취소된다.
   */
  @Transactional
  public int saveThemeWords(Long userId, Long themeId, ThemeStage stage) {
    if (stage != ThemeStage.WORD && stage != ThemeStage.EXPRESSION) {
      return 0;
    }
    List<ThemeVocabulary> learnedWords =
        themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(themeId, stage);
    if (learnedWords.isEmpty()) {
      return 0;
    }

    // 이미 저장된 단어와, 이번 배치에서 방금 고른 단어를 한 집합으로 관리해서 중복을 건너뛴다.
    Set<WordKey> knownWords = vocabularyRepository
        .findAllByUserIdAndSurfaceFormIn(
            userId,
            learnedWords.stream()
                .map(ThemeVocabulary::getSurfaceForm)
                .distinct()
                .toList())
        .stream()
        .map(entry -> new WordKey(entry.getSurfaceForm(), entry.getReading()))
        .collect(Collectors.toCollection(HashSet::new));

    User user = findUserOrThrow(userId);
    List<VocabularyEntry> newEntries = new ArrayList<>();
    for (ThemeVocabulary word : learnedWords) {
      if (knownWords.add(new WordKey(word.getSurfaceForm(), word.getReading()))) {
        newEntries.add(new VocabularyEntry(
            user,
            word.getSurfaceForm(),
            word.getReading(),
            word.getMeaning(),
            word.getJlptLevel(),
            VocabularySource.THEME));
      }
    }

    try {
      vocabularyRepository.saveAll(newEntries);
    } catch (DataIntegrityViolationException exception) {
      // 같은 사용자의 같은 단계 완료가 동시에 들어와 둘 다 위의 조회를 통과한 경우, 뒤에 온 요청이 DB 유니크 제약에 걸린다.
      // 이 시점의 DB 트랜잭션은 이미 실패 상태라 여기서 계속 진행할 수 없으므로, ApiException으로 바꿔 던져 전체를 취소한다.
      throw new ApiException(VocabularyErrorCode.SAVE_CONFLICT);
    }
    return newEntries.size();
  }

  /**
   * 사용자의 단어장을 최근 저장한 순서로 조회한다.
   *
   * @param userId 단어장 주인 ID(로그인한 본인)
   * @return 단어장 목록
   */
  @Transactional(readOnly = true)
  public List<VocabularyResponse> getVocabulary(Long userId) {
    return vocabularyRepository.findAllByUserIdOrderBySavedAtDescIdDesc(userId).stream()
        .map(VocabularyResponse::from)
        .toList();
  }

  /** 단어장에서 같은 단어를 가리는 기준: 표기와 읽는 법이 모두 같아야 같은 단어다. */
  private record WordKey(String surfaceForm, String reading) {}

  private User findUserOrThrow(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new IllegalStateException("로그인한 사용자를 찾을 수 없습니다."));
  }
}
