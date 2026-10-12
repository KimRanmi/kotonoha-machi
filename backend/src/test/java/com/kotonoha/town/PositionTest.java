package com.kotonoha.town;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kotonoha.AuthTestSupport;
import com.kotonoha.TestcontainersConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest(properties = "gemini.api-key=test-key")
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class PositionTest {

    @Autowired
    MockMvc mvc;

    String alice;
    String bob;

    @BeforeEach
    void setUp() throws Exception {
        alice = AuthTestSupport.signupAndGetBearer(mvc, AuthTestSupport.uniqueEmail());
        bob = AuthTestSupport.signupAndGetBearer(mvc, AuthTestSupport.uniqueEmail());
    }

    ResultActions save(String auth, String body) throws Exception {
        return mvc.perform(put("/api/position").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    ResultActions load(String auth) throws Exception {
        return mvc.perform(get("/api/position").header("Authorization", auth));
    }

    @Test
    void 로그인_없이는_401() throws Exception {
        mvc.perform(get("/api/position")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/position").contentType(MediaType.APPLICATION_JSON)
                .content("{\"place\":\"town\",\"x\":1,\"y\":2}")).andExpect(status().isUnauthorized());
    }

    @Test
    void 저장한_적_없으면_204() throws Exception {
        load(alice).andExpect(status().isNoContent());
    }

    @Test
    void 저장하고_조회한다() throws Exception {
        save(alice, "{\"place\":\"town\",\"x\":123.5,\"y\":456.25}").andExpect(status().isNoContent());
        load(alice).andExpect(status().isOk())
                .andExpect(jsonPath("$.place").value("town"))
                .andExpect(jsonPath("$.x").value(123.5))
                .andExpect(jsonPath("$.y").value(456.25));

        save(alice, "{\"place\":\"theme-1730000000000\",\"x\":0,\"y\":10000}").andExpect(status().isNoContent());
        load(alice).andExpect(jsonPath("$.place").value("theme-1730000000000"));
    }

    @Test
    void 같은_사용자가_다시_저장하면_덮어쓴다() throws Exception {
        save(alice, "{\"place\":\"town\",\"x\":10,\"y\":20}").andExpect(status().isNoContent());
        save(alice, "{\"place\":\"cafe\",\"x\":300,\"y\":400}").andExpect(status().isNoContent());
        load(alice)
                .andExpect(jsonPath("$.place").value("cafe"))
                .andExpect(jsonPath("$.x").value(300))
                .andExpect(jsonPath("$.y").value(400));
    }

    @Test
    void 사용자마다_자기_위치만_본다() throws Exception {
        save(alice, "{\"place\":\"cafe\",\"x\":300,\"y\":400}").andExpect(status().isNoContent());
        load(bob).andExpect(status().isNoContent());

        save(bob, "{\"place\":\"town\",\"x\":1,\"y\":2}").andExpect(status().isNoContent());
        load(alice).andExpect(jsonPath("$.place").value("cafe"));
        load(bob).andExpect(jsonPath("$.place").value("town"));
    }

    @Test
    void 잘못된_입력은_거절하고_기존_값은_유지한다() throws Exception {
        save(alice, "{\"place\":\"town\",\"x\":10,\"y\":20}").andExpect(status().isNoContent());

        String[] bad = {
            "{\"place\":\"\",\"x\":1,\"y\":2}",
            "{\"place\":\"" + "a".repeat(65) + "\",\"x\":1,\"y\":2}",
            "{\"place\":\"../etc\",\"x\":1,\"y\":2}",
            "{\"x\":1,\"y\":2}",
            "{\"place\":\"town\",\"x\":-1,\"y\":2}",
            "{\"place\":\"town\",\"x\":1,\"y\":10001}",
            "{\"place\":\"town\",\"x\":1e999,\"y\":2}",
            "{\"place\":\"town\",\"x\":NaN,\"y\":2}",
            "{\"place\":\"town\",\"x\":\"abc\",\"y\":2}",
            "{\"place\":\"town\",\"x\":1}",
        };
        for (String body : bad) {
            save(alice, body).andExpect(status().isBadRequest());
        }
        load(alice).andExpect(jsonPath("$.x").value(10)).andExpect(jsonPath("$.y").value(20));
    }
}
