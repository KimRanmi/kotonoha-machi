package com.kotonoha.town;

import com.kotonoha.user.CurrentUser;
import java.util.List;
import java.util.regex.Pattern;
import com.kotonoha.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/onboarding")
public class OnboardingController {

    private static final Pattern STEP = Pattern.compile("[a-z0-9-]{1,32}");

    private final TownRepository town;

    public OnboardingController(TownRepository town) {
        this.town = town;
    }

    // 끝낸 단계 id 목록.
    @GetMapping
    public List<String> done(CurrentUser user) {
        return town.onboardingDone(user.id());
    }

    // 단계를 끝냈다고 기록한다 (이미 끝낸 단계여도 성공).
    @PutMapping("/{step}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markDone(CurrentUser user, @PathVariable String step) {
        if (!STEP.matcher(step).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "온보딩 단계 이름이 올바르지 않습니다.");
        }
        town.markOnboardingDone(user.id(), step);
    }
}
