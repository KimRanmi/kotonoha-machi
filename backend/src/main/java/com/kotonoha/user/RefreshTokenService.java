package com.kotonoha.user;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

// refresh 토큰 발급/교체/폐기. 토큰 원문(256비트 난수)은 클라이언트에게만 주고, DB에는 SHA-256 해시만 둔다.
@Service
public class RefreshTokenService {

    public record Rotation(long userId, String newToken) {}

    private final RefreshTokenRepository tokens;
    private final AuthProperties properties;
    private final TransactionTemplate tx;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository tokens, AuthProperties properties, TransactionTemplate tx) {
        this.tokens = tokens;
        this.properties = properties;
        this.tx = tx;
    }

    // 새 로그인(가입 포함)마다 새 family를 시작한다.
    public String issue(long userId) {
        tokens.deleteExpired(userId);
        return insertNew(userId, UUID.randomUUID());
    }

    // 정상이면 기존 토큰을 폐기하고 같은 family의 새 토큰을 돌려준다. 실패(없음/만료/폐기됨)면 empty.
    // 이미 폐기된 토큰이 다시 오면 탈취로 보고 family 전체를 폐기한다 (정당한 사용자도 재로그인해야 한다).
    public Optional<Rotation> rotate(String token) {
        return tx.execute(status -> {
            Optional<RefreshTokenRepository.Stored> found = tokens.findByHash(hash(token));
            if (found.isEmpty()) return Optional.empty();
            RefreshTokenRepository.Stored stored = found.get();

            if (stored.revoked() || !tokens.revoke(stored.id())) {
                tokens.revokeFamily(stored.familyId());
                return Optional.empty();
            }
            if (stored.expiresAt().isBefore(Instant.now())) return Optional.empty();
            return Optional.of(new Rotation(stored.userId(), insertNew(stored.userId(), stored.familyId())));
        });
    }

    // 로그아웃: 이 토큰이 속한 family 전체를 폐기한다. 토큰이 없거나 이미 무효여도 조용히 넘어간다.
    public void revoke(String token) {
        tokens.findByHash(hash(token)).ifPresent(stored -> tokens.revokeFamily(stored.familyId()));
    }

    private String insertNew(long userId, UUID familyId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.insert(userId, familyId, hash(token), Instant.now().plus(properties.refreshExpiration()));
        return token;
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
