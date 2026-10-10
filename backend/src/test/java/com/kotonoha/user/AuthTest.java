package com.kotonoha.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kotonoha.AuthTestSupport;
import com.kotonoha.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AuthTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcClient jdbc;

    ResultActions send(String path, String email, String password) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"));
    }

    @Test
    void 가입하면_토큰이_나오고_비밀번호는_해시로만_저장된다() throws Exception {
        String email = AuthTestSupport.uniqueEmail();

        send("/api/auth/signup", email, AuthTestSupport.PASSWORD)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value(email));

        String stored = jdbc.sql("SELECT password_hash FROM users WHERE email = :e").param("e", email)
                .query(String.class).single();
        assertThat(stored).startsWith("$2").doesNotContain(AuthTestSupport.PASSWORD);
    }

    @Test
    void 이메일은_대소문자_구분없이_하나의_계정이고_중복_가입은_409() throws Exception {
        String email = AuthTestSupport.uniqueEmail();
        send("/api/auth/signup", email, AuthTestSupport.PASSWORD).andExpect(status().isCreated());

        send("/api/auth/signup", email.toUpperCase(), AuthTestSupport.PASSWORD)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("이미 가입된 이메일입니다."));
    }

    @Test
    void 입력값이_잘못되면_400() throws Exception {
        send("/api/auth/signup", "not-an-email", AuthTestSupport.PASSWORD).andExpect(status().isBadRequest());
        send("/api/auth/signup", AuthTestSupport.uniqueEmail(), "short").andExpect(status().isBadRequest());
    }

    @Test
    void 로그인은_맞는_비밀번호일_때만_토큰을_준다() throws Exception {
        String email = AuthTestSupport.uniqueEmail();
        send("/api/auth/signup", email, AuthTestSupport.PASSWORD).andExpect(status().isCreated());

        send("/api/auth/login", email, AuthTestSupport.PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
        // 틀린 비밀번호와 없는 계정은 같은 메시지 (계정 존재 여부를 알려주지 않는다).
        send("/api/auth/login", email, "wrong-password")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("이메일 또는 비밀번호가 올바르지 않습니다."));
        send("/api/auth/login", AuthTestSupport.uniqueEmail(), AuthTestSupport.PASSWORD)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("이메일 또는 비밀번호가 올바르지 않습니다."));
    }

    @Test
    void me는_토큰의_주인을_알려주고_토큰이_없으면_401() throws Exception {
        String email = AuthTestSupport.uniqueEmail();
        String bearer = AuthTestSupport.signupAndGetBearer(mvc, email);

        mvc.perform(get("/api/auth/me").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }
}
