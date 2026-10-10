package com.kotonoha.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kotonoha.AuthTestSupport;
import com.kotonoha.TestcontainersConfig;
import com.kotonoha.llm.GeminiClient;
import com.kotonoha.llm.GeminiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest(properties = "gemini.api-key=test-key")
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class ChatPersistenceTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcClient jdbc;

    @MockitoBean
    GeminiClient gemini;

    // 테스트끼리 데이터가 섞이지 않도록 매번 새 계정을 쓴다.
    String email;
    String anon; // Authorization 헤더 값(Bearer ...)

    @BeforeEach
    void setUp() throws Exception {
        email = AuthTestSupport.uniqueEmail();
        anon = AuthTestSupport.signupAndGetBearer(mvc, email);
        when(gemini.isConfigured()).thenReturn(true);
        when(gemini.generateJson(any(), any()))
                .thenReturn("{\"reply\":\"こんにちは\",\"translation\":\"안녕하세요\"}");
    }

    ResultActions chat(String authHeader, String villagerId, String text, String extra) throws Exception {
        return mvc.perform(post("/api/chat").header("Authorization", authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"villagerId\":\"" + villagerId + "\"," + extra
                        + "\"messages\":[{\"role\":\"user\",\"content\":\"" + text + "\"}]}"));
    }

    @Test
    void 대화하면_사용자_메시지와_주민_답변이_저장되고_조회된다() throws Exception {
        chat(anon, "cafe", "やあ", "").andExpect(status().isOk());

        mvc.perform(get("/api/villagers/cafe/messages").header("Authorization", anon))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].role").value("user"))
                .andExpect(jsonPath("$[0].content").value("やあ"))
                .andExpect(jsonPath("$[1].role").value("assistant"))
                .andExpect(jsonPath("$[1].content").value("こんにちは"))
                .andExpect(jsonPath("$[1].translation").value("안녕하세요"));
    }

    @Test
    void 기록은_사용자별_주민별로_분리된다() throws Exception {
        chat(anon, "cafe", "やあ", "").andExpect(status().isOk());

        mvc.perform(get("/api/villagers/shop/messages").header("Authorization", anon))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/villagers/cafe/messages").header("Authorization", AuthTestSupport.signupAndGetBearer(mvc, AuthTestSupport.uniqueEmail())))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void 대화가_성립할_때마다_친밀도_횟수가_서버에서_오른다() throws Exception {
        for (int i = 0; i < 3; i++) chat(anon, "cafe", "やあ", "").andExpect(status().isOk());

        Integer count = jdbc.sql("""
                        SELECT i.exchanges FROM intimacy i JOIN users u ON u.id = i.user_id
                        WHERE u.email = :a AND i.villager_id = 'cafe'""")
                .param("a", email).query(Integer.class).single();
        assertThat(count).isEqualTo(3);

        // 3회 → "얼굴은 알아보는 사이" 단계. 수치는 노출하지 않고 문구만 내려간다.
        mvc.perform(get("/api/intimacy").header("Authorization", anon))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.villagerId=='cafe')].met").value(true))
                .andExpect(jsonPath("$[?(@.villagerId=='cafe')].description").value("얼굴은 알아보는 사이가 됐어요"))
                .andExpect(jsonPath("$[?(@.villagerId=='shop')].met").value(false))
                .andExpect(jsonPath("$[?(@.villagerId=='cafe')].exchanges").isEmpty());
    }

    @Test
    void 프론트가_보낸_exchanges는_무시하고_DB_값으로_프롬프트와_친밀도를_정한다() throws Exception {
        // 처음 대화인데 exchanges=999를 보내도 가장 낮은 단계의 프롬프트가 쓰이고 횟수는 1이 된다.
        chat(anon, "cafe", "やあ", "\"exchanges\":999,").andExpect(status().isOk());

        verify(gemini).generateJson(contains("아직 거의 초면"), any());
        mvc.perform(get("/api/intimacy").header("Authorization", anon))
                .andExpect(jsonPath("$[?(@.villagerId=='cafe')].description").value("아직 낯선 사이예요"));
    }

    @Test
    void 주민_프롬프트에_사용자의_닉네임이_들어간다() throws Exception {
        String nickname = AuthTestSupport.uniqueNickname();
        String named = "Bearer " + new tools.jackson.databind.ObjectMapper().readTree(mvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(AuthTestSupport.signupBody(AuthTestSupport.uniqueEmail(), nickname)))
                .andReturn().getResponse().getContentAsString()).get("accessToken").asString();

        // 어느 주민과 대화해도 같은 닉네임으로 부르도록 프롬프트에 들어간다.
        for (String villager : new String[] {"cafe", "shop"}) {
            chat(named, villager, "やあ", "").andExpect(status().isOk());
        }
        verify(gemini, org.mockito.Mockito.times(2)).generateJson(contains("\"" + nickname + "\""), any());
        // 한글/영문 닉네임은 가타카나로 바꿔 부르라는 지침이 함께 들어간다.
        verify(gemini, org.mockito.Mockito.times(2)).generateJson(contains("가타카나로 바꿔서 부르세요"), any());
    }

    @Test
    void 닉네임이_없는_계정은_이름_지침없이_대화한다() throws Exception {
        String email = AuthTestSupport.uniqueEmail();
        String hash = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(AuthTestSupport.PASSWORD);
        jdbc.sql("INSERT INTO users (email, password_hash) VALUES (:e, :h)").param("e", email).param("h", hash).update();
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + AuthTestSupport.PASSWORD + "\"}"))
                .andReturn().getResponse().getContentAsString();
        String legacy = "Bearer " + new tools.jackson.databind.ObjectMapper().readTree(body).get("accessToken").asString();

        chat(legacy, "cafe", "やあ", "").andExpect(status().isOk());

        verify(gemini, org.mockito.Mockito.never()).generateJson(contains("[상대의 이름]"), any());
    }

    @Test
    void Gemini가_실패하면_저장도_친밀도_증가도_없다() throws Exception {
        when(gemini.generateJson(any(), any())).thenThrow(new GeminiException("fail", null));

        chat(anon, "cafe", "やあ", "").andExpect(status().isBadGateway());

        mvc.perform(get("/api/villagers/cafe/messages").header("Authorization", anon))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/intimacy").header("Authorization", anon))
                .andExpect(jsonPath("$[?(@.villagerId=='cafe')].met").value(false));
    }

    @Test
    void 토큰이_없거나_잘못되면_401() throws Exception {
        mvc.perform(get("/api/intimacy")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/intimacy").header("Authorization", "nope")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/intimacy").header("Authorization", "Bearer not.a.jwt")).andExpect(status().isUnauthorized());
    }

    @Test
    void 모르는_주민의_기록_조회는_404() throws Exception {
        mvc.perform(get("/api/villagers/nobody/messages").header("Authorization", anon))
                .andExpect(status().isNotFound());
    }

    @Test
    void 같은_계정은_같은_users_행을_쓴다() throws Exception {
        chat(anon, "cafe", "やあ", "").andExpect(status().isOk());
        chat(anon, "shop", "やあ", "").andExpect(status().isOk());

        Integer users = jdbc.sql("SELECT count(*) FROM users WHERE email = :a")
                .param("a", email).query(Integer.class).single();
        assertThat(users).isEqualTo(1);
    }
}
