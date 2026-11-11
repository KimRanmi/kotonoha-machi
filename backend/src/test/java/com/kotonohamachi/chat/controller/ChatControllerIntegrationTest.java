package com.kotonohamachi.chat.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kotonohamachi.auth.service.EmailSender;
import com.kotonohamachi.chat.dto.ChatResponse;
import com.kotonohamachi.chat.service.GeminiClient;
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
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * 주민 대화 저장과 기록 조회({@code GET /api/residents/{slug}/chat})를 실제 Postgres(Testcontainers)와 Spring
 * Security 필터 체인까지 띄워 검증한다. Gemini 호출만 가짜로 바꾼다.
 */
@Testcontainers
@SpringBootTest
class ChatControllerIntegrationTest {

  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  @Autowired
  private WebApplicationContext webApplicationContext;

  @MockitoBean
  private EmailSender emailSender;

  @MockitoBean
  private GeminiClient geminiClient;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
        .addFilters(webApplicationContext.getBean("springSecurityFilterChain", Filter.class))
        .build();
  }

  /** 새 계정을 만들고 이메일 인증까지 끝낸 뒤 로그인해서, 로그인한 상태의 세션을 돌려준다. */
  private MockHttpSession signUpVerifyAndLogin() throws Exception {
    String email = "user-" + UUID.randomUUID() + "@test.com";
    String nickname = "nick-" + UUID.randomUUID().toString().substring(0, 8);
    mockMvc
        .perform(
            post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"password123","nickname":"%s"}
                """.formatted(
                    email, nickname)))
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
                {"email":"%s","password":"password123"}
                """.formatted(
                    email)))
        .andExpect(status().isOk())
        .andReturn()
        .getRequest()
        .getSession();
  }

  private void say(MockHttpSession session, String message) throws Exception {
    mockMvc
        .perform(post("/api/residents/r01/chat")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"message":"%s"}
                """.formatted(message)))
        .andExpect(status().isOk());
  }

  @Test
  void 기록_조회는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc.perform(get("/api/residents/r01/chat")).andExpect(status().isUnauthorized());
  }

  @Test
  void 기록_조회는_없는_주민이면_404를_반환한다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin();

    mockMvc
        .perform(get("/api/residents/r99/chat").session(session))
        .andExpect(status().isNotFound());
  }

  @Test
  void 대화한_내용이_오래된_순으로_저장되고_조회된다() throws Exception {
    when(geminiClient.generate(any(), any()))
        .thenReturn(new ChatResponse("やあ", "안녕"), new ChatResponse("またね", "또 봐"));
    MockHttpSession session = signUpVerifyAndLogin();

    say(session, "こんにちは");
    say(session, "さようなら");

    mockMvc
        .perform(get("/api/residents/r01/chat").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(4))
        .andExpect(jsonPath("$[0].speaker").value("PLAYER"))
        .andExpect(jsonPath("$[0].text").value("こんにちは"))
        .andExpect(jsonPath("$[0].translation").doesNotExist())
        .andExpect(jsonPath("$[1].speaker").value("RESIDENT"))
        .andExpect(jsonPath("$[1].text").value("やあ"))
        .andExpect(jsonPath("$[1].translation").value("안녕"))
        .andExpect(jsonPath("$[2].text").value("さようなら"))
        .andExpect(jsonPath("$[3].text").value("またね"));
  }

  @Test
  void 다른_사용자의_대화는_조회되지_않는다() throws Exception {
    when(geminiClient.generate(any(), any())).thenReturn(new ChatResponse("やあ", "안녕"));
    MockHttpSession alice = signUpVerifyAndLogin();
    MockHttpSession bob = signUpVerifyAndLogin();

    say(alice, "こんにちは");

    mockMvc
        .perform(get("/api/residents/r01/chat").session(bob))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }
}
