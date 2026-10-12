package com.kotonoha.town;

import com.kotonoha.user.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/buildings")
public class BuildingController {

    // 배치할 자리와 겉모습. 건물 id와 테마는 서버가 배치 대기 건물에서 정한다.
    public record PlaceRequest(
            @DecimalMin(value = "0", message = "좌표가 올바르지 않습니다.") @DecimalMax(value = "10000", message = "좌표가 올바르지 않습니다.") double x,
            @DecimalMin(value = "0", message = "좌표가 올바르지 않습니다.") @DecimalMax(value = "10000", message = "좌표가 올바르지 않습니다.") double y,
            @DecimalMin(value = "1", message = "건물 크기가 올바르지 않습니다.") @DecimalMax(value = "1000", message = "건물 크기가 올바르지 않습니다.") double width,
            @DecimalMin(value = "1", message = "건물 크기가 올바르지 않습니다.") @DecimalMax(value = "1000", message = "건물 크기가 올바르지 않습니다.") double height,
            @NotBlank(message = "건물 이름이 비어 있습니다.") @Size(max = 100, message = "건물 이름이 너무 깁니다.") String label,
            @Pattern(regexp = "#[0-9a-fA-F]{3,8}", message = "색상이 올바르지 않습니다.") String color) {}

    private final TownRepository town;

    public BuildingController(TownRepository town) {
        this.town = town;
    }

    @GetMapping
    public List<PlacedBuilding> placed(CurrentUser user) {
        return town.placedBuildings(user.id());
    }

    // 배치 대기 건물. 없으면 204.
    @GetMapping("/pending")
    public ResponseEntity<PendingBuilding> pending(CurrentUser user) {
        return town.pendingBuilding(user.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlacedBuilding place(CurrentUser user, @Valid @RequestBody PlaceRequest request) {
        return town.placePending(user.id(), request);
    }
}
