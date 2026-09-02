# 4. EC2 컨테이너 실행 (Docker Compose)

`Docker Compose`를 사용하여 EC2 인스턴스에서 전체 애플리케이션 스택을 일관성 있게 실행하고 관리합니다. 이 문서에서는 Blue/Green 배포를 지원하는 `docker-compose.qa.yml` 파일의 구조와 각 서비스의 역할을 설명합니다.

## `docker-compose.qa.yml` 전체 구조

QA 환경에서 사용되는 Docker Compose 설정 파일입니다. YAML의 앵커(`&`)와 별칭(`*`)을 사용하여 중복되는 설정을 최소화하고 가독성을 높였습니다.

```yaml
x-pullit-common-environment: &pullit-common-env
  # 데이터베이스 연결 설정
  DB_URL: jdbc:mariadb://pullit-qa-db:3306/pullit_qa?createDatabaseIfNotExist=true&serverTimezone=Asia/Seoul&characterEncoding=UTF-8
  DB_USERNAME: ${DB_USERNAME}
  DB_PASSWORD: ${DB_PASSWORD}
  # 외부 서비스 API 키 (CD 파이프라인에서 주입)
  KAKAO_REST_API_KEY: ${KAKAO_REST_API_KEY}
  KAKAO_CLIENT_SECRET: ${KAKAO_CLIENT_SECRET}
  GEMINI_API_KEY: ${GEMINI_API_KEY}
  S3_ACCESS_KEY: ${S3_ACCESS_KEY}
  S3_SECRET_KEY: ${S3_SECRET_KEY}
  AWS_REGION: ${AWS_REGION}
  JWT_REDIRECT_URL: ${JWT_REDIRECT_URL}
  JWT_COOKIE_DOMAIN: ${JWT_COOKIE_DOMAIN}
  SENTRY_DSN: ${SENTRY_DSN}
  SENTRY_AUTH_TOKEN: ${SENTRY_AUTH_TOKEN}
  # JVM 옵션 (메모리 최적화)
  JAVA_OPTS: -Xmx512m -Xms256m
  # Redis 연결 설정
  REDIS_HOST: pullit-qa-redis
  REDIS_PORT: 6379
  # RabbitMQ 연결 설정
  RABBITMQ_HOST: pullit-qa-rabbitmq
  SPRING_RABBITMQ_USERNAME: ${RABBITMQ_DEFAULT_USER}
  SPRING_RABBITMQ_PASSWORD: ${RABBITMQ_DEFAULT_PASS}
  SPRING_RABBITMQ_LISTENER_SIMPLE_CONCURRENCY: 2

x-pullit-common-service-settings: &pullit-common-service
  restart: unless-stopped
  depends_on:
    pullit-qa-db:
      condition: service_healthy
    pullit-qa-redis:
      condition: service_healthy
    pullit-qa-rabbitmq:
      condition: service_healthy
  networks:
    - pullit-qa-network
  healthcheck:
    test: [ "CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/actuator/health" ]
    interval: 30s
    timeout: 10s
    retries: 5
    start_period: 40s

services:
  pullit-qa-blue:
    <<: *pullit-common-service
    image: ${DOCKER_IMAGE_BLUE}
    container_name: pullit-qa-blue
    ports:
      - "127.0.0.1:18080:8080"
    environment:
      <<: *pullit-common-env
      SPRING_PROFILES_ACTIVE: qa

  pullit-qa-green:
    <<: *pullit-common-service
    image: ${DOCKER_IMAGE_GREEN}
    container_name: pullit-qa-green
    ports:
      - "127.0.0.1:18081:8080"
    environment:
      <<: *pullit-common-env
      SPRING_PROFILES_ACTIVE: qa

  pullit-qa-worker-blue:
    restart: unless-stopped
    depends_on:
      pullit-qa-db:
        condition: service_healthy
      pullit-qa-redis:
        condition: service_healthy
      pullit-qa-rabbitmq:
        condition: service_healthy
    networks:
      - pullit-qa-network
    image: ${DOCKER_IMAGE_BLUE}
    container_name: pullit-qa-worker-blue
    environment:
      <<: *pullit-common-env
      SPRING_PROFILES_ACTIVE: qa,worker

  pullit-qa-worker-green:
    restart: unless-stopped
    depends_on:
      pullit-qa-db:
        condition: service_healthy
      pullit-qa-redis:
        condition: service_healthy
      pullit-qa-rabbitmq:
        condition: service_healthy
    networks:
      - pullit-qa-network
    image: ${DOCKER_IMAGE_GREEN}
    container_name: pullit-qa-worker-green
    environment:
      <<: *pullit-common-env
      SPRING_PROFILES_ACTIVE: qa,worker

  pullit-qa-db:
    image: mariadb:10.11
    container_name: pullit-qa-db
    restart: unless-stopped
    environment:
      - MARIADB_DATABASE=pullit_qa
      - MARIADB_USER=${DB_USERNAME}
      - MARIADB_PASSWORD=${DB_PASSWORD}
      - MARIADB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MARIADB_CHARSET=utf8mb4
      - MARIADB_COLLATION=utf8mb4_unicode_ci
    ports:
      - "3306:3306"
    volumes:
      - pullit_qa_data:/var/lib/mysql
      - ./db/init:/docker-entrypoint-initdb.d
    networks:
      - pullit-qa-network
    healthcheck:
      test: [ "CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${DB_ROOT_PASSWORD}" ]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --default-time-zone=+09:00
      - --slow_query_log=1
      - --log_output=TABLE
      - --long_query_time=1

  pullit-qa-rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: pullit-qa-rabbitmq
    restart: unless-stopped
    environment:
      - RABBITMQ_DEFAULT_USER=${RABBITMQ_DEFAULT_USER}
      - RABBITMQ_DEFAULT_PASS=${RABBITMQ_DEFAULT_PASS}
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - pullit-qa-network
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  prometheus:
    container_name: prometheus
    image: prom/prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus/prometheus.qa.yml:/etc/prometheus/prometheus.yml
    ports:
      - "127.0.0.1:9486:9090"
    networks:
      - pullit-qa-network

  grafana:
    container_name: grafana
    image: grafana/grafana
    restart: unless-stopped
    volumes:
      - grafana_storage:/var/lib/grafana
    ports:
      - "127.0.0.1:9485:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    networks:
      - pullit-qa-network

  node-exporter:
    container_name: node-exporter
    image: prom/node-exporter
    restart: unless-stopped
    ports:
      - "127.0.0.1:9487:9100"
    networks:
      - pullit-qa-network

  pullit-qa-redis:
    image: redis:8.0.4-alpine
    container_name: pullit-qa-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - pullit-qa-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pullit_qa_data:
    driver: local
  grafana_storage:
    driver: local
  rabbitmq_data:
    driver: local

networks:
  pullit-qa-network:
    driver: bridge
```

