package com.kotonohamachi.vocabulary.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.kotonohamachi.auth.service.EmailSender;
import com.kotonohamachi.chat.service.GeminiClient;
import com.kotonohamachi.vocabulary.dto.DictionaryWord;
import com.kotonohamachi.vocabulary.service.DictionaryClient;
import jakarta.servlet.Filter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * 단어장 조회({@code GET /api/vocabulary})와, 테마 단계 완료 시 단어장에 자동 저장되는 흐름을 실제
 * Postgres(Testcontainers)와 Spring Security 필터 체인까지 띄워 검증한다. 세션을 만드는 방식은 {@code
 * ThemeControllerIntegrationTest}와 같다.
 */
@Testcontainers
@SpringBootTest
class VocabularyControllerIntegrationTest {

  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  @Autowired
  private WebApplicationContext webApplicationContext;

  @MockitoBean
  private EmailSender emailSender;

  @MockitoBean
  private DictionaryClient dictionaryClient;

  @MockitoBean
  private GeminiClient geminiClient;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  private MockMvc mockMvc;

  private String lastEmail;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
        .addFilters(webApplicationContext.getBean("springSecurityFilterChain", Filter.class))
        .build();
  }

  private MockHttpSession newLoggedInSession() throws Exception {
    String email = "user-" + UUID.randomUUID() + "@test.com";
    lastEmail = email;
    String password = "password123";
    String nickname = "nick-" + UUID.randomUUID().toString().substring(0, 8);

    mockMvc
        .perform(
            post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"%s","nickname":"%s"}
                """.formatted(
                    email, password, nickname)))
        .andExpect(status().isCreated());

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendVerificationCode(eq(email), codeCaptor.capture());

    mockMvc
        .perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email":"%s","code":"%s"}
                """.formatted(email, codeCaptor.getValue())))
        .andExpect(status().isNoContent());

    return (MockHttpSession) mockMvc
        .perform(
            post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"%s"}
                """.formatted(
                    email, password)))
        .andExpect(status().isOk())
        .andReturn()
        .getRequest()
        .getSession();
  }

  private Long firstThemeId(MockHttpSession session) throws Exception {
    MvcResult result = mockMvc
        .perform(get("/api/themes").session(session))
        .andExpect(status().isOk())
        .andReturn();
    Number themeId = JsonPath.read(result.getResponse().getContentAsString(), "$[0].id");
    return themeId.longValue();
  }

  private Long lastUserId() {
    return jdbcTemplate.queryForObject(
        "SELECT id FROM users WHERE email = ?", Long.class, lastEmail);
  }

  private int vocabularyCount(MockHttpSession session) throws Exception {
    String body = mockMvc
        .perform(get("/api/vocabulary").session(session))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();
    return JsonPath.<List<Object>>read(body, "$").size();
  }

  private int countRows(Long userId, String surfaceForm, String reading) {
    return jdbcTemplate.queryForObject(
        "SELECT count(*) FROM user_vocabulary"
            + " WHERE user_id = ? AND surface_form = ? AND reading = ?",
        Integer.class,
        userId,
        surfaceForm,
        reading);
  }

  private Long insertThemeVocabulary(
      Long themeId, String stage, String surfaceForm, String reading, int displayOrder) {
    return jdbcTemplate.queryForObject(
        "INSERT INTO theme_vocabulary"
            + " (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)"
            + " VALUES (?, ?, ?, ?, '테스트용 뜻', 3, ?) RETURNING id",
        Long.class,
        themeId,
        stage,
        surfaceForm,
        reading,
        displayOrder);
  }

  private void complete(MockHttpSession session, Long themeId, String stage) throws Exception {
    mockMvc
        .perform(
            post("/api/themes/" + themeId + "/stages/" + stage + "/complete").session(session))
        .andExpect(status().isOk());
  }

  @Test
  void 단어장_조회는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc.perform(get("/api/vocabulary")).andExpect(status().isUnauthorized());
  }

  @Test
  void 아무것도_배우지_않았으면_단어장은_비어_있다() throws Exception {
    MockHttpSession session = newLoggedInSession();

    mockMvc
        .perform(get("/api/vocabulary").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());
  }

  @Test
  void WORD_EXPRESSION_단계를_완료하면_단어가_THEME_출처로_단어장에_저장된다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);

    complete(session, themeId, "KANJI");
    complete(session, themeId, "WORD");
    // 시드 기준 첫 테마는 단어 3개, 표현 2개다.
    assertThat(vocabularyCount(session)).isEqualTo(3);

    complete(session, themeId, "EXPRESSION");
    assertThat(vocabularyCount(session)).isEqualTo(5);

    mockMvc
        .perform(get("/api/vocabulary").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].source").value("THEME"))
        .andExpect(jsonPath("$[0].surfaceForm").isNotEmpty())
        .andExpect(jsonPath("$[0].reading").isNotEmpty())
        .andExpect(jsonPath("$[0].meaning").isNotEmpty())
        .andExpect(jsonPath("$[0].savedAt").isNotEmpty());
  }

  @Test
  void 이미_단어장에_있는_단어는_예외_없이_건너뛰고_중복_행이_생기지_않는다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);
    Long userId = lastUserId();
    jdbcTemplate.update(
        "INSERT INTO user_vocabulary (user_id, surface_form, reading, meaning, source)"
            + " VALUES (?, '電磁波', 'でんじは', '미리 저장된 뜻', 'CHAT')",
        userId);

    complete(session, themeId, "KANJI");
    complete(session, themeId, "WORD");

    assertThat(vocabularyCount(session)).isEqualTo(3);
    assertThat(countRows(userId, "電磁波", "でんじは")).isEqualTo(1);
    // 기존 행은 덮어쓰지 않는다.
    assertThat(jdbcTemplate.queryForObject(
            "SELECT source FROM user_vocabulary WHERE user_id = ? AND surface_form = '電磁波'",
            String.class,
            userId))
        .isEqualTo("CHAT");
  }

  @Test
  void 같은_테마의_WORD와_EXPRESSION이_겹쳐도_예외_없이_한_번만_저장된다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);
    Long userId = lastUserId();
    // WORD의 '撮影'을 EXPRESSION에도 넣고, 같은 EXPRESSION 안에 '述べる'를 두 번 넣어 겹침을 만든다.
    List<Long> addedIds = new ArrayList<>();
    try {
      addedIds.add(insertThemeVocabulary(themeId, "EXPRESSION", "撮影", "さつえい", 10));
      addedIds.add(insertThemeVocabulary(themeId, "EXPRESSION", "述べる", "のべる", 11));
      addedIds.add(insertThemeVocabulary(themeId, "EXPRESSION", "述べる", "のべる", 12));

      complete(session, themeId, "KANJI");
      complete(session, themeId, "WORD");
      assertThat(vocabularyCount(session)).isEqualTo(3);

      complete(session, themeId, "EXPRESSION");

      // 표현 2개만 새로 늘고, 겹친 3건은 건너뛴다.
      assertThat(vocabularyCount(session)).isEqualTo(5);
      assertThat(countRows(userId, "撮影", "さつえい")).isEqualTo(1);
      assertThat(countRows(userId, "述べる", "のべる")).isEqualTo(1);
    } finally {
      for (Long id : addedIds) {
        jdbcTemplate.update("DELETE FROM theme_vocabulary WHERE id = ?", id);
      }
    }
  }

  @Test
  void 다른_사용자의_단어장은_보이지_않는다() throws Exception {
    MockHttpSession learner = newLoggedInSession();
    Long themeId = firstThemeId(learner);
    complete(learner, themeId, "KANJI");
    complete(learner, themeId, "WORD");

    MockHttpSession other = newLoggedInSession();

    mockMvc
        .perform(get("/api/vocabulary").session(other))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());
  }

  private static final DictionaryWord SHIKKI =
      new DictionaryWord("漆器", "しっき", "lacquer ware, lacquerware", null);

  private org.springframework.test.web.servlet.ResultActions saveChatWord(
      MockHttpSession session, String word) throws Exception {
    return mockMvc.perform(post("/api/vocabulary/chat")
        .session(session)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"word\":\"" + word + "\"}"));
  }

  @Test
  void 대화_단어_저장은_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc
        .perform(post("/api/vocabulary/chat")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"word\":\"漆器\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void 대화에서_고른_단어를_한국어_뜻으로_CHAT_출처로_저장하고_단어장에_보인다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    when(dictionaryClient.lookup("漆器")).thenReturn(Optional.of(SHIKKI));
    when(geminiClient.translateMeaning(SHIKKI)).thenReturn("칠기, 옻칠 공예품");

    saveChatWord(session, "漆器")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.alreadySaved").value(false))
        .andExpect(jsonPath("$.entry.reading").value("しっき"))
        .andExpect(jsonPath("$.entry.meaning").value("칠기, 옻칠 공예품"))
        .andExpect(jsonPath("$.entry.source").value("CHAT"));

    mockMvc
        .perform(get("/api/vocabulary").session(session))
        .andExpect(jsonPath("$[0].surfaceForm").value("漆器"))
        .andExpect(jsonPath("$[0].meaning").value("칠기, 옻칠 공예품"));
  }

  @Test
  void 이미_저장한_단어는_번역_호출_없이_이미_저장됨으로_응답한다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    when(dictionaryClient.lookup("囲炉裏")).thenReturn(Optional.of(IRORI));
    when(geminiClient.translateMeaning(IRORI)).thenReturn("칠기");

    saveChatWord(session, "囲炉裏").andExpect(status().isOk());
    saveChatWord(session, "囲炉裏")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.alreadySaved").value(true));

    assertThat(countRows(lastUserId(), "囲炉裏", "いろり")).isEqualTo(1);
    verify(geminiClient, times(1)).translateMeaning(any());
  }

  private static final DictionaryWord IRORI = new DictionaryWord("囲炉裏", "いろり", "hearth", null);
  private static final DictionaryWord YUKI = new DictionaryWord("雪", "ゆき", "snow", null);

  @Test
  void 사전에_없는_단어는_404이고_저장하지_않는다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    when(dictionaryClient.lookup("ほげほげ")).thenReturn(Optional.empty());

    saveChatWord(session, "ほげほげ").andExpect(status().isNotFound());

    assertThat(vocabularyCount(session)).isZero();
    verify(geminiClient, never()).translateMeaning(any());
  }

  @Test
  void 번역이_실패하면_영어_뜻을_그대로_저장한다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    when(dictionaryClient.lookup("雪")).thenReturn(Optional.of(YUKI));
    when(geminiClient.translateMeaning(YUKI))
        .thenThrow(new com.kotonohamachi.common.ApiException(
            com.kotonohamachi.chat.ChatErrorCode.DAILY_LIMIT_EXCEEDED));

    saveChatWord(session, "雪")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.entry.meaning").value("snow"));
  }

  @Test
  void 공백이_섞이거나_빈_단어는_400이다() throws Exception {
    MockHttpSession session = newLoggedInSession();

    saveChatWord(session, "漆器 です").andExpect(status().isBadRequest());
    saveChatWord(session, "  ").andExpect(status().isBadRequest());
  }
}
