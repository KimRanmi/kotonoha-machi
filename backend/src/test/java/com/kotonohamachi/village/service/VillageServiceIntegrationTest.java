package com.kotonohamachi.village.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.kotonohamachi.auth.service.EmailSender;
import com.kotonohamachi.theme.Theme;
import com.kotonohamachi.theme.ThemeProgress;
import com.kotonohamachi.theme.repository.ThemeProgressRepository;
import com.kotonohamachi.theme.repository.ThemeRepository;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import com.kotonohamachi.village.dto.VillageBuildingResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * {@link VillageService}의 건물 열림 규칙(집 0개, 카페 1개, 상점 3개)을 실제 Postgres(Testcontainers)로
 * 검증한다. 하루 한 테마 제한 때문에 API로는 여러 테마를 완료하기 어려워서, 테마 진행 행을 저장소로 직접 만든다.
 */
@Testcontainers
@SpringBootTest
class VillageServiceIntegrationTest {

  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  @Autowired
  private VillageService villageService;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private ThemeRepository themeRepository;

  @Autowired
  private ThemeProgressRepository themeProgressRepository;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @MockitoBean
  private EmailSender emailSender;

  private Long newUserId() {
    String suffix = UUID.randomUUID().toString();
    User user = new User(
        "u-" + suffix + "@test.com",
        "hash",
        "n-" + suffix.substring(0, 8),
        "123456",
        OffsetDateTime.now().plusMinutes(10));
    return userRepository.save(user).getId();
  }

  /** 새 테마를 만들어 사용자가 끝까지 완료한 상태의 진행 행을 저장하고, 진행 ID를 돌려준다. */
  private Long completeNewTheme(Long userId) {
    Theme theme = themeRepository.save(new Theme("t-" + UUID.randomUUID()));
    ThemeProgress progress =
        new ThemeProgress(userRepository.findById(userId).orElseThrow(), theme);
    for (int i = 0; i < 6; i++) {
      progress.completeCurrentStage();
    }
    return themeProgressRepository.save(progress).getId();
  }

  private static List<String> unlockedIds(List<VillageBuildingResponse> buildings) {
    return buildings.stream()
        .filter(VillageBuildingResponse::unlocked)
        .map(VillageBuildingResponse::id)
        .toList();
  }

  @Test
  void 가입_직후_완료_테마가_없으면_집만_열린다() {
    Long userId = newUserId();

    List<VillageBuildingResponse> buildings = villageService.getBuildings(userId);

    assertThat(unlockedIds(buildings)).containsExactly("home");
  }

  @Test
  void 응답_순서는_항상_집_카페_상점이다() {
    Long userId = newUserId();

    List<VillageBuildingResponse> buildings = villageService.getBuildings(userId);

    assertThat(buildings)
        .extracting(VillageBuildingResponse::id)
        .containsExactly("home", "cafe", "shop");
  }

  @Test
  void 테마를_1개_완료하면_카페가_열리고_상점은_잠겨_있다() {
    Long userId = newUserId();
    completeNewTheme(userId);
    villageService.unlockBuildings(userId);

    assertThat(unlockedIds(villageService.getBuildings(userId))).containsExactly("home", "cafe");
  }

  @Test
  void 테마를_2개_완료해도_상점은_잠겨_있다() {
    Long userId = newUserId();
    completeNewTheme(userId);
    completeNewTheme(userId);

    assertThat(unlockedIds(villageService.getBuildings(userId))).containsExactly("home", "cafe");
  }

  @Test
  void 테마를_3개_완료하면_상점까지_열린다() {
    Long userId = newUserId();
    completeNewTheme(userId);
    completeNewTheme(userId);
    completeNewTheme(userId);

    assertThat(unlockedIds(villageService.getBuildings(userId)))
        .containsExactly("home", "cafe", "shop");
  }

  @Test
  void 한_번_열린_건물은_완료_수가_줄어도_유지된다() {
    Long userId = newUserId();
    Long p1 = completeNewTheme(userId);
    completeNewTheme(userId);
    completeNewTheme(userId);
    assertThat(unlockedIds(villageService.getBuildings(userId)))
        .containsExactly("home", "cafe", "shop");

    jdbcTemplate.update("UPDATE theme_progress SET completed = false WHERE user_id = ?", userId);
    assertThat(themeProgressRepository.countByUserIdAndCompletedTrue(userId)).isZero();

    assertThat(unlockedIds(villageService.getBuildings(userId)))
        .containsExactly("home", "cafe", "shop");
    assertThat(p1).isNotNull();
  }

  @Test
  void 같은_조회를_두_번_해도_중복_행이나_오류가_없다() {
    Long userId = newUserId();
    completeNewTheme(userId);

    List<VillageBuildingResponse> first = villageService.getBuildings(userId);
    List<VillageBuildingResponse> second = villageService.getBuildings(userId);
    villageService.unlockBuildings(userId);

    assertThat(second).isEqualTo(first);
    Integer rows = jdbcTemplate.queryForObject(
        "SELECT count(*) FROM user_building WHERE user_id = ?", Integer.class, userId);
    assertThat(rows).isEqualTo(2);
  }
}
