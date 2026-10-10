package com.kotonoha.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kotonoha.AuthTestSupport;
import com.kotonoha.TestcontainersConfig;
import java.util.UUID;
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

    // 로그인용(이메일+비밀번호). 가입은 닉네임이 필요하므로 signup()을 쓴다.
    ResultActions send(String path, String email, String password) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"));
    }

    ResultActions signup(String email, String password, String nickname) throws Exception {
        return mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"nickname\":\""
                        + nickname + "\"}"));
    }

    @Test
    void 가입하면_토큰이_나오고_비밀번호는_해시로만_저장된다() throws Exception {
        String email = AuthTestSupport.uniqueEmail();

        signup(email, AuthTestSupport.PASSWORD, AuthTestSupport.uniqueNickname())
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
        signup(email, AuthTestSupport.PASSWORD, AuthTestSupport.uniqueNickname()).andExpect(status().isCreated());

        signup(email.toUpperCase(), AuthTestSupport.PASSWORD, AuthTestSupport.uniqueNickname())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("이미 가입된 이메일입니다."));
    }

    @Test
    void 입력값이_잘못되면_400() throws Exception {
        signup("not-an-email", AuthTestSupport.PASSWORD, AuthTestSupport.uniqueNickname()).andExpect(status().isBadRequest());
        signup(AuthTestSupport.uniqueEmail(), "short", AuthTestSupport.uniqueNickname()).andExpect(status().isBadRequest());
    }

    @Test
    void 로그인은_맞는_비밀번호일_때만_토큰을_준다() throws Exception {
        String email = AuthTestSupport.uniqueEmail();
        signup(email, AuthTestSupport.PASSWORD, AuthTestSupport.uniqueNickname()).andExpect(status().isCreated());

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

    @Test
    void 가입하면_닉네임이_응답과_me에_나온다() throws Exception {
        String email = AuthTestSupport.uniqueEmail();
        String nickname = AuthTestSupport.uniqueNickname();

        signup(email, AuthTestSupport.PASSWORD, nickname)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nickname").value(nickname));

        send("/api/auth/login", email, AuthTestSupport.PASSWORD).andExpect(jsonPath("$.nickname").value(nickname));
    }

    @Test
    void 닉네임_형식이_잘못되면_400() throws Exception {
        for (String bad : new String[] {"a", "너무너무너무너무너무너무길어요요", "has space", "bad!", "a-b"}) {
            signup(AuthTestSupport.uniqueEmail(), AuthTestSupport.PASSWORD, bad).andExpect(status().isBadRequest());
        }
        // 한글/일본어/영문/숫자/밑줄은 허용 (중복이 아닌 값으로 확인)
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 4);
        for (String good : new String[] {"미유친구" + suffix, "さくら" + suffix, "Taro_" + suffix}) {
            mvc.perform(get("/api/auth/nickname-available").param("nickname", good))
                    .andExpect(jsonPath("$.available").value(true));
        }
    }

    @Test
    void 닉네임은_대소문자_구분없이_중복_가입을_막는다() throws Exception {
        String nickname = AuthTestSupport.uniqueNickname();
        signup(AuthTestSupport.uniqueEmail(), AuthTestSupport.PASSWORD, nickname).andExpect(status().isCreated());

        signup(AuthTestSupport.uniqueEmail(), AuthTestSupport.PASSWORD, nickname.toUpperCase())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("이미 사용 중인 닉네임입니다."));
    }

    @Test
    void 닉네임_중복확인_API는_사용가능_여부를_알려준다() throws Exception {
        String taken = AuthTestSupport.uniqueNickname();
        signup(AuthTestSupport.uniqueEmail(), AuthTestSupport.PASSWORD, taken).andExpect(status().isCreated());

        mvc.perform(get("/api/auth/nickname-available").param("nickname", taken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.available").value(false));
        mvc.perform(get("/api/auth/nickname-available").param("nickname", taken.toUpperCase()))
                .andExpect(jsonPath("$.available").value(false));
        mvc.perform(get("/api/auth/nickname-available").param("nickname", AuthTestSupport.uniqueNickname()))
                .andExpect(jsonPath("$.available").value(true));
        mvc.perform(get("/api/auth/nickname-available").param("nickname", "bad name!"))
                .andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void 닉네임_변경은_본인만_하고_남이_쓰는_이름은_409() throws Exception {
        String other = AuthTestSupport.uniqueNickname();
        signup(AuthTestSupport.uniqueEmail(), AuthTestSupport.PASSWORD, other).andExpect(status().isCreated());
        String me = AuthTestSupport.signupAndGetBearer(mvc, AuthTestSupport.uniqueEmail());

        String fresh = AuthTestSupport.uniqueNickname();
        mvc.perform(put("/api/auth/nickname").header("Authorization", me).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"" + fresh + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nickname").value(fresh));
        mvc.perform(get("/api/auth/me").header("Authorization", me)).andExpect(jsonPath("$.nickname").value(fresh));

        mvc.perform(put("/api/auth/nickname").header("Authorization", me).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"" + other + "\"}"))
                .andExpect(status().isConflict());
        // 로그인하지 않으면 변경할 수 없다.
        mvc.perform(put("/api/auth/nickname").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"" + fresh + "x\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 닉네임_도입_전_계정은_nickname이_null이고_설정할_수_있다() throws Exception {
        String email = AuthTestSupport.uniqueEmail();
        String hash = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(AuthTestSupport.PASSWORD);
        jdbc.sql("INSERT INTO users (email, password_hash) VALUES (:e, :h)").param("e", email).param("h", hash).update();

        String body = send("/api/auth/login", email, AuthTestSupport.PASSWORD)
                .andExpect(status().isOk()).andExpect(jsonPath("$.nickname").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        String bearer = "Bearer " + new tools.jackson.databind.ObjectMapper().readTree(body).get("accessToken").asString();

        String nickname = AuthTestSupport.uniqueNickname();
        mvc.perform(put("/api/auth/nickname").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"" + nickname + "\"}"))
                .andExpect(status().isOk());
        send("/api/auth/login", email, AuthTestSupport.PASSWORD).andExpect(jsonPath("$.nickname").value(nickname));
    }
}
