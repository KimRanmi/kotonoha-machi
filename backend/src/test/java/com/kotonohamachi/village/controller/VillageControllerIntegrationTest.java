package com.kotonohamachi.village.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
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

/** {@code GET /api/village/buildings}의 인증과 응답 형태를 실제 Postgres와 Security 필터 체인으로 검증한다. */
@Testcontainers
@SpringBootTest
class VillageControllerIntegrationTest {

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
    String nickname = "nick-" + UUID.randomUUID().toString().substring(0, 8);
    mockMvc
        .perform(
            post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"password123","nickname":"%s"}
                """.formatted(
                    email, nickname)))
        .andExpect(status().isCreated());
    ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendVerificationCode(eq(email), code.capture());
    mockMvc
        .perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email":"%s","code":"%s"}
                """.formatted(email, code.getValue())))
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

  @Test
  void 마을_건물_조회는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc.perform(get("/api/village/buildings")).andExpect(status().isUnauthorized());
  }

  @Test
  void 로그인한_신규_사용자는_집만_열린_건물_3개를_순서대로_받는다() throws Exception {
    MockHttpSession session = newLoggedInSession();

    mockMvc
        .perform(get("/api/village/buildings").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(3))
        .andExpect(jsonPath("$[0].id").value("home"))
        .andExpect(jsonPath("$[0].unlocked").value(true))
        .andExpect(jsonPath("$[1].id").value("cafe"))
        .andExpect(jsonPath("$[1].unlocked").value(false))
        .andExpect(jsonPath("$[2].id").value("shop"))
        .andExpect(jsonPath("$[2].unlocked").value(false));
  }
}
