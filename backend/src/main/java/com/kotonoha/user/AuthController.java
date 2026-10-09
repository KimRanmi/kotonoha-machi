package com.kotonoha.user;

import com.kotonoha.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Locale;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
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

    public record AuthResponse(String token, String email) {}

    public record MeResponse(String email) {}

    private static final String BAD_CREDENTIALS = "이메일 또는 비밀번호가 올바르지 않습니다.";

    private final UserRepository users;
    private final JwtService jwt;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    // 존재하지 않는 이메일로 로그인할 때도 해시 비교 시간이 비슷하도록 쓰는 더미 해시.
    private final String dummyHash = encoder.encode("not-a-real-password");

    public AuthController(UserRepository users, JwtService jwt) {
        this.users = users;
        this.jwt = jwt;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse signup(@Valid @RequestBody Credentials request) {
        String email = normalize(request.email());
        try {
            long id = users.create(email, encoder.encode(request.password()));
            return new AuthResponse(jwt.issue(id), email);
        } catch (DuplicateKeyException e) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.");
        }
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody Credentials request) {
        String email = normalize(request.email());
        UserRepository.Account account = users.findByEmail(email).orElse(null);
        String hash = account != null ? account.passwordHash() : dummyHash;
        boolean matches = encoder.matches(request.password(), hash);
        if (account == null || !matches) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, BAD_CREDENTIALS);
        }
        return new AuthResponse(jwt.issue(account.id()), email);
    }

    @GetMapping("/me")
    public MeResponse me(CurrentUser user) {
        return new MeResponse(users.findEmailById(user.id())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.")));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
