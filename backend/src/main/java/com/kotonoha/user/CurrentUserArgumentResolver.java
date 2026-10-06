package com.kotonoha.user;

import com.kotonoha.common.ApiException;
import java.util.UUID;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

// 임시 사용자 식별: X-Anonymous-Id 헤더(프론트가 처음 한 번 만든 UUID)로 users 행을 찾거나 만든다.
// 3단계에서는 이 클래스의 resolveArgument만 JWT 검증 결과(subject → users.id)로 바꾸면 되고,
// 컨트롤러·서비스는 CurrentUser만 쓰므로 그대로 둘 수 있다.
@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    public static final String HEADER = "X-Anonymous-Id";

    private final UserRepository users;

    public CurrentUserArgumentResolver(UserRepository users) {
        this.users = users;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.getParameterType() == CurrentUser.class;
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        String header = webRequest.getHeader(HEADER);
        if (header == null || header.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, HEADER + " 헤더가 필요합니다.");
        }
        UUID anonymousId;
        try {
            anonymousId = UUID.fromString(header.trim());
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, HEADER + " 헤더가 올바른 UUID가 아닙니다.");
        }
        return new CurrentUser(users.findOrCreateByAnonymousId(anonymousId));
    }
}
