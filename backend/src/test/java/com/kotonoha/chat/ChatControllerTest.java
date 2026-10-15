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
import com.kotonoha.llm.GeminiException.Kind;
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
    void JSON이_깨지면_FORMAT_오류코드로_실패한다() throws Exception {
        when(gemini.isConfigured()).thenReturn(true);
        when(gemini.generateJson(any(), any())).thenReturn("こんにちは");

        mvc.perform(post("/api/chat").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("GEMINI_FORMAT"));
    }

    @Test
    void translation만_비어도_본_응답은_정상이다() throws Exception {
        when(gemini.isConfigured()).thenReturn(true);
        when(gemini.generateJson(any(), any())).thenReturn("{\"reply\":\"こんにちは\"}");

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
    void 장애_유형별로_HTTP_상태와_에러코드가_다르고_상세_원인은_노출되지_않는다() throws Exception {
        when(gemini.isConfigured()).thenReturn(true);
        String body = "{\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}";

        org.mockito.Mockito.doThrow(new GeminiException(Kind.TRANSIENT, 503, "model gemini-x overloaded", null)).when(gemini).generateJson(any(), any());
        mvc.perform(post("/api/chat").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("GEMINI_TRANSIENT"))
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("잠시 후 다시 시도")))
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("gemini"))));

        org.mockito.Mockito.doThrow(new GeminiException(Kind.CONFIG, 403, "key rejected", null)).when(gemini).generateJson(any(), any());
        mvc.perform(post("/api/chat").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("GEMINI_CONFIG"))
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("문제가 생겼어요")))
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("key"))));

        org.mockito.Mockito.doThrow(new GeminiException(Kind.FORMAT, "bad json", null)).when(gemini).generateJson(any(), any());
        mvc.perform(post("/api/chat").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("GEMINI_FORMAT"))
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("문제가 생겼어요")));
    }

    @Test
    void 번역_다시_시도는_번역문만_돌려주고_실패해도_코드로_구분된다() throws Exception {
        when(gemini.isConfigured()).thenReturn(true);
        when(gemini.generateText(any(), any())).thenReturn("안녕하세요");
        mvc.perform(post("/api/chat/translate").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"こんにちは\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.translation").value("안녕하세요"));

        org.mockito.Mockito.doThrow(new GeminiException(Kind.TRANSIENT, 503, "busy", null)).when(gemini).generateText(any(), any());
        mvc.perform(post("/api/chat/translate").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"こんにちは\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("GEMINI_TRANSIENT"));
    }

    @Test
    void API_키가_없으면_500() throws Exception {
        when(gemini.isConfigured()).thenReturn(false);

        mvc.perform(post("/api/chat").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("GEMINI_CONFIG"))
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("GEMINI_API_KEY"))));
    }
}
