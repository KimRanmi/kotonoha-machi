package com.kotonohamachi.theme.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.kotonohamachi.TestSessions;
import com.kotonohamachi.user.repository.UserRepository;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * 테마 목록 조회({@code GET /api/themes})와 단계 완료 처리({@code POST
 * /api/themes/{id}/stages/{stage}/complete})를 실제 Postgres(Testcontainers)와 Spring Security 필터
 * 체인까지 띄워 검증한다. 회원가입 → 이메일 인증 → 로그인으로 세션을 만드는 방식은 {@code
 * ProfileControllerIntegrationTest}와 같다. 테마는 {@code V6__create_theme_tables.sql}이 시드한 데이터를
 * 그대로 쓴다.
 */
@Testcontainers
@SpringBootTest
class ThemeControllerIntegrationTest {

  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  @Autowired
  private WebApplicationContext webApplicationContext;

  @Autowired
  private UserRepository userRepository;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
        .addFilters(webApplicationContext.getBean("springSecurityFilterChain", Filter.class))
        .build();
  }

  private MockHttpSession newLoggedInSession() {
    return TestSessions.loggedInSession(userRepository);
  }

  /** 시드된 첫 번째 테마의 ID를 조회한다. */
  private Long firstThemeId(MockHttpSession session) throws Exception {
    MvcResult result = mockMvc
        .perform(get("/api/themes").session(session))
        .andExpect(status().isOk())
        .andReturn();
    Number themeId = JsonPath.read(result.getResponse().getContentAsString(), "$[0].id");
    return themeId.longValue();
  }

  @Test
  void 테마_목록_조회는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc.perform(get("/api/themes")).andExpect(status().isUnauthorized());
  }

  @Test
  void 기존_학습은_지워지고_위키백과_학습_10개만_남는다() throws Exception {
    MockHttpSession session = newLoggedInSession();

    mockMvc
        .perform(get("/api/themes").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(10))
        .andExpect(jsonPath("$[?(@.title == '카페에서 주문하기')]").isEmpty())
        .andExpect(jsonPath("$[?(@.title == '자기소개하기')]").isEmpty())
        .andExpect(jsonPath("$[0].title").value("X線"));
  }

  @Test
  void 아직_시작하지_않은_테마는_KANJI_단계와_완료되지_않은_상태로_내려온다() throws Exception {
    MockHttpSession session = newLoggedInSession();

    mockMvc
        .perform(get("/api/themes").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].currentStage").value("KANJI"))
        .andExpect(jsonPath("$[0].completed").value(false));
  }

  @Test
  void 단계_완료는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc
        .perform(post("/api/themes/1/stages/KANJI/complete"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void 존재하지_않는_테마면_404를_반환한다() throws Exception {
    MockHttpSession session = newLoggedInSession();

    mockMvc
        .perform(post("/api/themes/999999/stages/KANJI/complete").session(session))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.message").value("존재하지 않는 학습입니다."));
  }

  @Test
  void KANJI_단계를_완료하면_다음_단계인_WORD로_넘어간다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);

    mockMvc
        .perform(post("/api/themes/" + themeId + "/stages/KANJI/complete").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.currentStage").value("WORD"))
        .andExpect(jsonPath("$.completed").value(false));
  }

  @Test
  void 단계를_건너뛰어_완료하려_하면_409를_반환한다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);

    mockMvc
        .perform(post("/api/themes/" + themeId + "/stages/WORD/complete").session(session))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.message").value("이전 단계를 먼저 끝내야 합니다."));
  }

  @Test
  void 오늘의_테마가_아닌_테마의_단계를_완료하려_하면_409를_반환한다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    MvcResult result = mockMvc
        .perform(get("/api/themes").session(session))
        .andExpect(status().isOk())
        .andReturn();
    Number secondThemeId = JsonPath.read(result.getResponse().getContentAsString(), "$[1].id");

    mockMvc
        .perform(post("/api/themes/" + secondThemeId + "/stages/KANJI/complete").session(session))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.message").value("오늘의 학습이 아닙니다. 오늘의 학습만 진행할 수 있습니다."));
  }

  @Test
  void 이미_끝난_단계를_다시_완료하려_하면_409를_반환한다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);

    mockMvc
        .perform(post("/api/themes/" + themeId + "/stages/KANJI/complete").session(session))
        .andExpect(status().isOk());

    mockMvc
        .perform(post("/api/themes/" + themeId + "/stages/KANJI/complete").session(session))
        .andExpect(status().isConflict());
  }

  @Test
  void 모든_단계를_순서대로_끝내면_완료_처리되고_목록_조회에도_반영된다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);

    mockMvc
        .perform(post("/api/themes/" + themeId + "/stages/KANJI/complete").session(session))
        .andExpect(status().isOk());
    mockMvc
        .perform(post("/api/themes/" + themeId + "/stages/WORD/complete").session(session))
        .andExpect(status().isOk());
    mockMvc
        .perform(post("/api/themes/" + themeId + "/stages/EXPRESSION/complete").session(session))
        .andExpect(status().isOk());
    mockMvc
        .perform(post("/api/themes/" + themeId + "/stages/EXAMPLE/complete").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.currentStage").value("READING"));
    mockMvc
        .perform(post("/api/themes/" + themeId + "/stages/READING/complete").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.currentStage").value("REVIEW"));
    mockMvc
        .perform(post("/api/themes/" + themeId + "/stages/REVIEW/complete").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.completed").value(true));

    mockMvc
        .perform(get("/api/themes").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].completed").value(true));
  }

  @Test
  void 완료한_학습_목록은_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc.perform(get("/api/themes/completed")).andExpect(status().isUnauthorized());
  }

  @Test
  void 완료한_테마가_없으면_완료한_학습_목록은_비어_있다() throws Exception {
    MockHttpSession session = newLoggedInSession();

    mockMvc
        .perform(get("/api/themes/completed").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void 테마를_완료하면_완료한_학습_목록에_완료_시각과_레벨이_담긴다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);
    for (String stage :
        new String[] {"KANJI", "WORD", "EXPRESSION", "EXAMPLE", "READING", "REVIEW"}) {
      mockMvc
          .perform(
              post("/api/themes/" + themeId + "/stages/" + stage + "/complete").session(session))
          .andExpect(status().isOk());
    }

    mockMvc
        .perform(get("/api/themes/completed").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].id").value(themeId))
        .andExpect(jsonPath("$[0].completedAt").isNotEmpty())
        .andExpect(jsonPath("$[0].levels").isArray())
        .andExpect(jsonPath("$[0].levels[0]").isNumber());
  }

  @Test
  void 단계_콘텐츠_조회는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc
        .perform(get("/api/themes/1/stages/KANJI/content"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void KANJI_단계_콘텐츠는_V8이_심은_실제_한자_데이터를_반환한다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);

    mockMvc
        .perform(get("/api/themes/" + themeId + "/stages/KANJI/content").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].prompt").value("磁"))
        .andExpect(jsonPath("$[0].correctAnswer").value("자석, 도자기"))
        .andExpect(jsonPath("$[0].options").isArray())
        .andExpect(jsonPath("$[0].jlptLevel").value(1));
  }

  @Test
  void EXAMPLE_단계_콘텐츠는_V8이_심은_실제_예문_데이터를_반환한다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);

    mockMvc
        .perform(get("/api/themes/" + themeId + "/stages/EXAMPLE/content").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].prompt").exists())
        .andExpect(jsonPath("$[0].correctAnswer").exists());
  }

  @Test
  void 독해_조회는_지문_출처_이해_문제와_해설을_반환한다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);

    mockMvc
        .perform(get("/api/themes/" + themeId + "/reading").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.passage").isNotEmpty())
        .andExpect(jsonPath("$.sourceTitle").value("X線"))
        .andExpect(jsonPath("$.license").value("CC BY-SA 4.0"))
        .andExpect(jsonPath("$.excerpt").value(true))
        .andExpect(jsonPath("$.questions.length()").value(3))
        .andExpect(jsonPath("$.questions[0].options.length()").value(4))
        .andExpect(jsonPath("$.questions[0].explanation").isNotEmpty());
  }

  @Test
  void REVIEW_단계_콘텐츠는_한자_단어_표현_예문을_모아_말하기_항목으로_반환한다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);

    mockMvc
        .perform(get("/api/themes/" + themeId + "/stages/REVIEW/content").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].prompt").value("磁"))
        .andExpect(jsonPath("$[0].correctAnswer").value("磁"))
        .andExpect(jsonPath("$[0].reading").value("ジ"))
        .andExpect(jsonPath("$[0].options").isEmpty());
  }

  @Test
  void 존재하지_않는_테마의_콘텐츠는_404를_반환한다() throws Exception {
    MockHttpSession session = newLoggedInSession();

    mockMvc
        .perform(get("/api/themes/999999/stages/KANJI/content").session(session))
        .andExpect(status().isNotFound());
  }
}
