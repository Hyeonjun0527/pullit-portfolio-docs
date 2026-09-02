# 9. CI (Continuous Integration)

CI(지속적 통합)는 모든 개발 작업을 정기적으로 통합하여 코드 품질을 유지하고 빌드 및 테스트를 자동화하는 프로세스입니다. Pull-it 프로젝트에서는 GitHub Actions를 사용하여 CI 파이프라인을 구축했습니다.

## CI 워크플로우 (`ci.yml`)

이 워크플로우는 `main` 또는 `develop` 브랜치에 `push` 또는 `pull_request` 이벤트가 발생할 때마다 실행됩니다.

```yaml
name: Code check (linter, formatter)

on:
  push:
    branches: ["main", "develop"]
  pull_request:
    branches: ["main", "develop"]

jobs:
  code_check:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      AWS_REGION: ap-northeast-2
      # DB 관련 변수는 빌드/테스트 시 내장 DB를 사용하므로 불필요

    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: "21"
          distribution: "corretto"
          cache: "gradle"

      - name: Login to Docker registry
        if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.DOCKER_REGISTRY_HOST }}
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
          ecr: false

      - name: Grant execute permission for gradlew
        run: chmod +x ./gradlew

      - name: Check a code with Gradle
        run: ./gradlew codeCheck

      - name: Build
        run: ./gradlew build -PsentryEnabled=true --stacktrace --info --no-daemon --continue
        env:
          # Build(Test) 단계에서 필요한 secrets를 환경변수로 주입
          AWS_REGION: ap-northeast-2
          S3_ACCESS_KEY: ${{ secrets.S3_ACCESS_KEY }}
          S3_SECRET_KEY: ${{ secrets.S3_SECRET_KEY }}
          KAKAO_REST_API_KEY: ${{ secrets.KAKAO_REST_API_KEY }}
          KAKAO_CLIENT_SECRET: ${{ secrets.KAKAO_CLIENT_SECRET }}
          KAKAO_REDIRECT_URI: ${{ secrets.KAKAO_REDIRECT_URI }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          JWT_REDIRECT_URL: ${{ secrets.JWT_REDIRECT_URL }}
          JWT_COOKIE_DOMAIN: ${{ secrets.JWT_COOKIE_DOMAIN }}
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: junit-report
          path: build/reports/tests/test

      - name: Build and push image with tags (latest and sha)
        if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKER_IMAGE_NAME }}:latest
            ${{ secrets.DOCKER_IMAGE_NAME }}:${{ github.sha }}
```

## 주요 단계 설명

1.  **환경 설정**:
    -   `runs-on: ubuntu-latest`: 최신 Ubuntu 환경에서 작업을 실행합니다.
    -   `services`: 테스트 실행에 필요한 Redis 서비스를 Job 내에 독립적으로 실행합니다.
    -   `actions/checkout@v5`: 리포지토리 코드를 워크플로우 Runner로 가져옵니다.
    -   `actions/setup-java@v4`: Amazon Corretto JDK 21을 설치하고 Gradle 캐시를 설정하여 빌드 속도를 향상시킵니다.

2.  **코드 검사 및 빌드**:
    -   `./gradlew codeCheck`: Gradle Wrapper를 사용하여 코드 스타일, 정적 분석 등 코드 품질 검사를 수행합니다.
    -   `./gradlew build`: 프로젝트를 빌드하고 모든 테스트를 실행합니다. 이 단계에서는 GitHub Secrets를 통해 외부 API 키와 같은 민감한 정보를 안전하게 환경 변수로 주입하여 테스트를 수행합니다.

3.  **Docker 이미지 빌드 및 푸시** (`develop` 브랜치 한정):
    -   `docker/login-action@v3`: `develop` 브랜치에 `push` 이벤트가 발생했을 때만 Docker Registry에 로그인합니다.
    -   `docker/build-push-action@v5`: `Dockerfile`을 사용하여 Docker 이미지를 빌드하고, `latest` 태그와 Git commit SHA를 태그로 사용하여 Docker Registry에 푸시합니다. 이는 이후 CD 단계에서 배포할 이미지를 준비하는 과정입니다.

4.  **결과물 업로드**:
    -   `actions/upload-artifact@v4`: 테스트가 성공하든 실패하든 항상 JUnit 테스트 결과 리포트를 아티팩트로 업로드하여, 필요시 결과를 확인할 수 있도록 합니다.
