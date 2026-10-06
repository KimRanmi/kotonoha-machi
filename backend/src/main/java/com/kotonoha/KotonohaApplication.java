package com.kotonoha;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class KotonohaApplication {

    public static void main(String[] args) {
        SpringApplication.run(KotonohaApplication.class, args);
    }
}
