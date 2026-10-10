package com.kotonoha.chat;

import com.kotonoha.common.ApiException;
import com.kotonoha.intimacy.IntimacyLevel;
import com.kotonoha.intimacy.IntimacyRepository;
import com.kotonoha.llm.GeminiClient;
import com.kotonoha.user.UserRepository;
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
    private final UserRepository users;

    public ChatService(GeminiClient gemini, ObjectMapper objectMapper, ChatRepository chats,
            IntimacyRepository intimacy, TransactionTemplate tx, UserRepository users) {
        this.users = users;
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
                + nicknamePrompt(userId)
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

    // 모든 주민이 같은 이름으로 부르도록, 사용자의 닉네임을 시스템 프롬프트에 넣는다.
    // 대화는 일본어로만 이뤄지므로 한글/영문 닉네임은 발음에 맞는 가타카나로 바꿔 부르게 한다
    // (화면 표시와 DB의 닉네임은 그대로). 닉네임은 글자/숫자/밑줄만 허용되므로(Nicknames) 지시문이 섞여 들어갈 수 없다.
    private String nicknamePrompt(long userId) {
        return users.findNicknameById(userId).map(nickname -> "\n\n[상대의 이름]\n"
                + "상대의 닉네임은 \"" + nickname + "\"입니다. 대화 중 자연스럽게 이 이름으로 불러주세요"
                + "(매 문장마다 부를 필요는 없고, 첫 인사나 말을 걸 때 등 자연스러운 때에). "
                + "대화는 일본어로만 하므로, 닉네임이 한글이나 영문이면 발음에 맞는 자연스러운 가타카나로 바꿔서 부르세요"
                + "(예: 하루 → ハル, Haru → ハル). 한글이나 영문 원문은 대사에 쓰지 마세요. "
                + "대화 내내 같은 가타카나 표기를 일관되게 쓰세요. 이미 히라가나·가타카나·한자인 닉네임은 그대로 쓰세요. "
                + "호칭은 위의 관계에 어울리게 하세요(처음에는 정중하게 'ハルさん'처럼 이름 뒤에 さん을 붙이고, "
                + "가까워지면 さん을 빼는 등 더 편하게).").orElse("");
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
