package com.kotonoha.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kotonoha.AuthTestSupport;
import com.kotonoha.TestcontainersConfig;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class RefreshTokenTest {

    static final String COOKIE = AuthController.REFRESH_COOKIE;

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcClient jdbc;

    MockHttpServletResponse signup(String email) throws Exception {
        return mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + AuthTestSupport.PASSWORD + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse();
    }

    MockHttpServletResponse refresh(String refreshToken) throws Exception {
        var request = post("/api/auth/refresh");
        if (refreshToken != null) request.cookie(new Cookie(COOKIE, refreshToken));
        return mvc.perform(request).andReturn().getResponse();
    }

    static String refreshOf(MockHttpServletResponse response) {
        Cookie cookie = response.getCookie(COOKIE);
        return cookie == null ? null : cookie.getValue();
    }

    @Test
    void 가입하면_refresh_쿠키가_httpOnly로_내려가고_DB에는_해시만_저장된다() throws Exception {
        MockHttpServletResponse response = signup(AuthTestSupport.uniqueEmail());

        String setCookie = response.getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).contains("HttpOnly").contains("SameSite=Strict").contains("Path=/api/auth");
        // 본문에는 access 토큰만 있고 refresh 토큰은 없다.
        assertThat(response.getContentAsString()).contains("accessToken").doesNotContain(refreshOf(response));

        String token = refreshOf(response);
        Integer plain = jdbc.sql("SELECT count(*) FROM refresh_tokens WHERE token_hash = :t").param("t", token)
                .query(Integer.class).single();
        assertThat(plain).isZero();
    }

    @Test
    void refresh하면_새_access와_새_refresh가_나오고_이전_refresh는_더_못_쓴다() throws Exception {
        String old = refreshOf(signup(AuthTestSupport.uniqueEmail()));

        MockHttpServletResponse rotated = refresh(old);
        assertThat(rotated.getStatus()).isEqualTo(200);
        assertThat(rotated.getContentAsString()).contains("accessToken");
        assertThat(refreshOf(rotated)).isNotBlank().isNotEqualTo(old);

        // 새 access 토큰으로 보호된 API를 쓸 수 있다.
        String access = new tools.jackson.databind.ObjectMapper().readTree(rotated.getContentAsString())
                .get("accessToken").asString();
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + access)).andExpect(status().isOk());
    }

    @Test
    void 이미_쓴_refresh를_다시_쓰면_거부되고_같은_로그인의_새_토큰도_폐기된다() throws Exception {
        String first = refreshOf(signup(AuthTestSupport.uniqueEmail()));
        String second = refreshOf(refresh(first)); // first는 이제 폐기됨

        // 탈취자가 폐기된 first를 재사용
        assertThat(refresh(first).getStatus()).isEqualTo(401);
        // 같은 family의 second(정당한 사용자가 가진 최신 토큰)도 함께 폐기되어, 두 쪽 모두 재로그인해야 한다.
        assertThat(refresh(second).getStatus()).isEqualTo(401);
    }

    @Test
    void 로그아웃하면_refresh가_폐기되고_쿠키가_지워진다() throws Exception {
        String token = refreshOf(signup(AuthTestSupport.uniqueEmail()));

        MockHttpServletResponse out = mvc.perform(post("/api/auth/logout").cookie(new Cookie(COOKIE, token)))
                .andExpect(status().isNoContent()).andReturn().getResponse();
        assertThat(out.getHeader(HttpHeaders.SET_COOKIE)).contains("Max-Age=0");

        assertThat(refresh(token).getStatus()).isEqualTo(401);
    }

    @Test
    void 쿠키가_없거나_모르는_토큰이면_401() throws Exception {
        assertThat(refresh(null).getStatus()).isEqualTo(401);
        assertThat(refresh("not-a-real-token").getStatus()).isEqualTo(401);
    }

    @Test
    void 만료된_refresh는_거부한다() throws Exception {
        String token = refreshOf(signup(AuthTestSupport.uniqueEmail()));
        jdbc.sql("UPDATE refresh_tokens SET expires_at = now() - interval '1 minute'").update();

        assertThat(refresh(token).getStatus()).isEqualTo(401);
    }

    @Test
    void 로그인할_때마다_독립된_refresh가_발급된다() throws Exception {
        String email = AuthTestSupport.uniqueEmail();
        String a = refreshOf(signup(email));
        MockHttpServletResponse login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + AuthTestSupport.PASSWORD + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn().getResponse();
        String b = refreshOf(login);

        assertThat(b).isNotEqualTo(a);
        // 한 기기에서 로그아웃(폐기)해도 다른 로그인은 영향받지 않는다.
        mvc.perform(post("/api/auth/logout").cookie(new Cookie(COOKIE, a))).andExpect(status().isNoContent());
        assertThat(refresh(b).getStatus()).isEqualTo(200);
    }
}
