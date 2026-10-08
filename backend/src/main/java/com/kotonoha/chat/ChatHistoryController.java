package com.kotonoha.chat;

import com.kotonoha.common.ApiException;
import com.kotonoha.user.CurrentUser;
import com.kotonoha.villager.Villagers;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/villagers/{villagerId}/messages")
public class ChatHistoryController {

    private final ChatRepository chats;

    public ChatHistoryController(ChatRepository chats) {
        this.chats = chats;
    }

    @GetMapping
    public List<ChatMessageRecord> history(CurrentUser user, @PathVariable String villagerId) {
        if (Villagers.find(villagerId) == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "알 수 없는 주민입니다.");
        }
        return chats.history(user.id(), villagerId);
    }
}
