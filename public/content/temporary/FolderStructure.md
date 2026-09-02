# Pullit 백엔드 폴더 구조 가이드

이 문서는 Pullit 백엔드 저장소의 상위 구조와 각 영역이 담당하는 책임을 설명합니다. 신규 기여자가 코드를 탐색하거나 운영자가 문제를 진단할 때 필요한 큰 흐름을 먼저 짚고, 세부 폴더별 역할을 살펴볼 수 있도록 구성했습니다.

## 1. 저장소 큰 틀

| 범주 | 주요 경로 | 핵심 역할 |
| --- | --- | --- |
| **애플리케이션 소스** | `src/main/` | 런타임에 배포되는 Java 코드와 설정, 정적 리소스를 포함합니다. |
| **테스트 자산** | `src/test/` | 테스트 코드와 픽스처, 테스트 전용 설정 파일을 보관합니다. |
| **문서/가이드** | `docs/` | 인증, 테스트 전략, 폴더 구조 등 개발 문서를 모읍니다. |
| **운영 도구** | `tools/`, `scripts/` | 배포, 모니터링, Git 훅 등 반복 작업을 자동화하는 도구 모음입니다. |
| **환경 구성** | `config/`, `compose.yaml`, `docker-compose.*.yml`, `Dockerfile` | 코드 스타일, 애플리케이션 실행 환경, 컨테이너 구성을 정의합니다. |
| **빌드 메타데이터** | `build.gradle`, `settings.gradle`, `gradle/`, `gradlew*` | Gradle 플러그인, 의존성, 래퍼 스크립트를 관리합니다. |



## 2. 애플리케이션 소스 구조(`src/main`)

```
src/main
├── java/kr/it/pullit
│   ├── configuration/
│   ├── modules/
│   ├── platform/
│   └── shared/
├── resources/
│   ├── application*.yml
│   ├── db/
│   ├── static/openapi/
│   ├── logback-spring.xml
│   └── data.sql
└── groovy/
```

### 2.1 Java 패키지 계층

- `kr.it.pullit.configuration`
  - 전역 스프링 구성 요소가 위치합니다. ObjectMapper, SpringDoc, WebMvc 설정처럼 외부 라이브러리와의 결합부를 여기서 선언합니다.
- `kr.it.pullit.modules`
  - 서비스 도메인을 기능별 모듈로 나눈 공간입니다.
  - 각 모듈은 보통 `api`, `domain`, `service`, `web`, `event`, `exception` 패키지를 포함하며, 모듈 내부에서 필요한 DTO·엔티티·헬퍼를 자체적으로 관리합니다.
  - 예: `modules.questionset`은 문제집의 문제생성/문제채점 API를 모두 캡슐화합니다.
- `kr.it.pullit.platform`
  - 여러 모듈이 공유하는 인프라 레이어입니다.
  - 인증/보안, AOP, 외부 통신 클라이언트, 파일 스토리지, 메시징 등 재사용 가능한 기술 컴포넌트를 제공합니다.
  - 패키지 예시는 `platform.security`, `platform.web`, `platform.storage` 등입니다.
- `kr.it.pullit.shared`
  - 전역 상수, 유틸리티, 베이스 추상 클래스를 모읍니다.
  - 공통 예외(`ErrorCode`), 식별자 생성기, 페이징 응답, API 테스트 베이스 등이 포함됩니다.

### 2.2 리소스 폴더

- `application.yml`, `application-qa.yml`, `application-prod.yml`
  - 스프링 프로필별 환경 설정을 정의합니다. 공통 설정은 기본 파일에, QA·운영 차이는 각 프로필 파일에 기술합니다.
- `db/init/`, `db/migration/`
  - 초기 데이터 삽입 스크립트와 Flyway 마이그레이션 스크립트를 분리해 관리합니다.
- `static/openapi/`
  - 공개 REST API 명세(JSON/YAML)와 기타 정적 문서를 제공합니다.
- `logback-spring.xml`
  - 로깅 패턴, 로그 레벨, 로그 전송 설정을 정의합니다.
- `data.sql`
  - 로컬 개발 또는 간단한 시연을 위한 기본 데이터 시드를 제공합니다.

