package com.kotonohamachi.chat.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kotonohamachi.TestSessions;
import com.kotonohamachi.chat.ChatErrorCode;
import com.kotonohamachi.chat.dto.ChatResponse;
import com.kotonohamachi.chat.service.GeminiClient;
import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.theme.service.ThemeService;
import com.kotonohamachi.user.repository.UserRepository;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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

  @Autowired
  private UserRepository userRepository;

  @MockitoBean
  private GeminiClient geminiClient;

  @MockitoBean
  private ThemeService themeService;

  @Autowired
  private org.springframework.jdbc.core.JdbcTemplate jdbc;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    // 기본은 오늘 학습을 끝낸 상태(대화 가능).
    when(themeService.canChatToday(any())).thenReturn(true);
    mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
        .addFilters(webApplicationContext.getBean("springSecurityFilterChain", Filter.class))
        .build();
  }

  private MockHttpSession signUpVerifyAndLogin() {
    return TestSessions.loggedInSession(userRepository);
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
  void 오늘_학습을_끝내지_않으면_대화는_403을_반환한다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin();
    when(themeService.canChatToday(any())).thenReturn(false);

    mockMvc
        .perform(post("/api/residents/r01/chat")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"message\":\"こんにちは\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.message").value("오늘의 학습을 먼저 끝내야 주민과 이야기할 수 있어요."));
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
    when(geminiClient.generate(any(), any(), any(), any()))
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
    when(geminiClient.generate(any(), any(), any(), any()))
        .thenReturn(new ChatResponse("やあ", "안녕"));
    MockHttpSession alice = signUpVerifyAndLogin();
    MockHttpSession bob = signUpVerifyAndLogin();

    say(alice, "こんにちは");

    mockMvc
        .perform(get("/api/residents/r01/chat").session(bob))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void 날짜_목록_조회는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc.perform(get("/api/residents/r01/chat/days")).andExpect(status().isUnauthorized());
  }

  @Test
  void 날짜별_기록_조회는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc
        .perform(get("/api/residents/r01/chat/days/2026-03-10"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void 날짜_목록은_오늘_대화를_제외하고_없는_주민은_404다() throws Exception {
    when(geminiClient.generate(any(), any(), any(), any()))
        .thenReturn(new ChatResponse("やあ", "안녕"));
    MockHttpSession session = signUpVerifyAndLogin();
    say(session, "こんにちは");

    mockMvc
        .perform(get("/api/residents/r01/chat/days").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
    mockMvc
        .perform(get("/api/residents/r99/chat/days").session(session))
        .andExpect(status().isNotFound());
  }

  @Test
  void 지난_날_대화는_날짜_목록과_날짜별_조회로_확인된다() throws Exception {
    when(geminiClient.generate(any(), any(), any(), any()))
        .thenReturn(new ChatResponse("やあ", "안녕"));
    MockHttpSession session = signUpVerifyAndLogin();
    say(session, "こんにちは");
    // 방금 저장한 두 줄을 이틀 전 낮으로 옮긴다.
    jdbc.update("UPDATE chat_message SET created_at = now() - interval '2 days'");
    say(session, "今日");

    java.time.LocalDate twoDaysAgo =
        java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul")).minusDays(2);
    mockMvc
        .perform(get("/api/residents/r01/chat/days").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].date").value(twoDaysAgo.toString()))
        .andExpect(jsonPath("$[0].lineCount").value(2))
        .andExpect(jsonPath("$[0].preview").value("こんにちは"));
    mockMvc
        .perform(get("/api/residents/r01/chat/days/" + twoDaysAgo).session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].text").value("こんにちは"))
        .andExpect(jsonPath("$[1].text").value("やあ"));
    // 오늘 기록에는 오늘 말만 있다.
    mockMvc
        .perform(get("/api/residents/r01/chat").session(session))
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].text").value("今日"));
  }

  @Test
  void 날짜별_기록_조회는_잘못된_날짜_형식이면_400을_반환한다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin();

    mockMvc
        .perform(get("/api/residents/r01/chat/days/not-a-date").session(session))
        .andExpect(status().isBadRequest());
    mockMvc
        .perform(get("/api/residents/r01/chat/days/2026-13-45").session(session))
        .andExpect(status().isBadRequest());
  }

  @Test
  void 날짜별_기록_조회는_대화가_없는_날이면_빈_목록이고_없는_주민은_404다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin();

    mockMvc
        .perform(get("/api/residents/r01/chat/days/2020-01-01").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
    mockMvc
        .perform(get("/api/residents/r99/chat/days/2020-01-01").session(session))
        .andExpect(status().isNotFound());
  }

  @Test
  void 대화하면_친밀도가_오르고_하루_한도에서_멈춘다() throws Exception {
    when(geminiClient.generate(any(), any(), any(), any()))
        .thenReturn(new ChatResponse("やあ", "안녕"));
    MockHttpSession session = signUpVerifyAndLogin();

    // 첫 대화 +5, 이후 +1씩 5번(+5)으로 하루 한도 10에 닿고, 그 뒤로는 오르지 않는다.
    expectChat(session, 5, 5);
    for (int level = 6; level <= 10; level++) {
      expectChat(session, level, 1);
    }
    expectChat(session, 10, 0);

    mockMvc
        .perform(get("/api/residents/friendships").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.residentSlug == 'r01')].level").value(10))
        .andExpect(jsonPath("$[?(@.residentSlug == 'r02')].level").value(0));
  }

  @Test
  void Gemini_한도로_429가_나면_졸려요_메시지로_응답한다() throws Exception {
    when(geminiClient.generate(any(), any(), any(), any()))
        .thenThrow(new ApiException(ChatErrorCode.DAILY_LIMIT_EXCEEDED));
    MockHttpSession session = signUpVerifyAndLogin();

    mockMvc
        .perform(post("/api/residents/r01/chat")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"message\":\"こんにちは\"}"))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.message").value("오늘은 이야기를 많이 해서 졸려요. 내일 또 이야기해요."));
  }

  @Test
  void 친밀도_조회는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc.perform(get("/api/residents/friendships")).andExpect(status().isUnauthorized());
  }

  private void expectChat(MockHttpSession session, int level, int gain) throws Exception {
    mockMvc
        .perform(post("/api/residents/r01/chat")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"message\":\"こんにちは\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.friendshipLevel").value(level))
        .andExpect(jsonPath("$.friendshipGain").value(gain));
  }
}