## 주요 서비스 설명

### 애플리케이션 서버 (Blue/Green)

-   `pullit-qa-blue` / `pullit-qa-green`: API 서버의 Blue/Green 환경입니다. 각각 다른 호스트 포트(18080, 18081)에 바인딩되어 Nginx를 통해 트래픽이 전환됩니다.
-   `pullit-qa-worker-blue` / `pullit-qa-worker-green`: RabbitMQ 메시지를 처리하는 비동기 워커 서버의 Blue/Green 환경입니다. 외부 포트는 노출하지 않습니다.
-   `depends_on`: DB, Redis, RabbitMQ가 정상적으로 실행된 후에만 애플리케이션 서버가 시작되도록 의존성을 설정합니다.
-   `healthcheck`: Spring Boot Actuator의 health endpoint를 주기적으로 체크하여 컨테이너의 정상 상태를 확인합니다.

### 데이터베이스 및 메시징

-   `pullit-qa-db`: MariaDB 데이터베이스 서버입니다. `volumes`를 통해 데이터 영속성을 보장하며, `healthcheck`로 서비스 준비 상태를 확인합니다.
-   `pullit-qa-redis`: In-memory 데이터 저장소로, 캐싱 및 Refresh Token 관리에 사용됩니다.
-   `pullit-qa-rabbitmq`: 비동기 작업을 위한 메시지 큐 서버입니다.

### 모니터링

-   `prometheus`: 서버 및 애플리케이션의 메트릭을 수집하는 모니터링 시스템입니다.
-   `grafana`: Prometheus가 수집한 데이터를 시각화하는 대시보드 도구입니다.
-   `node-exporter`: EC2 호스트 시스템(CPU, 메모리, 디스크 등)의 메트릭을 수집하여 Prometheus에 제공합니다.

### 공통 설정 (`x-pullit-common-env`)

-   데이터베이스 URL, 외부 서비스 API 키, JVM 옵션 등 여러 서비스에서 공통으로 사용하는 환경 변수를 정의합니다.
-   `${...}` 구문은 CI/CD 파이프라인(GitHub Actions)을 통해 주입될 Secret 및 변수를 의미합니다.
