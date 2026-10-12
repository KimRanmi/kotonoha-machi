package com.kotonoha.town;

import com.kotonoha.user.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// 마지막 위치 이어하기. 로그인한 사용자 자신의 한 줄만 읽고 쓴다.
@RestController
@RequestMapping("/api/position")
public class PositionController {

    private final TownRepository town;

    public PositionController(TownRepository town) {
        this.town = town;
    }

    // 저장된 적 없으면 204.
    @GetMapping
    public ResponseEntity<LastPosition> get(CurrentUser user) {
        return town.lastPosition(user.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    // 덮어쓴다. 같은 요청을 다시 보내도 결과가 같다.
    @PutMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void save(CurrentUser user, @Valid @RequestBody LastPosition position) {
        town.saveLastPosition(user.id(), position);
    }
}
