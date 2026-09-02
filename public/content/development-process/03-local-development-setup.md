# 3. 로컬 개발 환경 구성

이 문서는 Pull-it 프로젝트의 백엔드 및 프론트엔드 개발을 로컬 환경에서 진행하기 위한 설정 절차를 안내합니다. 전체적인 흐름을 동영상으로도 제공하므로, 텍스트 설명과 함께 참고하시면 더욱 쉽게 환경을 구성하실 수 있습니다.

## 1. 백엔드 로컬 개발 환경

백엔드 애플리케이션을 로컬에서 실행하고 API를 테스트하기 위한 절차입니다. 데이터베이스, Redis 등 외부 의존성은 Docker를 통해 관리하여 복잡성을 줄입니다.

<video controls width="100%">
  <source src="./local-backend-movie.mkv" type="video/mp4">
  브라우저가 비디오 태그를 지원하지 않습니다.
</video>

> **핵심 절차 요약:**
> 1. 프로젝트를 클론받고 IDE(IntelliJ)에서 엽니다.
> 2. `compose.yml` 파일을 사용하여 데이터베이스, Redis 등 외부 서비스를 실행합니다.
> 3. `application-local.yml`, .env 파일`이 제대로 설정되었는지 확인합니다.
(민감한 api 키 정보라 내부 관계자에게만 제공합니다.
매우 물론 번거로우시겠지만 키 등록만 하시면 로컬 백엔드를 띄우실 수 있습니다.)
> 4. Spring Boot 애플리케이션을 실행합니다.
> 5. Insomnia와 같은 API 클라이언트를 사용하여 API가 정상적으로 동작하는지 테스트합니다.

### 설정 파일 상세 (`application-local.yml` 및 `.env`)

로컬 환경 실행에 필요한 주요 설정 파일의 예시입니다. `.env` 파일의 민감한 키 값들은 실제 개발 시 내부적으로 공유되는 값으로 대체해야 합니다.

#### `application-local.yml`
이 파일은 로컬 환경에서 Docker Compose로 실행된 서비스(DB, Redis)에 연결하기 위한 설정을 정의합니다.

```yaml
spring:
  # ===================================================================
  # Docker Compose 환경을 위한 데이터베이스 및 Redis 설정
  # application.yml의 설정을 덮어씁니다.
  # ===================================================================
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  data:
    redis:
      host: ${REDIS_HOST:redis}
      port: 6379

  # ===================================================================
  # JPA 및 Flyway 설정 -> application.yml의 기본값(create-drop)을 사용하도록 주석 처리
  # ===================================================================

  jpa:
    defer-datasource-initialization: true
    generate-ddl: false # DDL을 직접 관리하므로 Hibernate의 DDL 생성 비활성화
    hibernate:
      ddl-auto: validate # 시작 시 엔티티와 스키마의 일치 여부만 검증
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MariaDBDialect
        format_sql: true
        show_sql: false
  flyway:
    enabled: false # 로컬에서 Flyway 비활성화 명시
```

#### `.env` (프로젝트 루트)
이 파일은 `docker-compose`나 애플리케이션 실행 시 참조하는 환경 변수를 정의합니다. 아래는 로컬 개발에 필요한 임시 값 예시입니다. **(주의: 실제 키가 아니며, 개발 시에는 담당자에게 유효한 키를 발급받아 사용해야 합니다.)**

```bash
APP_GEMINI_APIKEY=?
AWS_REGION=ap-northeast-2
GOOGLE_API_KEY=?
GRAFANA_ADMIN_PASSWORD=1234
KAKAO_CLIENT_SECRET=?
KAKAO_REDIRECT_URI=/login/oauth2/code
KAKAO_REST_API_KEY=?
S3_ACCESS_KEY=?
S3_SECRET_KEY=?
```

## 2. 프론트엔드 로컬 개발 환경

프론트엔드 애플리케이션을 로컬 개발 서버에서 실행하고 백엔드 API와 연동하는 절차입니다. 프론트엔드 개발은 **어떤 백엔드와 통신할지**에 따라 두 가지 방식으로 진행할 수 있습니다.


<video controls width="100%">
  <source src="./local-frontend-movie.mkv" type="video/mp4">
  브라우저가 비디오 태그를 지원하지 않습니다.
</video>

> **핵심 절차 요약:**
> 1. 프로젝트를 클론받고 IDE(VSCode)에서 엽니다.
> 2. `pnpm install` 명령어로 의존성을 설치합니다.
> 3. `.env.local` 파일을 생성하고 통신할 백엔드 서버의 주소를 `VITE_API_BASE_URL` 환경 변수로 설정합니다.
> 4. `pnpm run dev` 명령어로 개발 서버를 실행합니다.
> 5. 브라우저에서 `http://localhost:5173`으로 접속하여 프론트엔드 애플리케이션을 확인하고 기능을 테스트합니다.

