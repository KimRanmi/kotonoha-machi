package com.kotonohamachi.village.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 마을 건물 목록 조회와 마지막 위치 조회·저장 API의 인증과 응답 형태를 실제 Postgres와 Security 필터 체인으로 검증한다. */
@Testcontainers
@SpringBootTest
class VillageControllerIntegrationTest {

  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  @Autowired
  private WebApplicationContext webApplicationContext;

  @Autowired
  private JdbcTemplate jdbcTemplate;

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
  void 로그인한_사용자는_건물_목록과_같은_장소의_주민을_받는다() throws Exception {
    // 건물·주민 데이터는 시트에서 만든 마이그레이션이 채우므로, 이 테스트는 자기만의 장소를 직접 넣어 확인한다.
    String originalLocation = jdbcTemplate.queryForObject(
        "SELECT location FROM resident WHERE slug = 'r01'", String.class);
    jdbcTemplate.update(
        "INSERT INTO building (slug, label, x, z, width, depth, height, color, location) "
            + "VALUES ('it_with', 'テスト', 1.5, -2, 4, 3.5, 2.5, '#112233', '통합테스트장소'), "
            + "('it_without', 'ナシ', 3, -2, 4, 3.5, 2.5, '#445566', '통합테스트빈장소')");
    jdbcTemplate.update("UPDATE resident SET location = '통합테스트장소' WHERE slug = 'r01'");
    try {
      MockHttpSession session = newLoggedInSession();

      mockMvc
          .perform(get("/api/village/buildings").session(session))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$[?(@.id == 'it_with')].label").value("テスト"))
          .andExpect(jsonPath("$[?(@.id == 'it_with')].x").value(1.5))
          .andExpect(jsonPath("$[?(@.id == 'it_with')].color").value("#112233"))
          .andExpect(jsonPath("$[?(@.id == 'it_with')].residentSlug").value("r01"))
          .andExpect(jsonPath("$[?(@.id == 'it_without')].residentSlug[0]").doesNotExist());
    } finally {
      jdbcTemplate.update("DELETE FROM building WHERE slug IN ('it_with', 'it_without')");
      jdbcTemplate.update("UPDATE resident SET location = ? WHERE slug = 'r01'", originalLocation);
    }
  }

  @Test
  void 마을_위치는_로그인하지_않으면_401을_반환한다() throws Exception {
    mockMvc.perform(get("/api/village/position")).andExpect(status().isUnauthorized());
    mockMvc
        .perform(put("/api/village/position")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"x\":1,\"z\":2}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void 위치를_저장한_적이_없으면_좌표가_null이다() throws Exception {
    MockHttpSession session = newLoggedInSession();

    mockMvc
        .perform(get("/api/village/position").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.x").isEmpty())
        .andExpect(jsonPath("$.z").isEmpty());
  }

  @Test
  void 저장한_위치를_다시_조회하면_같은_값을_받는다() throws Exception {
    MockHttpSession session = newLoggedInSession();

    mockMvc
        .perform(put("/api/village/position")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"x\":3.5,\"z\":-7.25}"))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/village/position").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.x").value(3.5))
        .andExpect(jsonPath("$.z").value(-7.25));
  }

  @Test
  void 마을_범위를_벗어나거나_빠진_좌표는_400을_반환한다() throws Exception {
    MockHttpSession session = newLoggedInSession();

    mockMvc
        .perform(put("/api/village/position")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"x\":99,\"z\":0}"))
        .andExpect(status().isBadRequest());
    mockMvc
        .perform(put("/api/village/position")
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"x\":1}"))
        .andExpect(status().isBadRequest());
  }
}
