package com.kotonoha.user;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

// HS256 JWT 발급/검증. subject = users.id. 서명 키는 환경변수(JWT_SECRET)로만 받는다.
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final int MIN_SECRET_BYTES = 32;

    private final byte[] secret;
    private final JwtProperties properties;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        String configured = properties.secret();
        if (configured == null || configured.isBlank()) {
            // 키를 코드에 넣어 두지 않는다. 설정이 없으면 이번 실행에서만 쓰는 임의 키를 만든다.
            byte[] random = new byte[48];
            new SecureRandom().nextBytes(random);
            this.secret = random;
            log.warn("JWT_SECRET이 설정되지 않아 임의 키를 사용합니다. 서버를 재시작하면 모든 로그인이 풀립니다.");
        } else {
            this.secret = configured.getBytes(StandardCharsets.UTF_8);
            if (secret.length < MIN_SECRET_BYTES) {
                throw new IllegalStateException("JWT_SECRET은 32바이트 이상이어야 합니다.");
            }
        }
    }

    public String issue(long userId) {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(Long.toString(userId))
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plus(properties.expiration())))
                .build();
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(secret));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("JWT 서명에 실패했습니다.", e);
        }
    }

    // 서명·만료가 올바르면 user id를, 아니면 empty를 돌려준다.
    public Optional<Long> verify(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            if (!JWSAlgorithm.HS256.equals(jwt.getHeader().getAlgorithm()) || !jwt.verify(new MACVerifier(secret))) {
                return Optional.empty();
            }
            Date exp = jwt.getJWTClaimsSet().getExpirationTime();
            if (exp == null || exp.before(new Date())) return Optional.empty();
            return Optional.of(Long.parseLong(jwt.getJWTClaimsSet().getSubject()));
        } catch (ParseException | JOSEException | NumberFormatException e) {
            return Optional.empty();
        }
    }
}
