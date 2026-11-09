package com.kotonohamachi.vocabulary.controller;

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

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
        .addFilters(webApplicationContext.getBean("springSecurityFilterChain", Filter.class))
        .build();
  }

  private MockHttpSession newLoggedInSession() throws Exception {
    String email = "user-" + UUID.randomUUID() + "@test.com";
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
  void KANJI만_완료하면_단어장은_비어_있다() throws Exception {
    MockHttpSession session = newLoggedInSession();
    Long themeId = firstThemeId(session);

    complete(session, themeId, "KANJI");

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
    int afterWord = JsonPath.<java.util.List<Object>>read(
            mockMvc
                .perform(get("/api/vocabulary").session(session))
                .andReturn()
                .getResponse()
                .getContentAsString(),
            "$")
        .size();
    complete(session, themeId, "EXPRESSION");

    mockMvc
        .perform(get("/api/vocabulary").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].source").value("THEME"))
        .andExpect(jsonPath("$[0].surfaceForm").isNotEmpty())
        .andExpect(jsonPath("$[0].reading").isNotEmpty())
        .andExpect(jsonPath("$[0].meaning").isNotEmpty())
        .andExpect(jsonPath("$[0].savedAt").isNotEmpty());
    org.junit.jupiter.api.Assertions.assertTrue(afterWord > 0, "WORD 완료 후 단어가 저장되어야 한다");
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
}
