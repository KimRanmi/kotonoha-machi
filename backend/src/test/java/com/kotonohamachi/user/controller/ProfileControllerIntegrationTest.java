package com.kotonohamachi.user.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kotonohamachi.TestSessions;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import jakarta.servlet.Filter;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * 로그인한 사용자 자신의 프로필 조회({@code GET /api/users/me})와 닉네임 변경({@code PATCH
 * /api/users/me/nickname})을 실제 Postgres(Testcontainers)와 Spring Security 필터 체인까지 띄워 검증한다.
 * 소셜 로그인으로 가입한 계정의 세션은 {@code TestSessions}로 만든다.
 */
@Testcontainers
@SpringBootTest
class ProfileControllerIntegrationTest {

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

  private static String uniqueEmail() {
    return "user-" + UUID.randomUUID() + "@test.com";
  }

  private static String uniqueNickname() {
    return "nick-" + UUID.randomUUID().toString().substring(0, 8);
  }

  private static String nicknameJson(String nickname) {
    return """
        {"nickname":"%s"}
        """.formatted(nickname);
  }

  /** 주어진 이메일·닉네임의 소셜 가입 계정을 저장하고, 그 계정으로 로그인한 세션을 돌려준다. */
  private MockHttpSession signUpVerifyAndLogin(String email, String nickname) {
    return TestSessions.sessionFor(
        userRepository.save(User.createFromSocialLogin(email, nickname)));
  }

  @Test
  void me는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());
  }

  @Test
  void me는_로그인한_사용자_자신의_프로필을_반환한다() throws Exception {
    String email = uniqueEmail();
    String nickname = uniqueNickname();
    MockHttpSession session = signUpVerifyAndLogin(email, nickname);

    mockMvc
        .perform(get("/api/users/me").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(email))
        .andExpect(jsonPath("$.nickname").value(nickname))
        .andExpect(jsonPath("$.id").isNumber());
  }

  @Test
  void 닉네임_변경은_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc
        .perform(patch("/api/users/me/nickname")
            .contentType(MediaType.APPLICATION_JSON)
            .content(nicknameJson(uniqueNickname())))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void 닉네임을_변경하면_변경된_값이_응답과_조회에_반영된다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), uniqueNickname());
    String newNickname = uniqueNickname();

    mockMvc
        .perform(patch("/api/users/me/nickname")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(nicknameJson(newNickname)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nickname").value(newNickname));

    mockMvc
        .perform(get("/api/users/me").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nickname").value(newNickname));
  }

  @Test
  void 다른_사용자가_이미_쓰는_닉네임으로_변경하면_409를_반환한다() throws Exception {
    String takenNickname = uniqueNickname();
    signUpVerifyAndLogin(uniqueEmail(), takenNickname);
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), uniqueNickname());

    mockMvc
        .perform(patch("/api/users/me/nickname")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(nicknameJson(takenNickname)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.message").value("이미 사용 중인 닉네임입니다."));
  }

  @Test
  void 본인의_현재_닉네임과_같은_값으로_요청하면_에러_없이_성공한다() throws Exception {
    String nickname = uniqueNickname();
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), nickname);

    mockMvc
        .perform(patch("/api/users/me/nickname")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(nicknameJson(nickname)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nickname").value(nickname));
  }

  @Test
  void 닉네임이_공백이면_400을_반환한다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), uniqueNickname());

    mockMvc
        .perform(patch("/api/users/me/nickname")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(nicknameJson("   ")))
        .andExpect(status().isBadRequest());
  }

  @Test
  void 닉네임이_20자를_넘으면_400을_반환한다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), uniqueNickname());
    String tooLongNickname = "a".repeat(21);

    mockMvc
        .perform(patch("/api/users/me/nickname")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(nicknameJson(tooLongNickname)))
        .andExpect(status().isBadRequest());
  }
}
