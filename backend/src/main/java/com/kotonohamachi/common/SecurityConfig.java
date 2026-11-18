package com.kotonohamachi.common;

import com.kotonohamachi.auth.service.CustomOAuth2UserService;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/** 세션 기반 인증을 위한 Spring Security 설정. 세션 쿠키 자체의 {@code HttpOnly}/{@code Secure}/{@code SameSite} 속성은 application.yml의 {@code server.servlet.session.cookie}에서 설정한다. */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

  private final String frontendOrigin;
  private final CustomOAuth2UserService customOAuth2UserService;

  /**
   * 생성자.
   *
   * @param frontendOrigin 세션 쿠키를 주고받을 프런트엔드 오리진(CORS 허용 대상)
   * @param customOAuth2UserService 소셜 로그인 사용자 정보를 처리하는 서비스
   */
  public SecurityConfig(
      @Value("${app.frontend-origin}") String frontendOrigin,
      CustomOAuth2UserService customOAuth2UserService) {
    this.frontendOrigin = frontendOrigin;
    this.customOAuth2UserService = customOAuth2UserService;
  }

  /**
   * 인증/인가 규칙을 정의하는 보안 필터 체인을 구성한다. {@code /api/auth/**}(회원가입, 로그인, 이메일 인증, 로그아웃)는 로그인 없이 접근할 수 있지만, 그중 {@code /api/auth/me}(현재 로그인된 사용자 조회)는 예외로 로그인이 필요하다. 소셜 로그인 경로({@code /oauth2/**}, {@code /login/oauth2/**})도 로그인 없이 접근할 수 있다. 그 외 모든 요청은 로그인(세션)이 필요하다.
   *
   * @param http HttpSecurity 빌더
   * @return 구성된 보안 필터 체인
   * @throws Exception 설정 중 오류가 발생하면
   */
  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
        .authorizeHttpRequests(authorize -> authorize
            .requestMatchers("/api/auth/me")
            .authenticated()
            .requestMatchers("/api/auth/**", "/oauth2/**", "/login/oauth2/**")
            .permitAll()
            // 외부 감시 서비스가 로그인 없이 서버 상태를 확인하는 헬스체크(application.yml에서 health만 노출)
            .requestMatchers("/actuator/health", "/actuator/health/**")
            .permitAll()
            .anyRequest()
            .authenticated())
        .exceptionHandling(exception ->
            exception.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
        .oauth2Login(oauth2 -> oauth2
            .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
            .successHandler(oauth2LoginSuccessHandler())
            .failureHandler(oauth2LoginFailureHandler()))
        .logout(logout -> logout
            .logoutUrl("/api/auth/logout")
            .logoutSuccessHandler((request, response, authentication) ->
                response.setStatus(HttpServletResponse.SC_NO_CONTENT))
            .invalidateHttpSession(true)
            .deleteCookies("JSESSIONID"));

    return http.build();
  }

  /**
   * 소셜 로그인이 성공하면 프런트엔드의 마을 화면으로 보낸다. 세션 쿠키는 Spring Security가 자동으로 발급한다.
   *
   * @return 소셜 로그인 성공 핸들러
   */
  private SimpleUrlAuthenticationSuccessHandler oauth2LoginSuccessHandler() {
    return new SimpleUrlAuthenticationSuccessHandler(frontendOrigin + "/town");
  }

  /**
   * 소셜 로그인이 실패하면 프런트엔드의 로그인 화면으로 돌려보낸다.
   *
   * @return 소셜 로그인 실패 핸들러
   */
  private SimpleUrlAuthenticationFailureHandler oauth2LoginFailureHandler() {
    return new SimpleUrlAuthenticationFailureHandler(frontendOrigin + "/login?error=social");
  }

  private CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of(frontendOrigin));
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
    configuration.setAllowedHeaders(List.of("Content-Type"));
    configuration.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }

  /**
   * 비밀번호를 BCrypt로 해싱하는 인코더를 등록한다.
   *
   * @return BCrypt 비밀번호 인코더
   */
  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  /**
   * 로그인 시 이메일/비밀번호를 검증하는 데 쓰는 인증 매니저를 등록한다.
   *
   * @param configuration Spring Security가 구성해 둔 인증 설정
   * @return 인증 매니저
   * @throws Exception 인증 매니저를 가져오는 중 오류가 발생하면
   */
  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
      throws Exception {
    return configuration.getAuthenticationManager();
  }
}
