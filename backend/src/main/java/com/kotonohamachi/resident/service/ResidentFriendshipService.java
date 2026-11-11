package com.kotonohamachi.resident.service;

import com.kotonohamachi.resident.Resident;
import com.kotonohamachi.resident.ResidentFriendship;
import com.kotonohamachi.resident.dto.FriendshipChange;
import com.kotonohamachi.resident.dto.FriendshipResponse;
import com.kotonohamachi.resident.repository.ResidentFriendshipRepository;
import com.kotonohamachi.resident.repository.ResidentRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 주민과의 친밀도를 조회하고 대화로 올린다. */
@Service
public class ResidentFriendshipService {

  private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

  private final ResidentRepository residentRepository;
  private final ResidentFriendshipRepository friendshipRepository;

  /**
   * 생성자.
   *
   * @param residentRepository 주민 저장소
   * @param friendshipRepository 친밀도 저장소
   */
  public ResidentFriendshipService(
      ResidentRepository residentRepository, ResidentFriendshipRepository friendshipRepository) {
    this.residentRepository = residentRepository;
    this.friendshipRepository = friendshipRepository;
  }

  /**
   * 모든 주민과의 친밀도를 돌려준다. 아직 대화한 적 없는 주민은 0이다.
   *
   * @param userId 사용자 ID
   * @return 주민별 친밀도
   */
  @Transactional(readOnly = true)
  public List<FriendshipResponse> listLevels(Long userId) {
    Map<Long, Integer> levelByResidentId = friendshipRepository.findAllByUserId(userId).stream()
        .collect(Collectors.toMap(ResidentFriendship::getResidentId, ResidentFriendship::getLevel));
    return residentRepository.findAll().stream()
        .map(resident -> new FriendshipResponse(
            resident.getSlug(), levelByResidentId.getOrDefault(resident.getId(), 0)))
        .toList();
  }

  /**
   * 주민과 대화를 한 번 나눈 것으로 치고 친밀도를 올린다.
   *
   * @param userId 사용자 ID
   * @param resident 대화한 주민
   * @return 바뀐 친밀도와 오른 양
   */
  @Transactional
  public FriendshipChange recordChat(Long userId, Resident resident) {
    ResidentFriendship friendship = friendshipRepository
        .findForUpdateByUserIdAndResidentId(userId, resident.getId())
        .orElseGet(() -> ResidentFriendship.start(userId, resident.getId()));
    int gain = friendship.earnChatGain(LocalDate.now(KOREA_ZONE));
    friendshipRepository.save(friendship);
    return new FriendshipChange(friendship.getLevel(), gain);
  }
}
