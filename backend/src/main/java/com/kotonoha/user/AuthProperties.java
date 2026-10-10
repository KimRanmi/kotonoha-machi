package com.kotonoha.user;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "auth")
public record AuthProperties(Duration refreshExpiration, boolean cookieSecure) {}
