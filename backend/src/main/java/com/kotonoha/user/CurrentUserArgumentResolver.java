package com.kotonoha.user;

import com.kotonoha.common.ApiException;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

// 요청한 사용자 식별: Authorization: Bearer <JWT>를 검증해 subject(users.id)를 CurrentUser로 넘긴다.
// (2단계의 X-Anonymous-Id 방식을 이 클래스 하나만 바꿔 교체했다. 컨트롤러/서비스는 그대로다.)
@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    private static final String PREFIX = "Bearer ";

    private final JwtService jwt;

    public CurrentUserArgumentResolver(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.getParameterType() == CurrentUser.class;
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        String header = webRequest.getHeader("Authorization");
        if (header == null || !header.startsWith(PREFIX)) {
            throw unauthorized();
        }
        return jwt.verify(header.substring(PREFIX.length()).trim())
                .map(CurrentUser::new)
                .orElseThrow(CurrentUserArgumentResolver::unauthorized);
    }

    private static ApiException unauthorized() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
    }
}
