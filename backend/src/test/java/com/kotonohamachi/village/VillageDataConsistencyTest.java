package com.kotonohamachi.village;

import static org.assertj.core.api.Assertions.assertThat;

import com.kotonohamachi.auth.service.EmailSender;
import java.util.List;
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
 * 시트에서 만든 마이그레이션 데이터를 검증한다. 주민과 건물은 장소 이름(location) 글자로만 이어져서, 시트에 오타가 있으면
 * 에러 없이 연결이 끊기기 때문에 여기서 잡는다.
 */
@Testcontainers
@SpringBootTest
class VillageDataConsistencyTest {

  /** 건물이 없는 장소. 이곳의 주민은 건물 밖(길거리)에서 지낸다. */
  private static final String OUTDOORS = "거리";

  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @MockitoBean
  private EmailSender emailSender;

  @Test
  void 주민의_장소는_거리이거나_같은_이름의_건물이_있다() {
    List<String> orphanLocations = jdbcTemplate.queryForList(
        "SELECT DISTINCT location FROM resident WHERE location IS NOT NULL AND location <> ? "
            + "AND location NOT IN (SELECT location FROM building)",
        String.class,
        OUTDOORS);

    assertThat(orphanLocations).isEmpty();
  }
}
