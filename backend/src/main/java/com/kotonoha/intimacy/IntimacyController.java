package com.kotonoha.intimacy;

import com.kotonoha.user.CurrentUser;
import com.kotonoha.villager.Villagers;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/intimacy")
public class IntimacyController {

    private final IntimacyRepository intimacy;

    public IntimacyController(IntimacyRepository intimacy) {
        this.intimacy = intimacy;
    }

    // 모든 주민에 대한 친밀도 (만난 적 없는 주민 포함).
    @GetMapping
    public List<IntimacyView> list(CurrentUser user) {
        Map<String, Integer> counts = intimacy.all(user.id());
        return Villagers.ids().stream().map(id -> {
            int exchanges = counts.getOrDefault(id, 0);
            return exchanges > 0
                    ? new IntimacyView(id, true, IntimacyLevel.of(exchanges).description())
                    : new IntimacyView(id, false, null);
        }).toList();
    }
}
