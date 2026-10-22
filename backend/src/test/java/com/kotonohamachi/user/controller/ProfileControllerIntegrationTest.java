package com.kotonohamachi.user.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * 로그인한 사용자 자신의 프로필 조회({@code GET /api/users/me})와 닉네임 변경({@code PATCH
 * /api/users/me/nickname})을 실제 Postgres(Testcontainers)와 Spring Security 필터 체인까지 띄워 검증한다.
 * 회원가입 → 이메일 인증 → 로그인으로 세션을 만드는 방식은 {@code AuthControllerIntegrationTest}와 같다.
 */
@Testcontainers
@SpringBootTest
class ProfileControllerIntegrationTest {

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

  private static String nicknameJson(String nickname) {
    return """
        {"nickname":"%s"}
        """.formatted(nickname);
  }

  private static String changePasswordJson(String currentPassword, String newPassword) {
    return """
        {"currentPassword":"%s","newPassword":"%s"}
        """.formatted(currentPassword, newPassword);
  }

  private static String changePasswordJsonWithNullCurrentPassword(String newPassword) {
    return """
        {"currentPassword":null,"newPassword":"%s"}
        """.formatted(newPassword);
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

  @Test
  void me는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());
  }

  @Test
  void me는_로그인한_사용자_자신의_프로필을_반환한다() throws Exception {
    String email = uniqueEmail();
    String nickname = uniqueNickname();
    MockHttpSession session = signUpVerifyAndLogin(email, "password123", nickname);

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
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), "password123", uniqueNickname());
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
    signUpVerifyAndLogin(uniqueEmail(), "password123", takenNickname);
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), "password123", uniqueNickname());

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
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), "password123", nickname);

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
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), "password123", uniqueNickname());

    mockMvc
        .perform(patch("/api/users/me/nickname")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(nicknameJson("   ")))
        .andExpect(status().isBadRequest());
  }

  @Test
  void 닉네임이_20자를_넘으면_400을_반환한다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), "password123", uniqueNickname());
    String tooLongNickname = "a".repeat(21);

    mockMvc
        .perform(patch("/api/users/me/nickname")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(nicknameJson(tooLongNickname)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void me는_비밀번호가_있는_계정의_hasPassword를_true로_반환한다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), "password123", uniqueNickname());

    mockMvc
        .perform(get("/api/users/me").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.hasPassword").value(true));
  }

  @Test
  void 비밀번호_변경은_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc
        .perform(patch("/api/users/me/password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(changePasswordJson("password123", "newPassword123")))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void 올바른_현재_비밀번호로_변경하면_204를_반환하고_새_비밀번호로_로그인할_수_있다() throws Exception {
    String email = uniqueEmail();
    MockHttpSession session = signUpVerifyAndLogin(email, "password123", uniqueNickname());

    mockMvc
        .perform(patch("/api/users/me/password")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(changePasswordJson("password123", "newPassword456")))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginJson(email, "newPassword456")))
        .andExpect(status().isOk());
  }

  @Test
  void 현재_비밀번호가_틀리면_400을_반환한다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), "password123", uniqueNickname());

    mockMvc
        .perform(patch("/api/users/me/password")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(changePasswordJson("wrongPassword", "newPassword456")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("현재 비밀번호가 올바르지 않습니다."));
  }

  @Test
  void 현재_비밀번호가_빈_문자열이면_400을_반환한다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), "password123", uniqueNickname());

    mockMvc
        .perform(patch("/api/users/me/password")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(changePasswordJson("", "newPassword456")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("현재 비밀번호가 올바르지 않습니다."));
  }

  @Test
  void 현재_비밀번호가_null이면_400을_반환한다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), "password123", uniqueNickname());

    mockMvc
        .perform(patch("/api/users/me/password")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(changePasswordJsonWithNullCurrentPassword("newPassword456")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("현재 비밀번호가 올바르지 않습니다."));
  }

  @Test
  void 새_비밀번호가_8자_미만이면_400을_반환한다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), "password123", uniqueNickname());

    mockMvc
        .perform(patch("/api/users/me/password")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(changePasswordJson("password123", "short")))
        .andExpect(status().isBadRequest());
  }

  @Test
  void 새_비밀번호가_공백이면_400을_반환한다() throws Exception {
    MockHttpSession session = signUpVerifyAndLogin(uniqueEmail(), "password123", uniqueNickname());

    mockMvc
        .perform(patch("/api/users/me/password")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(changePasswordJson("password123", "        ")))
        .andExpect(status().isBadRequest());
  }
}
