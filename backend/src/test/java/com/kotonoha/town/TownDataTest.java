package com.kotonoha.town;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest(properties = "gemini.api-key=test-key")
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class TownDataTest {

    static final String BUILDING = "{\"x\":100,\"y\":120,\"width\":120,\"height\":100,\"label\":\"여행 학습관\",\"color\":\"#a0522d\"}";
    static final String FURNITURE = "{\"placed\":[{\"id\":\"bed\",\"x\":40,\"y\":110}],\"stored\":[{\"id\":\"shelf\",\"x\":0,\"y\":0}]}";

    @Autowired
    MockMvc mvc;

    String alice; // Authorization 헤더 값
    String bob;

    @BeforeEach
    void setUp() throws Exception {
        alice = AuthTestSupport.signupAndGetBearer(mvc, AuthTestSupport.uniqueEmail());
        bob = AuthTestSupport.signupAndGetBearer(mvc, AuthTestSupport.uniqueEmail());
    }

    ResultActions call(MockHttpServletRequestBuilder req, String auth, String body) throws Exception {
        req.header("Authorization", auth);
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(body);
        return mvc.perform(req);
    }

    @Test
    void 로그인_없이는_모든_API가_401() throws Exception {
        for (String path : new String[] {"/api/words", "/api/themes/completed", "/api/buildings", "/api/buildings/pending",
                "/api/home/position", "/api/home/furniture", "/api/onboarding"}) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/words").contentType(MediaType.APPLICATION_JSON).content("{\"word\":\"x\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 단어_추가_조회_삭제와_중복_무시() throws Exception {
        call(post("/api/words"), alice, "{\"word\":\"空港\"}").andExpect(status().isCreated()).andExpect(jsonPath("$.word").value("空港"));
        call(post("/api/words"), alice, "{\"word\":\"空港\"}").andExpect(status().isCreated());
        call(post("/api/words"), alice, "{\"word\":\"切符\"}").andExpect(status().isCreated());

        call(get("/api/words"), alice, null)
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].word").value("空港"))
                .andExpect(jsonPath("$[0].addedAt").isNumber());

        call(delete("/api/words").param("word", "空港"), alice, null).andExpect(status().isNoContent());
        call(get("/api/words"), alice, null).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void 단어_입력_검증() throws Exception {
        call(post("/api/words"), alice, "{\"word\":\"  \"}").andExpect(status().isBadRequest());
        call(post("/api/words"), alice, "{\"word\":\"" + "あ".repeat(101) + "\"}").andExpect(status().isBadRequest());
    }

    @Test
    void 다른_사용자의_단어는_보이지도_지워지지도_않는다() throws Exception {
        call(post("/api/words"), alice, "{\"word\":\"空港\"}");

        call(get("/api/words"), bob, null).andExpect(jsonPath("$.length()").value(0));
        call(delete("/api/words").param("word", "空港"), bob, null).andExpect(status().isNoContent());
        call(get("/api/words"), alice, null).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void 테마를_처음_완료하면_배치_대기_건물이_생기고_복습에서는_생기지_않는다() throws Exception {
        call(get("/api/buildings/pending"), alice, null).andExpect(status().isNoContent());

        call(post("/api/themes/complete"), alice, "{\"themeTitle\":\"여행\"}")
                .andExpect(jsonPath("$.firstCompletion").value(true));
        call(get("/api/themes/completed"), alice, null).andExpect(content().json("[\"여행\"]"));
        call(get("/api/buildings/pending"), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.themeTitle").value("여행"))
                .andExpect(jsonPath("$.completedAt").isNumber());

        // 배치하기 전에 다시 완료(복습)해도 대기 건물은 그대로 한 건이다.
        call(post("/api/themes/complete"), alice, "{\"themeTitle\":\"여행\"}")
                .andExpect(jsonPath("$.firstCompletion").value(false));
        call(get("/api/buildings/pending"), alice, null).andExpect(jsonPath("$.themeTitle").value("여행"));
    }

    @Test
    void 건물_배치는_대기_건물을_소비하고_저장된다() throws Exception {
        call(post("/api/buildings"), alice, BUILDING).andExpect(status().isConflict()); // 대기 건물 없음
        call(post("/api/themes/complete"), alice, "{\"themeTitle\":\"여행\"}");
        String completedAt = String.valueOf(call(get("/api/buildings/pending"), alice, null)
                .andReturn().getResponse().getContentAsString().replaceAll(".*\"completedAt\":(\\d+).*", "$1"));

        call(post("/api/buildings"), alice, BUILDING)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("theme-" + completedAt))
                .andExpect(jsonPath("$.themeTitle").value("여행"));

        call(get("/api/buildings/pending"), alice, null).andExpect(status().isNoContent());
        call(get("/api/buildings"), alice, null)
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].x").value(100.0))
                .andExpect(jsonPath("$[0].label").value("여행 학습관"));
        // 같은 요청을 다시 보내도 건물이 늘지 않는다.
        call(post("/api/buildings"), alice, BUILDING).andExpect(status().isConflict());
        call(get("/api/buildings"), alice, null).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void 건물_입력_검증() throws Exception {
        call(post("/api/themes/complete"), alice, "{\"themeTitle\":\"여행\"}");
        call(post("/api/buildings"), alice, BUILDING.replace("#a0522d", "red")).andExpect(status().isBadRequest());
        call(post("/api/buildings"), alice, BUILDING.replace("\"x\":100", "\"x\":-5")).andExpect(status().isBadRequest());
        // 검증에 실패해도 대기 건물은 소비되지 않는다.
        call(get("/api/buildings/pending"), alice, null).andExpect(status().isOk());
    }

    @Test
    void 다른_사용자의_테마_건물_대기건물은_보이지_않고_배치할_수도_없다() throws Exception {
        call(post("/api/themes/complete"), alice, "{\"themeTitle\":\"여행\"}");
        call(post("/api/buildings"), alice, BUILDING);
        call(post("/api/themes/complete"), alice, "{\"themeTitle\":\"음식\"}");

        call(get("/api/themes/completed"), bob, null).andExpect(content().json("[]"));
        call(get("/api/buildings"), bob, null).andExpect(content().json("[]"));
        call(get("/api/buildings/pending"), bob, null).andExpect(status().isNoContent());
        call(post("/api/buildings"), bob, BUILDING).andExpect(status().isConflict());

        // 밥이 같은 테마를 처음 완료해도 앨리스와 별개로 첫 완료다.
        call(post("/api/themes/complete"), bob, "{\"themeTitle\":\"여행\"}")
                .andExpect(jsonPath("$.firstCompletion").value(true));
        call(get("/api/buildings/pending"), alice, null).andExpect(jsonPath("$.themeTitle").value("음식"));
    }

    @Test
    void 내_집_위치와_가구_저장_조회() throws Exception {
        call(get("/api/home/position"), alice, null).andExpect(status().isNoContent());
        call(get("/api/home/furniture"), alice, null).andExpect(status().isNoContent());
        call(put("/api/home/furniture"), alice, FURNITURE).andExpect(status().isConflict()); // 집을 짓기 전

        call(put("/api/home/position"), alice, "{\"x\":300.5,\"y\":200}").andExpect(status().isNoContent());
        call(get("/api/home/position"), alice, null)
                .andExpect(jsonPath("$.x").value(300.5))
                .andExpect(jsonPath("$.y").value(200.0));
        call(get("/api/home/furniture"), alice, null).andExpect(status().isNoContent());

        call(put("/api/home/furniture"), alice, FURNITURE).andExpect(status().isNoContent());
        call(get("/api/home/furniture"), alice, null)
                .andExpect(status().isOk())
                .andExpect(content().json(FURNITURE, true));

        // 위치를 다시 저장해도(재시도) 가구는 유지된다.
        call(put("/api/home/position"), alice, "{\"x\":300.5,\"y\":200}").andExpect(status().isNoContent());
        call(get("/api/home/furniture"), alice, null).andExpect(content().json(FURNITURE, true));
    }

    @Test
    void 가구_형식_검증() throws Exception {
        call(put("/api/home/position"), alice, "{\"x\":1,\"y\":1}");
        call(put("/api/home/furniture"), alice, "{\"placed\":[]}").andExpect(status().isBadRequest());
        call(put("/api/home/furniture"), alice, "[1,2]").andExpect(status().isBadRequest());
        call(put("/api/home/position"), alice, "{\"x\":-1,\"y\":1}").andExpect(status().isBadRequest());
    }

    @Test
    void 다른_사용자의_집은_보이지_않고_내_집_가구도_덮어쓸_수_없다() throws Exception {
        call(put("/api/home/position"), alice, "{\"x\":300,\"y\":200}");
        call(put("/api/home/furniture"), alice, FURNITURE);

        call(get("/api/home/position"), bob, null).andExpect(status().isNoContent());
        call(get("/api/home/furniture"), bob, null).andExpect(status().isNoContent());
        call(put("/api/home/furniture"), bob, "{\"placed\":[],\"stored\":[]}").andExpect(status().isConflict());
        call(get("/api/home/furniture"), alice, null).andExpect(content().json(FURNITURE, true));
    }

    @Test
    void 온보딩_단계_기록은_멱등이고_사용자별로_분리된다() throws Exception {
        call(get("/api/onboarding"), alice, null).andExpect(content().json("[]"));
        call(put("/api/onboarding/place-home"), alice, null).andExpect(status().isNoContent());
        call(put("/api/onboarding/place-home"), alice, null).andExpect(status().isNoContent());

        call(get("/api/onboarding"), alice, null).andExpect(content().json("[\"place-home\"]"));
        call(get("/api/onboarding"), bob, null).andExpect(content().json("[]"));
        call(put("/api/onboarding/BAD STEP!"), alice, null).andExpect(status().isBadRequest());
    }
}
