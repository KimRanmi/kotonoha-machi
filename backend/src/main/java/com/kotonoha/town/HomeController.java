package com.kotonoha.town;

import com.kotonoha.common.ApiException;
import com.kotonoha.user.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/home")
public class HomeController {

    // 가구 JSON이 이보다 크면 거절한다 (정상 사용에서는 수 KB).
    private static final int MAX_FURNITURE_ITEMS = 200;
    private static final int MAX_FURNITURE_BYTES = 64 * 1024;

    private final TownRepository town;

    public HomeController(TownRepository town) {
        this.town = town;
    }

    // 내 집 위치. 아직 배치 전이면 204.
    @GetMapping("/position")
    public ResponseEntity<HomePosition> position(CurrentUser user) {
        return town.homePosition(user.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/position")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void savePosition(CurrentUser user, @Valid @RequestBody HomePosition position) {
        town.saveHomePosition(user.id(), position);
    }

    // 가구 배치 {placed: [...], stored: [...]} 를 그대로 돌려준다. 한 번도 저장한 적 없으면 204.
    @GetMapping(value = "/furniture", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> furniture(CurrentUser user) {
        return town.homeFurniture(user.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/furniture")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveFurniture(CurrentUser user, @RequestBody JsonNode body) {
        if (!body.isObject() || !body.path("placed").isArray() || !body.path("stored").isArray()
                || body.path("placed").size() + body.path("stored").size() > MAX_FURNITURE_ITEMS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "가구 배치 형식이 올바르지 않습니다.");
        }
        String json = body.toString();
        if (json.length() > MAX_FURNITURE_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "가구 배치 데이터가 너무 큽니다.");
        }
        town.saveHomeFurniture(user.id(), json);
    }
}