### 2.3 Groovy 소스

- `src/main/groovy`
  - 빌드 스크립트 확장이나 DSL 작성 시 사용하는 선택적 공간입니다. 현재는 Gradle 커스텀 스크립트와 테스트 픽스처 보조 코드가 위치할 수 있습니다.

## 3. 테스트 자산 구조(`src/test`)

```
src/test
├── java/kr/it/pullit
│   ├── modules/
│   ├── platform/
│   └── support/
├── resources/
└── groovy/
```

- `java/kr/it/pullit/modules`
  - 실서비스 모듈과 동일한 패키지 경로를 사용해 단위·통합 테스트를 배치합니다.
  - 컨트롤러 테스트, 서비스 테스트, 리포지토리 테스트가 모듈 경계 안에 자연스럽게 모이도록 합니다.
- `java/kr/it/pullit/platform`
  - 보안 필터, 공통 AOP, 스토리지 어댑터 등 플랫폼 레이어 테스트가 위치합니다.
- `java/kr/it/pullit/support`
  - 테스트 지원 패키지입니다. 
  - `annotation`에는 `@UnitTest`, `@MvcSliceTest`와 같이 테스트 슬라이스를 빠르게 구성하는 메타 어노테이션이 있습니다.
  - `builder`, `fixture`는 엔티티/DTO 생성을 도와주는 헬퍼입니다.
  - `security`는 인증이 필요한 테스트를 위한 Mock 토큰 발급기, 필터 비활성화 유틸을 제공합니다.
- `resources/`
  - 테스트 시나리오 전용 설정(예: `application-test.yml`)과 샘플 JSON, SQL 데이터를 담습니다.
- `groovy/`
  - Spock 기반 테스트나 Groovy DSL로 작성한 테스트 도우미가 필요할 때 사용합니다.

## 4. 문서 & 운영 지원 폴더

- `docs/`
  - 개발 지식 축적 공간입니다. 인증 가이드, 테스트 전략, 폴더 구조와 같은 내부 문서를 이곳에서 관리합니다.
  - 문서 간 교차 링크를 유지하여, 신규 온보딩 시 필요한 정보를 빠르게 찾도록 합니다.
- `scripts/`
  - `pre-push`, `checkcheck.sh` 등 반복되는 검사·배포 작업을 자동화하는 쉘 스크립트를 제공합니다.
- `tools/`
  - 런타임 부가 도구를 포함합니다. 예: `tools/sentry-agent/`에는 운영 환경에서 Sentry APM을 붙일 때 사용하는 OpenTelemetry 에이전트가 있습니다.

## 5. 환경 & 배포 구성

- `config/`
  - Checkstyle, Spotless 같은 정적 분석/코드 포맷터 설정을 저장합니다.
- `compose.yaml`, `docker-compose.qa.yml`, `docker-compose.prod.yml`
  - 로컬 개발과 QA/운영 환경을 위한 Docker Compose 파일입니다. 필요한 인프라(데이터베이스, 메시지 브로커 등)를 정의합니다.
- `Dockerfile`
  - 백엔드 애플리케이션 단일 컨테이너 빌드를 위한 지침을 제공합니다.
- `deploy-qa.sh`
  - QA 배포 자동화를 위한 스크립트 예시입니다. 환경 변수 로딩, Gradle 빌드, Docker 이미지 푸시/배포 흐름을 포함할 수 있습니다.

## 6. 문서 유지보수 팁

1. 새로운 모듈 또는 플랫폼 패키지를 추가하면 해당 책임과 하위 패키지 구성을 이 문서에 반영합니다.
2. 데이터베이스 마이그레이션 경로나 정적 자산 위치가 변경되면 `resources` 섹션을 업데이트하세요.
3. 테스트 지원 유틸리티(`src/test/java/kr/it/pullit/support`)가 확장되면 사용법을 `docs/Test-Strategy-Guide.md`와 함께 기록해 온보딩 비용을 줄입니다.
4. 컨테이너 구성(Docker/Compose)이나 배포 스크립트에 구조적 변화가 있을 경우 `환경 & 배포 구성` 섹션을 최신 상태로 유지합니다.
