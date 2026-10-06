package com.kotonoha.chat;

import com.kotonoha.intimacy.IntimacyLevel;
import com.kotonoha.llm.GeminiClient;
import com.kotonoha.villager.VillagerProfile;
import com.kotonoha.villager.Villagers;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private static final String OUTPUT_FORMAT_INSTRUCTIONS = """


            추가 출력 형식 지침:
            - 위 대화 원칙을 그대로 따라 생성한 일본어 응답을 "reply" 필드에 넣으세요.
            - reply를 자연스러운 한국어로 옮긴 번역문을 "translation" 필드에 넣으세요 (설명이나 따옴표 없이 번역문만).
            - 반드시 이 두 필드만 가진 JSON 객체로 응답하세요.""";

    private final GeminiClient gemini;
    private final ObjectMapper objectMapper;

    public ChatService(GeminiClient gemini, ObjectMapper objectMapper) {
        this.gemini = gemini;
        this.objectMapper = objectMapper;
    }

    public ChatResponse chat(ChatRequest request) {
        VillagerProfile villager = Villagers.get(request.villagerId());
        // 클라이언트가 보낸 값은 신뢰할 수 없으므로 음이 아닌 정수로 정리한다.
        int exchanges = request.exchanges() == null ? 0 : Math.max(0, request.exchanges());

        String systemPrompt = villager.systemPrompt()
                + IntimacyLevel.promptFor(exchanges)
                + OUTPUT_FORMAT_INSTRUCTIONS;

        List<GeminiClient.Turn> turns = request.messages().stream()
                .map(m -> new GeminiClient.Turn("assistant".equals(m.role()) ? "model" : "user", m.content()))
                .toList();

        String raw = gemini.generateJson(systemPrompt, turns);
        return parse(raw);
    }

    private ChatResponse parse(String raw) {
        try {
            JsonNode node = objectMapper.readTree(raw.isBlank() ? "{}" : raw);
            return new ChatResponse(text(node, "reply"), text(node, "translation"));
        } catch (JacksonException e) {
            log.warn("JSON 파싱 실패, 원문을 그대로 사용: {}", e.getMessage());
            return new ChatResponse(raw.trim(), "");
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isString() ? value.asString().trim() : "";
    }
}
