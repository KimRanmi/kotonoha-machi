package com.kotonoha.user;

import com.kotonoha.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Locale;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record Credentials(
            @NotBlank(message = "이메일을 입력해주세요.") @Email(message = "이메일 형식이 올바르지 않습니다.")
            @Size(max = 255, message = "이메일이 너무 깁니다.") String email,
            // bcrypt는 72바이트까지만 반영하므로 상한을 둔다.
            @NotBlank(message = "비밀번호를 입력해주세요.")
            @Size(min = 8, max = 72, message = "비밀번호는 8자 이상 72자 이하여야 합니다.") String password) {}

    // accessToken은 응답 본문으로(브라우저는 메모리에만 보관), refresh 토큰은 httpOnly 쿠키로만 내려간다.
    public record AuthResponse(String accessToken, String email) {}

    public record MeResponse(String email) {}

    private static final String BAD_CREDENTIALS = "이메일 또는 비밀번호가 올바르지 않습니다.";

    static final String REFRESH_COOKIE = "kotonoha_refresh";
    // 쿠키는 인증 엔드포인트에만 전송되도록 경로를 제한한다.
    private static final String COOKIE_PATH = "/api/auth";

    private final UserRepository users;
    private final JwtService jwt;
    private final RefreshTokenService refreshTokens;
    private final AuthProperties authProperties;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    // 존재하지 않는 이메일로 로그인할 때도 해시 비교 시간이 비슷하도록 쓰는 더미 해시.
    private final String dummyHash = encoder.encode("not-a-real-password");

    public AuthController(UserRepository users, JwtService jwt, RefreshTokenService refreshTokens,
            AuthProperties authProperties) {
        this.users = users;
        this.jwt = jwt;
        this.refreshTokens = refreshTokens;
        this.authProperties = authProperties;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody Credentials request) {
        String email = normalize(request.email());
        try {
            long id = users.create(email, encoder.encode(request.password()));
            return session(HttpStatus.CREATED, id, email);
        } catch (DuplicateKeyException e) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody Credentials request) {
        String email = normalize(request.email());
        UserRepository.Account account = users.findByEmail(email).orElse(null);
        String hash = account != null ? account.passwordHash() : dummyHash;
        boolean matches = encoder.matches(request.password(), hash);
        if (account == null || !matches) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, BAD_CREDENTIALS);
        }
        return session(HttpStatus.OK, account.id(), email);
    }

    // refresh 쿠키로 새 access 토큰을 받는다. refresh 토큰도 함께 교체(rotation)된다.
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        RefreshTokenService.Rotation rotation = refreshToken == null ? null
                : refreshTokens.rotate(refreshToken).orElse(null);
        String email = rotation == null ? null : users.findEmailById(rotation.userId()).orElse(null);
        if (email == null) {
            // 무효한 쿠키는 지워서 클라이언트가 불필요하게 계속 보내지 않게 한다.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .header(HttpHeaders.SET_COOKIE, clearCookie().toString())
                    .body(null);
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(rotation.newToken()).toString())
                .body(new AuthResponse(jwt.issue(rotation.userId()), email));
    }

    // 로그아웃: 서버에서 refresh 토큰(과 같은 로그인 계열)을 폐기하고 쿠키를 지운다.
    // 이미 발급된 access 토큰은 만료(최대 15분)까지 유효하다 (stateless JWT의 한계).
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        if (refreshToken != null) refreshTokens.revoke(refreshToken);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, clearCookie().toString()).build();
    }

    @GetMapping("/me")
    public MeResponse me(CurrentUser user) {
        return new MeResponse(users.findEmailById(user.id())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.")));
    }

    private ResponseEntity<AuthResponse> session(HttpStatus status, long userId, String email) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, refreshCookie(refreshTokens.issue(userId)).toString())
                .body(new AuthResponse(jwt.issue(userId), email));
    }

    // httpOnly: JS가 읽을 수 없다(XSS로 탈취 불가). SameSite=Strict: 다른 사이트에서 발생한 요청에는 붙지 않는다(CSRF 방어).
    private ResponseCookie refreshCookie(String token) {
        return ResponseCookie.from(REFRESH_COOKIE, token)
                .httpOnly(true)
                .secure(authProperties.cookieSecure())
                .sameSite("Strict")
                .path(COOKIE_PATH)
                .maxAge(authProperties.refreshExpiration())
                .build();
    }

    private ResponseCookie clearCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(authProperties.cookieSecure())
                .sameSite("Strict")
                .path(COOKIE_PATH)
                .maxAge(0)
                .build();
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
