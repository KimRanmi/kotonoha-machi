package com.kotonoha.chat;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
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
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "gemini.api-key=test-key")
@Import(TestcontainersConfig.class)
@AutoConfigureMockMvc
class ChatControllerTest {

    String bearer;

    @BeforeEach
    void signUp() throws Exception {
        bearer = AuthTestSupport.signupAndGetBearer(mvc, AuthTestSupport.uniqueEmail());
    }

    @Autowired
    MockMvc mvc;

    @MockitoBean
    GeminiClient gemini;

    @Test
    void 정상_응답은_reply와_translation을_돌려준다() throws Exception {
        when(gemini.isConfigured()).thenReturn(true);
        when(gemini.generateJson(any(), any()))
                .thenReturn("{\"reply\":\"こんにちは\",\"translation\":\"안녕하세요\"}");

        mvc.perform(post("/api/chat").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"villagerId\":\"cafe\",\"messages\":[{\"role\":\"user\",\"content\":\"こんにちは\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value("こんにちは"))
                .andExpect(jsonPath("$.translation").value("안녕하세요"));
    }

    @Test
    void JSON이_깨지면_원문을_reply로_쓴다() throws Exception {
        when(gemini.isConfigured()).thenReturn(true);
        when(gemini.generateJson(any(), any())).thenReturn("こんにちは");

        mvc.perform(post("/api/chat").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value("こんにちは"))
                .andExpect(jsonPath("$.translation").value(""));
    }

    @Test
    void 메시지가_비면_400() throws Exception {
        when(gemini.isConfigured()).thenReturn(true);

        mvc.perform(post("/api/chat").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"messages\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("대화 메시지가 비어 있습니다."));
    }

    @Test
    void 본문이_JSON이_아니면_400() throws Exception {
        when(gemini.isConfigured()).thenReturn(true);

        mvc.perform(post("/api/chat").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content("not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("잘못된 요청입니다."));
    }

    @Test
    void Gemini_실패는_502() throws Exception {
        when(gemini.isConfigured()).thenReturn(true);
        when(gemini.generateJson(any(), any())).thenThrow(new GeminiException("fail", null));

        mvc.perform(post("/api/chat").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}"))
                .andExpect(status().isBadGateway());
    }

    @Test
    void API_키가_없으면_500() throws Exception {
        when(gemini.isConfigured()).thenReturn(false);

        mvc.perform(post("/api/chat").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}"))
                .andExpect(status().isInternalServerError());
    }
}
