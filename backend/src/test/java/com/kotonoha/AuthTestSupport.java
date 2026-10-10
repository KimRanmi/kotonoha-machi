package com.kotonoha;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

// 테스트에서 새 계정을 만들고 Authorization 헤더 값("Bearer ...")을 돌려준다.
public final class AuthTestSupport {

    public static final String PASSWORD = "password-1234";

    private AuthTestSupport() {}

    public static String uniqueEmail() {
        return "user-" + UUID.randomUUID() + "@example.com";
    }

    public static String signupAndGetBearer(MockMvc mvc, String email) throws Exception {
        String body = mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + new ObjectMapper().readTree(body).get("accessToken").asString();
    }
}
