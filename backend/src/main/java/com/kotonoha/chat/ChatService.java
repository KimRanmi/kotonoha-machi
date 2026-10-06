package com.kotonoha.chat;

import com.kotonoha.common.ApiException;
import com.kotonoha.intimacy.IntimacyLevel;
import com.kotonoha.intimacy.IntimacyRepository;
import com.kotonoha.llm.GeminiClient;
import com.kotonoha.villager.VillagerProfile;
import com.kotonoha.villager.Villagers;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
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
    private final ChatRepository chats;
    private final IntimacyRepository intimacy;
    private final TransactionTemplate tx;

    public ChatService(GeminiClient gemini, ObjectMapper objectMapper, ChatRepository chats,
            IntimacyRepository intimacy, TransactionTemplate tx) {
        this.gemini = gemini;
        this.objectMapper = objectMapper;
        this.chats = chats;
        this.intimacy = intimacy;
        this.tx = tx;
    }

    // Gemini 호출(느림)은 트랜잭션 밖에서 하고, 답변을 받은 뒤에만 대화 2건 저장 + 친밀도 +1을 한 트랜잭션으로 묶는다.
    // 호출이 실패하면 아무것도 저장/증가하지 않는다.
    public ChatResponse chat(long userId, ChatRequest request) {
        if (!"user".equals(request.messages().getLast().role())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "마지막 메시지는 사용자 메시지여야 합니다.");
        }
        VillagerProfile villager = Villagers.get(request.villagerId());
        int exchanges = intimacy.exchanges(userId, villager.id());

        String systemPrompt = villager.systemPrompt()
                + IntimacyLevel.promptFor(exchanges)
                + OUTPUT_FORMAT_INSTRUCTIONS;

        List<GeminiClient.Turn> turns = request.messages().stream()
                .map(m -> new GeminiClient.Turn("assistant".equals(m.role()) ? "model" : "user", m.content()))
                .toList();

        String raw = gemini.generateJson(systemPrompt, turns);
        ChatResponse response = parse(raw);

        // 이번 턴의 사용자 메시지는 요청의 마지막 user 메시지다.
        String userText = request.messages().getLast().content();
        tx.executeWithoutResult(status -> {
            chats.insert(userId, villager.id(), "user", userText, null);
            chats.insert(userId, villager.id(), "assistant", response.reply(),
                    response.translation().isEmpty() ? null : response.translation());
            intimacy.increment(userId, villager.id());
        });
        return response;
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
