package com.kotonohamachi.auth.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kotonohamachi.TestSessions;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.UserStatus;
import com.kotonohamachi.user.repository.UserRepository;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * 현재 로그인된 사용자 조회({@code GET /api/auth/me}), 회원 탈퇴({@code DELETE /api/auth/me}), 로그아웃을 실제
 * Postgres(Testcontainers)와 Spring Security 필터 체인까지 띄워 검증한다. 로그인은 소셜 로그인만 지원하므로 로그인한 세션은
 * {@code TestSessions}로 만든다.
 */
@Testcontainers
@SpringBootTest
class AuthControllerIntegrationTest {

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

  @Test
  void me는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
  }

  @Test
  void me는_로그인한_사용자_정보를_반환한다() throws Exception {
    User user = TestSessions.newUser(userRepository);

    mockMvc
        .perform(get("/api/auth/me").session(TestSessions.sessionFor(user)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(user.getEmail()))
        .andExpect(jsonPath("$.nickname").value(user.getNickname()));
  }

  @Test
  void 로그인하지_않고_회원탈퇴를_요청하면_401을_반환한다() throws Exception {
    mockMvc.perform(delete("/api/auth/me")).andExpect(status().isUnauthorized());
  }

  @Test
  void 회원탈퇴를_하면_계정이_탈퇴_상태가_되고_세션이_무효화되어_me_요청이_거부된다() throws Exception {
    User user = TestSessions.newUser(userRepository);
    MockHttpSession session = TestSessions.sessionFor(user);

    mockMvc.perform(delete("/api/auth/me").session(session)).andExpect(status().isNoContent());

    assertThat(userRepository.findById(user.getId()).orElseThrow().getStatus())
        .isEqualTo(UserStatus.WITHDRAWN);
    mockMvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
  }

  @Test
  void 로그아웃하면_세션이_무효화되어_me_요청이_거부된다() throws Exception {
    MockHttpSession session = TestSessions.loggedInSession(userRepository);

    mockMvc
        .perform(post("/api/auth/logout").session(session))
        .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
  }
}
