package com.kotonohamachi.auth.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
 * 회원가입 → 이메일 인증 → 로그인으로 이어지는 흐름을 실제 Postgres(Testcontainers)와 Spring Security 필터 체인까지 띄워 검증한다. 실제 이메일 발송 대신 {@link EmailSender}를 {@link MockitoBean}으로 대체해 발송된 인증 코드를 가로챈다.
 *
 * <p>이 프로젝트의 {@code spring-boot-starter-test}에는(Spring Boot 4부터 테스트 모듈이 기술별로 세분화되어) MockMvc용 {@code @AutoConfigureMockMvc}("spring-boot-webmvc-test")가 포함돼 있지 않다. 그래서 {@link WebApplicationContext}와 Spring Security 필터 빈("springSecurityFilterChain")을 직접 사용해 MockMvc를 구성한다. 요청 본문도 Jackson 3 전환으로 ObjectMapper 빈 종류가 불확실해 직접 JSON 문자열을 구성한다.
 */
@Testcontainers
@SpringBootTest
class AuthControllerIntegrationTest {

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

  private static String requestPasswordResetJson(String email) {
    return """
        {"email":"%s"}
        """.formatted(email);
  }

  private static String confirmPasswordResetJson(String email, String code, String newPassword) {
    return """
        {"email":"%s","code":"%s","newPassword":"%s"}
        """.formatted(email, code, newPassword);
  }

  private static String withdrawJson(String currentPassword) {
    return """
        {"currentPassword":"%s"}
        """.formatted(currentPassword);
  }

