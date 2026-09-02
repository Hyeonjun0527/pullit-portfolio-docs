# 3. Docker 빌드 전략 (Multi-stage)

안정적이고 효율적인 배포를 위해 Docker를 사용하며, **Multi-stage 빌드 방식**으로 이미지를 생성하여 최적화합니다.

## Multi-stage Build의 장점

-   **최종 이미지 크기 최소화:** 빌드에만 필요했던 JDK, Gradle 등 무거운 의존성들을 최종 이미지에서 제거하여 이미지 크기를 획기적으로 줄일 수 있습니다.
-   **보안 강화:** 빌드 도구나 소스코드가 최종 이미지에 포함되지 않으므로 공격 표면(Attack Surface)이 줄어듭니다.
-   **빌드 캐시 활용:** `COPY` 명령어의 순서를 최적화하여, 소스코드가 변경되지 않았을 경우 Gradle 의존성 다운로드 단계를 캐시로 처리해 빌드 속도를 높입니다.

## Multi-stage `Dockerfile`

```yaml
# ===================================
#  Builder Stage
#  - 소스코드를 컴파일하고 실행 가능한 JAR 파일을 생성합니다.
# ===================================
FROM docker.io/amazoncorretto:21-alpine-jdk AS builder

# 작업 디렉토리 설정
WORKDIR /app

# Gradle 캐시를 위한 레이어 분리
# 소스코드보다 먼저 복사하여 의존성이 변경되지 않았을 때 캐시를 활용
COPY gradle/ gradle/
COPY gradlew .
COPY build.gradle .
COPY settings.gradle .
RUN chmod +x gradlew

# 의존성 다운로드
RUN ./gradlew dependencies --no-daemon

# 소스코드 복사
COPY src/ src/

# JAR 파일 빌드
RUN ./gradlew bootJar --no-daemon

# ===================================
#  Runtime Stage
#  - Builder Stage에서 생성된 JAR 파일만 가져와 실행 환경을 구성합니다.
# ===================================
FROM docker.io/amazoncorretto:21-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 타임존 설정
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 헬스체크에 필요한 wget 설치
RUN apk add --no-cache tzdata wget

# 보안을 위한 비-루트 사용자 생성
RUN addgroup -S spring && adduser -S spring -G spring

# Builder Stage에서 빌드된 JAR 파일만 복사
COPY --from=builder /app/build/libs/*.jar app.jar

# 파일 소유권을 비-루트 사용자에게 부여
RUN chown spring:spring app.jar

# 비-루트 사용자로 전환
USER spring

# 컨테이너 상태를 확인하기 위한 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# 포트 노출
EXPOSE 8080

# 애플리케이션 실행 (환경변수로 JVM 옵션 주입)
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
```

이 `Dockerfile`은 CI 파이프라인(`ci.yml`)의 마지막 단계에서 사용되어 최종 배포 이미지를 생성합니다.
