package com.kotonohamachi.village;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** V20 마이그레이션의 기존 사용자 백필을, V19까지만 적용한 DB에 데이터를 넣은 뒤 V20을 적용해 검증한다. */
@Testcontainers
class UserBuildingMigrationTest {

  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  private Flyway flyway(String target) {
    return Flyway.configure()
        .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
        .target(target)
        .load();
  }

  private void exec(Connection c, String sql) throws Exception {
    try (var st = c.createStatement()) {
      st.execute(sql);
    }
  }

  private List<String> buildingsOf(Connection c, String nickname) throws Exception {
    List<String> result = new ArrayList<>();
    try (PreparedStatement ps = c.prepareStatement(
        "SELECT ub.building_id FROM user_building ub JOIN users u ON u.id = ub.user_id "
            + "WHERE u.nickname = ? ORDER BY ub.building_id")) {
      ps.setString(1, nickname);
      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          result.add(rs.getString(1));
        }
      }
    }
    return result;
  }

  @Test
  void 기존_사용자는_완료_테마_수에_맞게_건물이_백필된다() throws Exception {
    flyway("19").migrate();
    try (Connection c = DriverManager.getConnection(
        postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())) {
      for (String n : List.of("zero", "one", "three", "two")) {
        exec(
            c,
            "INSERT INTO users (email, password_hash, nickname, status) VALUES ('" + n
                + "@t.com', 'h', '" + n + "', 'ACTIVE')");
      }
      for (int i = 1; i <= 3; i++) {
        exec(c, "INSERT INTO themes (title) VALUES ('mig-" + i + "')");
      }
      // one: 1개 완료, two: 2개 완료, three: 3개 완료 + 미완료 1개는 세지 않는다
      insertProgress(c, "one", 1, true);
      insertProgress(c, "two", 1, true);
      insertProgress(c, "two", 2, true);
      insertProgress(c, "three", 1, true);
      insertProgress(c, "three", 2, true);
      insertProgress(c, "three", 3, true);
      insertProgress(c, "zero", 1, false);

      flyway("20").migrate();

      assertThat(buildingsOf(c, "zero")).containsExactly("home");
      assertThat(buildingsOf(c, "one")).containsExactly("cafe", "home");
      assertThat(buildingsOf(c, "two")).containsExactly("cafe", "home");
      assertThat(buildingsOf(c, "three")).containsExactly("cafe", "home", "shop");
    }
  }

  private void insertProgress(Connection c, String nickname, int themeIndex, boolean completed)
      throws Exception {
    exec(
        c,
        "INSERT INTO theme_progress (user_id, theme_id, current_stage, completed) "
            + "SELECT u.id, t.id, 'REVIEW', " + completed + " FROM users u, themes t "
            + "WHERE u.nickname = '" + nickname + "' AND t.title = 'mig-" + themeIndex + "'");
  }
}
