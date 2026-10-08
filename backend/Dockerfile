# 빌드: JDK 25 + Gradle wrapper로 jar 생성 (테스트는 Docker가 필요하므로 이미지 빌드에서는 건너뛴다. CI에서 따로 돈다)
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true
COPY src src
RUN ./gradlew --no-daemon bootJar -x test

# 실행: JRE만. 비밀값(GEMINI_API_KEY, DB 비밀번호)은 이미지에 넣지 않고 실행 시 환경변수로 받는다.
FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd --system --no-create-home app
COPY --from=build /app/build/libs/*.jar app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
