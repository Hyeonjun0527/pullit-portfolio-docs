# 11. 로컬 환경 (Spring Boot & Docker Compose)

로컬에서 백엔드 개발을 진행할 때, `docker-compose.yml` 파일을 통해 데이터베이스, Redis, RabbitMQ 등 모든 외부 서비스를 한번에 실행할 수 있습니다.

특히 Spring Boot 3.1부터 도입된 `spring-docker-compose` 종속성을 활용하여, 별도의 `docker compose up` 명령어 없이 Spring Boot 애플리케이션을 실행하는 것만으로 Docker 컨테이너들이 자동으로 시작되고 종료되도록 설정합니다. 이를 통해 매우 편리한 개발 환경을 구축할 수 있습니다.

- **종속성 추가 (`build.gradle`)**
```groovy
developmentOnly 'org.springframework.boot:spring-docker-compose'
```

## 로컬 `compose.yml` 전문

프로젝트 루트에 위치한 `compose.yml` 파일의 전체 내용입니다.

```yaml
services:
  nginx:
    image: nginx:1.27
    container_name: pullit-local-nginx
    restart: unless-stopped
    ports:
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/certs:/etc/nginx/certs
    depends_on:
      - pullit-local-api
    networks:
      - pullit-local-network

  pullit-local-api:
    build: .
    container_name: pullit-local-api
    restart: unless-stopped
    ports: []
    environment:
      - SPRING_PROFILES_ACTIVE=local
      - DB_URL=jdbc:mariadb://mariadb:3306/mydatabase?createDatabaseIfNotExist=true&serverTimezone=Asia/Seoul&characterEncoding=UTF-8
      - DB_USERNAME=myuser
      - DB_PASSWORD=secret
      - REDIS_HOST=redis
      - RABBITMQ_HOST=rabbitmq
      - SPRING_RABBITMQ_USERNAME=guest
      - SPRING_RABBITMQ_PASSWORD=guest
      - APP_GEMINI_APIKEY=${APP_GEMINI_APIKEY}
      - AWS_REGION=${AWS_REGION}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - KAKAO_CLIENT_SECRET=${KAKAO_CLIENT_SECRET}
      - KAKAO_REDIRECT_URI=${KAKAO_REDIRECT_URI}
      - KAKAO_REST_API_KEY=${KAKAO_REST_API_KEY}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
    depends_on:
      mariadb:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - pullit-local-network

  pullit-local-worker:
    build: .
    container_name: pullit-local-worker
    restart: unless-stopped
    environment:
      - SPRING_PROFILES_ACTIVE=local,worker
      - SPRING_MAIN_WEB_APPLICATION_TYPE=NONE
      - DB_URL=jdbc:mariadb://mariadb:3306/mydatabase?createDatabaseIfNotExist=true&serverTimezone=Asia/Seoul&characterEncoding=UTF-8
      - DB_USERNAME=myuser
      - DB_PASSWORD=secret
      - REDIS_HOST=redis
      - RABBITMQ_HOST=rabbitmq
      - SPRING_RABBITMQ_USERNAME=guest
      - SPRING_RABBITMQ_PASSWORD=guest
      - APP_GEMINI_APIKEY=${APP_GEMINI_APIKEY}
      - AWS_REGION=${AWS_REGION}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - KAKAO_CLIENT_SECRET=${KAKAO_CLIENT_SECRET}
      - KAKAO_REDIRECT_URI=${KAKAO_REDIRECT_URI}
      - KAKAO_REST_API_KEY=${KAKAO_REST_API_KEY}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
    depends_on:
      mariadb:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - pullit-local-network

  mariadb:
    image: 'mariadb:12.0.2'
    environment:
      - 'MARIADB_DATABASE=mydatabase'
      - 'MARIADB_PASSWORD=secret'
      - 'MARIADB_ROOT_PASSWORD=verysecret'
      - 'MARIADB_USER=myuser'
    ports:
      - "127.0.0.1:3306:3306"
    networks:
      - pullit-local-network
    healthcheck:
      test: ["CMD", "mariadb", "-u", "myuser", "-psecret", "-e", "USE mydatabase;"]
      interval: 10s
      timeout: 5s
      retries: 10

  prometheus:
    container_name: prometheus
    image: prom/prometheus
    restart: always
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - 9486:9090
    networks:
      - pullit-local-network

  grafana:
    container_name: grafana
    image: grafana/grafana
    restart: always
    volumes:
      - grafana-storage:/var/lib/grafana
    ports:
      - 9485:3000
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    networks:
      - pullit-local-network

  node-exporter:
    image: prom/node-exporter
    ports:
      - "9487:9100"
    networks:
      - pullit-local-network

  redis:
    image: 'redis:8.0.4-alpine'
    ports:
      - "127.0.0.1:6379:6379"
    networks:
      - pullit-local-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: 'rabbitmq:3-management-alpine'
    container_name: pullit-local-rabbitmq
    ports:
      - "127.0.0.1:5672:5672"  # AMQP port
      - "127.0.0.1:15672:15672" # Management UI port
    networks:
      - pullit-local-network
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  pullit-local-network:

volumes:
  grafana-storage:
```
