package com.kotonoha.word;

import com.kotonoha.user.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/words")
public class WordController {

    public record AddWordRequest(
            @NotBlank(message = "단어가 비어 있습니다.") @Size(max = 100, message = "단어가 너무 깁니다.") String word) {}

    private final WordRepository words;

    public WordController(WordRepository words) {
        this.words = words;
    }

    @GetMapping
    public List<LearnedWord> list(CurrentUser user) {
        return words.all(user.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LearnedWord add(CurrentUser user, @Valid @RequestBody AddWordRequest request) {
        return words.add(user.id(), request.word());
    }

    // 단어에 슬래시 등이 있어도 안전하도록 경로가 아니라 쿼리 파라미터로 받는다.
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(CurrentUser user, @RequestParam String word) {
        words.remove(user.id(), word);
    }
}
