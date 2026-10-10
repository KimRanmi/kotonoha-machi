package com.kotonoha.town;

import com.kotonoha.user.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/themes")
public class ThemeController {

    public record CompleteRequest(
            @NotBlank(message = "테마 이름이 비어 있습니다.") @Size(max = 100, message = "테마 이름이 너무 깁니다.") String themeTitle) {}

    // firstCompletion: 이번이 첫 완료라서 배치 대기 건물이 생겼는지 (false면 복습).
    public record CompleteResponse(boolean firstCompletion) {}

    private final TownRepository town;

    public ThemeController(TownRepository town) {
        this.town = town;
    }

    @GetMapping("/completed")
    public List<String> completed(CurrentUser user) {
        return town.completedThemes(user.id());
    }

    @PostMapping("/complete")
    public CompleteResponse complete(CurrentUser user, @Valid @RequestBody CompleteRequest request) {
        return new CompleteResponse(town.completeTheme(user.id(), request.themeTitle()));
    }
}
