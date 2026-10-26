package com.kotonohamachi.theme.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.kotonohamachi.auth.service.EmailSender;
import jakarta.servlet.Filter;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
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

  @MockitoBean
  private EmailSender emailSender;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
        .addFilters(webApplicationContext.getBean("springSecurityFilterChain", Filter.class))
        .build();
  }

  private static String uniqueEmail() {
    return "user-" + UUID.randomUUID() + "@test.com";
  }

  private static String uniqueNickname() {
    return "nick-" + UUID.randomUUID().toString().substring(0, 8);
  }

  private static String signupJson(String email, String password, String nickname) {
    return """
        {"email":"%s","password":"%s","nickname":"%s"}
        """.formatted(email, password, nickname);
  }

  private static String loginJson(String email, String password) {
    return """
        {"email":"%s","password":"%s"}
        """.formatted(email, password);
  }

  private static String verifyEmailJson(String email, String code) {
    return """
        {"email":"%s","code":"%s"}
        """.formatted(email, code);
  }

  /** 새 계정을 만들고 이메일 인증까지 끝낸 뒤 로그인해서, 로그인한 상태의 세션을 돌려준다. */
  private MockHttpSession signUpVerifyAndLogin(String email, String password, String nickname)
      throws Exception {
    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(email, password, nickname)))
        .andExpect(status().isCreated());

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendVerificationCode(eq(email), codeCaptor.capture());

    mockMvc
        .perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content(verifyEmailJson(email, codeCaptor.getValue())))
        .andExpect(status().isNoContent());

    return (MockHttpSession) mockMvc
        .perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginJson(email, password)))
        .andExpect(status().isOk())
        .andReturn()
        .getRequest()
        .getSession();
  }

  private MockHttpSession newLoggedInSession() throws Exception {
    return signUpVerifyAndLogin(uniqueEmail(), "password123", uniqueNickname());
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
        .andExpect(jsonPath("$.message").value("존재하지 않는 테마입니다."));
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
        .andExpect(status().isOk());
    mockMvc
        .perform(post("/api/themes/" + themeId + "/stages/READING/complete").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.completed").value(true));

    mockMvc
        .perform(get("/api/themes").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].completed").value(true));
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
        .andExpect(jsonPath("$[0].prompt").value("混"))
        .andExpect(jsonPath("$[0].correctAnswer").value("섞다, 혼합되다"))
        .andExpect(jsonPath("$[0].options").isArray())
        .andExpect(jsonPath("$[0].jlptLevel").value(2));
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
  void READING_단계_콘텐츠는_V9가_심은_실제_지문_데이터를_반환한다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);

    mockMvc
        .perform(get("/api/themes/" + themeId + "/stages/READING/content").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].prompt").exists())
        .andExpect(jsonPath("$[0].correctAnswer").exists())
        .andExpect(jsonPath("$[0].jlptLevel").exists());
  }

  @Test
  void 존재하지_않는_테마의_콘텐츠는_404를_반환한다() throws Exception {
    MockHttpSession session = newLoggedInSession();

    mockMvc
        .perform(get("/api/themes/999999/stages/KANJI/content").session(session))
        .andExpect(status().isNotFound());
  }
}
