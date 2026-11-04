# 1단계: JDK로 실행 가능한 jar를 만든다. 의존성 다운로드를 별도 레이어로 분리해서,
# 소스만 바뀌었을 때는 의존성을 다시 받지 않도록 캐시를 활용한다.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace

COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies > /dev/null

COPY config config
COPY src src
RUN ./gradlew --no-daemon bootJar -x test \
    && cp "$(find build/libs -name '*.jar' ! -name '*-plain.jar')" app.jar

# 2단계: 실행에는 JRE만 있으면 되므로 이미지 크기를 줄인다.
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /workspace/app.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