### `.env.local` 설정 (택 1)
프론트엔드 프로젝트 루트에 `.env.local` 파일을 생성하고, 아래 두 가지 옵션 중 하나를 선택하여 내용을 작성합니다.

#### 옵션 A: 운영(QA) 서버와 통신 (프론트엔드 단독 개발 시)
로컬에 백엔드를 띄우지 않고 프론트엔드 UI/UX 작업에만 집중하고 싶을 때 사용합니다. API 키 설정이 전혀 필요 없어 간편합니다.
```
# .env.local
VITE_API_BASE_URL=https://portfolio.yeon.world/pull-it
```
> 원칙상 QA 서버와 로컬 프론트가 통신해야 하지만, 현재 QA 서버가 별도로 없어 운영(Production) 서버와 통신하여 개발을 진행합니다.

#### 옵션 B: 로컬 백엔드 서버와 통신 (풀스택 개발 시)
로컬에 백엔드 서버를 직접 띄우고 API를 함께 개발하며 테스트할 때 사용합니다.
```
# .env.local
VITE_API_BASE_URL=https://localhost
```

## 3. 풀스택 로컬 개발 (HTTPS 환경)

백엔드와 프론트엔드를 모두 로컬에 띄우고 `https://localhost` 환경에서 실제 운영 환경과 거의 동일하게 테스트하는 절차입니다.

### 1. 로컬 신뢰 SSL 인증서 발급 (`mkcert`)
로컬 환경에서 HTTPS를 사용하기 위해 `mkcert`로 신뢰할 수 있는 SSL 인증서를 생성합니다.

-   **백엔드용 인증서**:
    ```bash
    # 백엔드 프로젝트 내
    cd nginx/certs
    mkcert localhost
    ```
-   **프론트엔드용 인증서**:
    ```bash
    # 프론트엔드 프로젝트 루트
    mkcert localhost
    ```

### 2. 백엔드 서비스 실행
`docker-compose`를 사용하여 DB를 포함한 전체 백엔드 환경을 실행합니다.
```bash
docker-compose up -d --build
```

### 3. 로컬 데이터베이스 스키마 설정
`create-drop`과 같은 자동화 옵션은 개발 초기에는 편리하지만, 운영 환경과의 스키마 불일치 문제를 야기할 수 있습니다. 이를 방지하고 실제 운영 환경과 동일한 상태에서 개발하기 위해, 운영 DB 스키마를 기준으로 수동으로 DDL(Data Definition Language)을 적용하는 방식을 사용합니다.

이 과정이 다소 번거롭게 느껴질 수 있지만, 스키마 불일치로 인해 발생할 수 있는 잠재적인 버그를 원천 차단하는 매우 안정적이고 현명한 방식입니다.

1.  **운영 DDL 준비**: 먼저, 운영 데이터베이스로부터 최신 스키마를 `generate ddl`과 같은 기능을 통해 SQL 파일로 추출하여 준비합니다. (지금은 번거롭지만 추후 자동으로 어느 원격 저장소에 자동 저장하게 하는 식으로 리팩토링할 수 있겠습니다.)

2.  **DB 접속**: `mariadb -u root -p` 명령어로 Docker로 실행된 MariaDB 컨테이너에 접속합니다.

3.  **DDL 실행**: `use mydatabase;`로 데이터베이스를 선택한 후, 준비한 운영 DDL 스크립트를 실행하여 테이블을 생성합니다.
    > (이미 테이블이 있는 경우 `table already exists`와 같은 메시지가 표시될 수 있습니다. 이는 정상입니다.)

### 4. 프론트엔드 개발 서버 실행
1.  `.env.local` 파일의 `VITE_API_BASE_URL`을 `https://localhost`로 설정합니다.
2.  `pnpm install`로 의존성을 설치하고, `pnpm run dev`로 개발 서버를 실행합니다.

### 5. 통신 확인
브라우저 개발자 도구(F12)의 네트워크 탭을 열어 백엔드와 프론트엔드 간의 API 요청, 특히 SSE(Server-Sent Events) 연결(`subscribe`)이 정상적으로 수립되는지 확인합니다.

---

로컬 개발 환경 구성이 완료되면, 본격적인 개발을 시작하기 전에 아래의 가이드들을 먼저 읽어보시는 것을 강력히 권장합니다.

-   [**Git 컨벤션**](./01-git-convention.md): 원활한 협업을 위한 브랜치 및 커밋 규칙
-   [**API 설계 가이드라인**](./02-api-design.md): 일관성 있는 API 설계를 위한 규칙