  /** 가입 → 이메일 인증 → 로그인까지 끝낸 뒤, 로그인 세션을 반환한다. */
  private MockHttpSession signUpVerifyAndLogin(String email, String nickname, String password)
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
  void 회원가입_이메일인증_로그인까지_정상_흐름이_동작한다() throws Exception {
    String email = uniqueEmail();
    String nickname = uniqueNickname();
    String password = "password123";

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(email, password, nickname)))
        .andExpect(status().isCreated());

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendVerificationCode(eq(email), codeCaptor.capture());
    String code = codeCaptor.getValue();

    mockMvc
        .perform(get("/api/auth/nickname-check").param("nickname", nickname))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.available").value(false));

    // 이메일 인증을 완료하기 전에는 로그인할 수 없다.
    mockMvc
        .perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginJson(email, password)))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content(verifyEmailJson(email, code)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginJson(email, password)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(email))
        .andExpect(jsonPath("$.nickname").value(nickname));
  }

  @Test
  void 인증완료된_이메일로_다시_가입하면_409를_반환한다() throws Exception {
    String email = uniqueEmail();

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(email, "password123", uniqueNickname())))
        .andExpect(status().isCreated());

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendVerificationCode(eq(email), codeCaptor.capture());
    mockMvc
        .perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content(verifyEmailJson(email, codeCaptor.getValue())))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(email, "password123", uniqueNickname())))
        .andExpect(status().isConflict());
  }

  @Test
  void 인증을_끝내지_않은_이메일로_다시_가입하면_새_인증코드로_덮어쓴다() throws Exception {
    String email = uniqueEmail();
    String firstNickname = uniqueNickname();
    String secondNickname = uniqueNickname();

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(email, "password123", firstNickname)))
        .andExpect(status().isCreated());

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(email, "newPassword456", secondNickname)))
        .andExpect(status().isCreated());

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender, times(2)).sendVerificationCode(eq(email), codeCaptor.capture());
    String latestCode = codeCaptor.getValue();

    // 이전 닉네임은 더 이상 쓰이지 않으니 재사용 가능해야 한다.
    mockMvc
        .perform(get("/api/auth/nickname-check").param("nickname", firstNickname))
        .andExpect(jsonPath("$.available").value(true));

    mockMvc
        .perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content(verifyEmailJson(email, latestCode)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginJson(email, "newPassword456")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nickname").value(secondNickname));
  }

  @Test
  void 인증코드를_재전송하면_새_코드로_인증할_수_있다() throws Exception {
    String email = uniqueEmail();

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(email, "password123", uniqueNickname())))
        .andExpect(status().isCreated());

    mockMvc
        .perform(post("/api/auth/verify-email/resend")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"%s\"}".formatted(email)))
        .andExpect(status().isNoContent());

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender, times(2)).sendVerificationCode(eq(email), codeCaptor.capture());
    String latestCode = codeCaptor.getValue();

    mockMvc
        .perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content(verifyEmailJson(email, latestCode)))
        .andExpect(status().isNoContent());
  }

  @Test
  void 이미_사용중인_닉네임으로_가입하면_409를_반환한다() throws Exception {
    String nickname = uniqueNickname();

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(uniqueEmail(), "password123", nickname)))
        .andExpect(status().isCreated());

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(uniqueEmail(), "password123", nickname)))
        .andExpect(status().isConflict());
  }

  @Test
  void 잘못된_인증코드로는_가입을_완료할_수_없다() throws Exception {
    String email = uniqueEmail();

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(email, "password123", uniqueNickname())))
        .andExpect(status().isCreated());

    mockMvc
        .perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content(verifyEmailJson(email, "000000")))
        .andExpect(status().isBadRequest());
  }

  @Test
  void 인증을_마친_계정이어도_비밀번호가_틀리면_401을_반환한다() throws Exception {
    String email = uniqueEmail();
    String nickname = uniqueNickname();

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(email, "password123", nickname)))
        .andExpect(status().isCreated());

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendVerificationCode(eq(email), codeCaptor.capture());

    mockMvc
        .perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content(verifyEmailJson(email, codeCaptor.getValue())))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginJson(email, "wrong-password")))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void 신규_닉네임은_사용_가능으로_응답한다() throws Exception {
    mockMvc
        .perform(get("/api/auth/nickname-check").param("nickname", uniqueNickname()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.available").value(true));
  }

  @Test
  void me는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
  }

  @Test
  void me는_로그인한_사용자_정보를_반환한다() throws Exception {
    String email = uniqueEmail();
    String nickname = uniqueNickname();
    MockHttpSession session = signUpVerifyAndLogin(email, nickname, "password123");

    mockMvc
        .perform(get("/api/auth/me").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(email))
        .andExpect(jsonPath("$.nickname").value(nickname));
  }

  @Test
  void 로그인하지_않고_회원탈퇴를_요청하면_401을_반환한다() throws Exception {
    mockMvc
        .perform(delete("/api/auth/me")
            .contentType(MediaType.APPLICATION_JSON)
            .content(withdrawJson("password123")))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void 현재_비밀번호가_틀리면_회원탈퇴가_거부되고_계속_로그인_상태를_유지한다() throws Exception {
    String email = uniqueEmail();
    String nickname = uniqueNickname();
    String password = "password123";
    MockHttpSession session = signUpVerifyAndLogin(email, nickname, password);

    mockMvc
        .perform(delete("/api/auth/me")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(withdrawJson("wrong-password")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("현재 비밀번호가 올바르지 않습니다."));

    // 탈퇴되지 않았으므로 세션은 여전히 유효하고, 같은 비밀번호로 다시 로그인할 수도 있다.
    mockMvc
        .perform(get("/api/auth/me").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(email));

    mockMvc
        .perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginJson(email, password)))
        .andExpect(status().isOk());
  }

  @Test
  void 현재_비밀번호가_맞으면_회원탈퇴가_되고_세션이_무효화되어_me_요청이_거부된다() throws Exception {
    String email = uniqueEmail();
    String nickname = uniqueNickname();
    String password = "password123";
    MockHttpSession session = signUpVerifyAndLogin(email, nickname, password);

    mockMvc
        .perform(delete("/api/auth/me")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(withdrawJson(password)))
        .andExpect(status().isNoContent());

    // 탈퇴 즉시 세션이 무효화되어 같은 세션으로는 더 이상 인증된 요청을 할 수 없다.
    mockMvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
  }

  @Test
  void 탈퇴한_계정은_이후_비밀번호_로그인이_거부된다() throws Exception {
    String email = uniqueEmail();
    String nickname = uniqueNickname();
    String password = "password123";
    MockHttpSession session = signUpVerifyAndLogin(email, nickname, password);

    mockMvc
        .perform(delete("/api/auth/me")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(withdrawJson(password)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginJson(email, password)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void 인증코드를_5번_틀리면_코드가_맞아도_429를_반환한다() throws Exception {
    String email = uniqueEmail();

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(email, "password123", uniqueNickname())))
        .andExpect(status().isCreated());

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendVerificationCode(eq(email), codeCaptor.capture());
    String correctCode = codeCaptor.getValue();

    for (int i = 0; i < 5; i++) {
      mockMvc
          .perform(post("/api/auth/verify-email")
              .contentType(MediaType.APPLICATION_JSON)
              .content(verifyEmailJson(email, "000000")))
          .andExpect(status().isBadRequest());
    }

    mockMvc
        .perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content(verifyEmailJson(email, correctCode)))
        .andExpect(status().isTooManyRequests());
  }

  @Test
  void 비밀번호를_5번_틀리면_계정이_잠겨_올바른_비밀번호로도_로그인할_수_없다() throws Exception {
    String email = uniqueEmail();

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(email, "password123", uniqueNickname())))
        .andExpect(status().isCreated());

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendVerificationCode(eq(email), codeCaptor.capture());
    mockMvc
        .perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content(verifyEmailJson(email, codeCaptor.getValue())))
        .andExpect(status().isNoContent());

    for (int i = 0; i < 5; i++) {
      mockMvc
          .perform(post("/api/auth/login")
              .contentType(MediaType.APPLICATION_JSON)
              .content(loginJson(email, "wrong-password")))
          .andExpect(status().isUnauthorized());
    }

    mockMvc
        .perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginJson(email, "password123")))
        .andExpect(status().isTooManyRequests());
  }

  @Test
  void 비밀번호_재설정_요청부터_새_비밀번호로_로그인까지_정상_흐름이_동작한다() throws Exception {
    String email = uniqueEmail();

    mockMvc
        .perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupJson(email, "password123", uniqueNickname())))
        .andExpect(status().isCreated());

    ArgumentCaptor<String> verificationCodeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendVerificationCode(eq(email), verificationCodeCaptor.capture());
    mockMvc
        .perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content(verifyEmailJson(email, verificationCodeCaptor.getValue())))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(post("/api/auth/password-reset/request")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestPasswordResetJson(email)))
        .andExpect(status().isNoContent());

    ArgumentCaptor<String> resetCodeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendPasswordResetCode(eq(email), resetCodeCaptor.capture());

    mockMvc
        .perform(post("/api/auth/password-reset/confirm")
            .contentType(MediaType.APPLICATION_JSON)
            .content(confirmPasswordResetJson(email, resetCodeCaptor.getValue(), "newPassword456")))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginJson(email, "password123")))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginJson(email, "newPassword456")))
        .andExpect(status().isOk());
  }

  @Test
  void 가입되지_않은_이메일로_재설정_요청해도_204를_반환한다() throws Exception {
    mockMvc
        .perform(post("/api/auth/password-reset/request")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestPasswordResetJson(uniqueEmail())))
        .andExpect(status().isNoContent());
  }

  @Test
  void 가입되지_않은_이메일로_재설정_확인하면_코드_불일치와_같은_오류를_반환한다() throws Exception {
    mockMvc
        .perform(post("/api/auth/password-reset/confirm")
            .contentType(MediaType.APPLICATION_JSON)
            .content(confirmPasswordResetJson(uniqueEmail(), "123456", "newPassword456")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("재설정 코드가 올바르지 않습니다."));
  }
}
