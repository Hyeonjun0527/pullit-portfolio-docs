# 초기 세팅 가이드 (macOS/Windows/Linux 공통)

> **과거 개발 기록:** 이 문서에 나오는 `local.pull.it.kr`와 QA API 도메인은 이전 개발 환경의 예시입니다. 현재 포트폴리오 복구 환경의 공개 경로는 `https://portfolio.yeon.world/pull-it`이며, 이 문서의 DNS·도메인 지시를 현재 설정에 적용하지 마세요.

이 가이드는 Backend Tech Spec에 정리된 개발 환경 기준을 바탕으로 Pullit 백엔드 저장소를 처음 받았을 때 해야 할 작업을 운영체제별로 안내합니다. macOS, Windows(PowerShell 또는 WSL2), Linux(Ubuntu/Debian 계열)를 모두 지원하며, 동일한 개발 스택을 구성해 팀 규칙을 준수할 수 있도록 순서와 검증 방법을 제공합니다.

## 0. 빠른 시작 요약표

| 단계 | macOS | Windows (PowerShell) | Windows (WSL2) / Linux |
| --- | --- | --- | --- |
| 필수 도구 설치 | `brew install openjdk@21 docker git`<br>`brew install --cask intellij-idea` | `winget install --id=EclipseAdoptium.Temurin.21.JDK`<br>`winget install --id=Git.Git`<br>`winget install --id=JetBrains.IntelliJIDEA.Ultimate` | `sudo apt update && sudo apt install openjdk-21-jdk git docker.io docker-compose-plugin`<br>IntelliJ는 snap 또는 tar.gz |
| 저장소 클론 | `git clone git@github.com:your-org/Team2_BE.git` | 동일 | 동일 |
| Gradle Wrapper 확인 | `./gradlew --version` | `./gradlew.bat --version` | `./gradlew --version` |
| Git 훅 동기화 | `./gradlew updateGitHooks` | `./gradlew.bat updateGitHooks` | `./gradlew updateGitHooks` |
| 로컬 DB 기동 | `docker compose up -d mariadb` | 동일 | 동일 (WSL은 Docker Desktop 공유) |
| 애플리케이션 실행 | `./gradlew bootRun` | `./gradlew.bat bootRun` | `./gradlew bootRun` |

> Windows에서 PowerShell 스크립트 실행 정책이 차단되면 `Set-ExecutionPolicy RemoteSigned` 후 다시 시도하세요. WSL2 사용자는 Docker Desktop에서 *Use the WSL 2 based engine*을 활성화해야 합니다.

## 1. 필수 도구 설치

### 1.1 공통 요구 사항 체크

| 확인 항목 | 권장 버전 | 점검 명령 |
| --- | --- | --- |
| JDK | 21 | `java -version`
| Gradle Wrapper | 동봉된 `gradlew` 사용 | `./gradlew --version` 또는 `./gradlew.bat --version`
| Docker & Docker Compose | 최신 | `docker --version`, `docker compose version`
| IntelliJ IDEA | 2023.3 이상 (Ultimate 권장) | `Help > About`
| Git | 2.40 이상 | `git --version`

IntelliJ 대신 다른 IDE를 사용할 수 있지만 Lombok annotation processing, Google Java Format, Checkstyle을 직접 설정해야 합니다.

### 1.2 macOS 설치 팁

```bash
# Homebrew 설치 후 실행
brew install openjdk@21 docker git
brew install --cask intellij-idea
```

- `/Library/Java/JavaVirtualMachines/openjdk-21.jdk` 심볼릭 링크를 추가하면 IntelliJ에서 JDK 21을 쉽게 선택할 수 있습니다.
- Docker Desktop을 처음 실행한 뒤 “Running” 상태인지 확인합니다.

### 1.3 Windows 설치 팁

#### 옵션 A: PowerShell + Docker Desktop

```powershell
# Windows 11 기준 Winget 사용
winget install --id=EclipseAdoptium.Temurin.21.JDK
winget install --id=Git.Git
winget install --id=JetBrains.IntelliJIDEA.Ultimate
```

- Docker Desktop은 공식 사이트에서 설치하고, Hyper-V/WSL2 옵션을 활성화합니다.
- PowerShell에서 `Set-ExecutionPolicy RemoteSigned` 실행 후 `gradlew` 스크립트를 사용할 수 있습니다.
- 필요 시 `./gradlew` 대신 `./gradlew.bat` 또는 `gradlew.bat`를 사용합니다.

#### 옵션 B: WSL2 (Ubuntu)

1. Windows 기능에서 WSL2를 활성화하고 Microsoft Store의 Ubuntu를 설치합니다.
2. WSL 터미널에서 [1.4 Linux 설치 팁](#14-linux-설치-팁)을 그대로 따릅니다.
3. Docker Desktop 설정에서 *Use the WSL 2 based engine*을 체크하면 WSL에서도 `docker compose`가 동작합니다.

### 1.4 Linux 설치 팁

```bash
# Ubuntu/Debian 예시
sudo apt update
sudo apt install openjdk-21-jdk git docker.io docker-compose-plugin
sudo snap install intellij-idea-ultimate --classic
```

- `docker`를 일반 사용자로 실행하려면 `sudo usermod -aG docker $USER` 후 재로그인합니다.
- 다른 배포판은 적절한 패키지 매니저(yum, pacman 등)를 사용하세요.

## 2. 저장소 클론과 기본 스크립트

1. 저장소를 원하는 경로에 클론합니다.
   - macOS/Linux/WSL: `git clone git@github.com:your-org/Team2_BE.git`
   - Windows PowerShell: `git clone git@github.com:your-org/Team2_BE.git`
2. 루트 디렉터리에서 Gradle Wrapper가 정상 동작하는지 확인합니다.
   - macOS/Linux/WSL: `./gradlew --version`
   - Windows PowerShell: `./gradlew.bat --version`
3. 사내 공통 Git 훅을 설치합니다.
   - macOS/Linux/WSL: `./gradlew updateGitHooks`
   - Windows PowerShell: `./gradlew.bat updateGitHooks`
4. `./scripts/pre-push` 훅은 `codeCheck`를 실행하므로, 커밋 전 포맷팅과 Checkstyle을 항상 통과하게 됩니다.

## 3. IntelliJ 프로젝트 설정

1. **Import 방식**: `File > Open`으로 저장소 루트를 선택하고 Gradle 프로젝트로 임포트합니다.
2. **JDK 지정**: `File > Project Structure > SDKs`에서 JDK 21을 등록한 뒤 Project SDK/Language Level을 21로 맞춥니다.
3. **Annotation Processing**: `Settings > Build, Execution, Deployment > Compiler > Annotation Processors`에서 *Enable annotation processing*을 켜 Lombok을 활성화합니다.
4. **코드 스타일 플러그인**
   - Checkstyle-IDEA 플러그인 설치 후 `config/checkstyle/google_checks.xml`을 등록합니다.
   - google-java-format 플러그인을 설치하고 문서에 안내된 VM 옵션을 추가 후 IDE를 재시작합니다.
5. **Gradle Delegation**: `Settings > Build, Execution, Deployment > Build Tools > Gradle`에서 *Build and run using* 옵션을 Gradle로 설정합니다.
6. **라인 엔딩**: `Settings > Editor > Code Style > Line Separator`를 `LF`로 설정하면 플랫폼 간 커밋 차이를 줄일 수 있습니다.

## 4. 환경 변수와 `.env` 구성

Backend Tech Spec의 *Secrets* 섹션에 운영팀이 관리하는 표준 `.env` 템플릿이 있습니다. 로컬 개발자는 해당 템플릿을 받아 개인 워크스테이션에 설치하고, 팀 규칙에 따라 프로필별 파일을 나눠 보관합니다.

1. **템플릿 확보**: Tech Spec에서 제공하는 최신 `.env.local` 스니펫을 복사하거나, 슬랙 `#pullit-backend` 채널의 고정 메시지에서 압축 파일을 내려받습니다. 민감 정보이므로 사내 저장소 외부(개인 깃 등)에 업로드하지 않습니다.
2. **루트에 배치**: 프로젝트 루트에서 빈 파일을 만든 뒤 템플릿 내용을 붙여 넣습니다.
   - macOS/Linux/WSL: `touch .env`
   - Windows PowerShell: `ni .env -ItemType File`
   이후 선호하는 에디터로 파일을 열어 붙여 넣고 저장합니다. 저장 후 `.env`가 Git에 추적되지 않는지 `git status`로 확인합니다 (`.gitignore`가 기본적으로 무시합니다).
3. **프로필 분리**: QA 또는 운영 연결이 필요한 경우 `.env.qa`, `.env.prod`처럼 파일을 나누고 `SPRING_PROFILES_ACTIVE` 환경 변수와 함께 사용합니다. 배포 스크립트(`deploy-qa.sh`)는 실행 전에 필요한 키가 있는지 검증하므로, CI/CD 비밀 저장소(예: GitHub Actions secrets)에 동일한 값을 세팅해야 합니다.
4. **변경 사항 점검**: 민감 값이 바뀌면 `./gradlew openApiGenerate` 또는 `./gradlew bootRun` 실행 전 `source .env`(macOS/Linux/WSL) 또는 `Get-Content .env | foreach { if ($_ -match '^(.*?)=(.*)$') { [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2]) } }`(PowerShell)로 환경 변수에 반영합니다. IDE에서 Run Configuration을 만들 때도 `.env` 경로를 Environment variables 파일로 등록하면 동일한 구성을 재사용할 수 있습니다.
5. **보안 수칙**: `.env` 파일은 로컬 전용입니다. PR이나 이슈에 값을 붙여 넣지 말고, 노출 시 즉시 키를 폐기하고 Tech Spec에 있는 교체 절차(키 재발급, S3 버킷 정책 점검 등)를 따라야 합니다.

> 운영 환경에 필요한 키는 반드시 사내 비밀 저장소를 통해 배포되며, 로컬 `.env`는 참고용 기본값만 포함합니다. 세부 키 목록은 Tech Spec을 확인하고 필요 시 운영팀에 문의하세요.

## 5. 로컬 인프라 기동

1. MariaDB 컨테이너를 시작합니다.
   - macOS/Linux/WSL: `docker compose up -d mariadb`
   - Windows PowerShell: `docker compose up -d mariadb`
   - Docker Compose V1을 사용한다면 `docker-compose up -d mariadb`
2. 실행 상태 확인: `docker compose ps` 또는 `docker ps`
3. 로그 확인: `docker compose logs mariadb`
4. 초기 데이터: `local` 프로필에서는 `src/main/resources/data.sql`이 자동 실행되어 기본 계정과 샘플 데이터가 적재됩니다.

## 6. 애플리케이션 실행과 검증

1. 애플리케이션 실행
   - macOS/Linux/WSL: `./gradlew bootRun`
   - Windows PowerShell: `./gradlew.bat bootRun`
   - 다른 프로필을 사용하려면 `--args='--spring.profiles.active=qa'`를 추가합니다.
2. 품질 검사
   - macOS/Linux/WSL:
     ```bash
     ./gradlew test
     ./gradlew codeCheck
     ```
   - Windows PowerShell:
     ```powershell
     ./gradlew.bat test
     ./gradlew.bat codeCheck
     ```
3. OpenAPI 스펙 생성: `./gradlew openApiGenerate` (Windows는 `.\gradlew.bat openApiGenerate`). 실행 시 `.env` 값을 읽고 임시로 8088 포트를 사용합니다.
4. Flyway 마이그레이션을 수동으로 검증하려면 `./gradlew flywayMigrate -i`를 실행합니다. 기본 `local` 프로필에서는 Hibernate가 스키마를 생성하지만, QA/운영에서는 Flyway가 스키마를 관리합니다.
5. 실행 확인: `http://localhost:8080/actuator/health`에 접속하거나 `./gradlew bootRun` 로그에서 `Started PullitApplication` 메시지를 확인합니다.

## 7. 로컬 HTTPS 구성

Backend Tech Spec에서 정한대로 개발 환경도 HTTPS를 기본값으로 사용합니다. 다음 단계를 따르면 macOS, Windows, Linux 어디서든
`https://localhost` 기반으로 프런트엔드와 백엔드를 구동할 수 있습니다.

> `localhost`는 최신 브라우저가 기본적으로 “안전한 컨텍스트”로 취급하므로 CORS, Secure 쿠키, SameSite=None 제약을 최소화할 수
> 있습니다. 기존 `local.pull.it.kr`보다 설정이 간단해 팀 전체가 동일한 도메인으로 개발할 수 있습니다.

### 7.1 mkcert 설치 및 로컬 CA 등록 (PC 최초 1회)

`mkcert`는 로컬 개발용 인증서를 안전하게 발급하는 도구입니다. 한 번 설치하고 `mkcert -install`을 실행하면 각 운영체제의 신뢰할 수
있는 루트 인증서 저장소에 로컬 CA가 등록됩니다.

- **macOS**
  ```bash
  brew install mkcert
  mkcert -install
  ```
- **Windows (관리자 PowerShell)**
  ```powershell
  Set-ExecutionPolicy Bypass -Scope Process -Force; \
  [System.Net.ServicePointManager]::SecurityProtocol = \
    [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; \
  iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

  choco install mkcert
  mkcert -install
  ```
- **Linux (Debian/Ubuntu)**
  ```bash
  sudo apt update && sudo apt install libnss3-tools
  wget -O mkcert https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
  chmod +x mkcert
  sudo mv mkcert /usr/local/bin/
  mkcert -install
  ```

### 7.2 프로젝트별 인증서 생성

HTTPS가 필요한 프로젝트 루트에서 다음 명령을 실행하면 `localhost.pem`과 `localhost-key.pem`이 생성됩니다. 동일한 파일을 프런트엔드
와 백엔드가 공유해야 쿠키와 CORS 설정이 일관되게 동작합니다.

```
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost
```

### 7.3 프런트엔드 적용 (참고)

생성된 `.pem` 파일 두 개를 프런트엔드 저장소 루트에 복사하면 Vite 개발 서버에서 HTTPS를 사용할 수 있습니다. 기존
`local.pull.it.kr` 대신 `https://localhost:5173`을 기본 도메인으로 쓰는 것을 권장합니다.

### 7.4 백엔드 적용 (Spring Boot)

1. `.pem` 파일을 `keystore.p12`로 변환합니다. Windows는 Git Bash에서 `openssl`을 실행하면 편합니다.
   ```bash
   openssl pkcs12 -export \
     -in localhost.pem \
     -inkey localhost-key.pem \
     -out keystore.p12 \
     -name springboot \
     -passout pass:<비밀번호>
   ```
2. 생성된 `keystore.p12`를 `src/main/resources/`로 이동합니다.
3. `application-local.yml`을 만들거나 수정해 다음 설정을 추가합니다.
   ```yaml
   server:
     ssl:
       enabled: true
       key-store-type: PKCS12
       key-store: classpath:keystore.p12
       key-alias: springboot
       key-store-password: <비밀번호>
   ```
   > 비밀번호는 `openssl` 명령에서 사용한 값과 동일해야 합니다.

이제 애플리케이션을 `local` 프로필로 실행하면 `https://localhost:8080`에서 응답합니다. 동일한 인증서를 공유하면 로컬 프런트엔드와 QA
백엔드 간 HTTPS 호출도 안정적으로 작동합니다.

### 7.5 개발 도구 및 브라우저 점검

- **Insomnia**: `Application > Preferences > Request`에서 *Validate certificates* 옵션을 비활성화하면 로컬 인증서로도 요청을 보낼
  수 있습니다. 인솜니아 워크스페이스는 주기적으로 Pull 동기화를 수행해 최신 엔드포인트를 반영하세요.
- **Chrome 인증서 확인**: `설정 > 개인정보 보호 및 보안 > 보안 > 인증서 관리`에서 `mkcert development CA`가 신뢰되는지 확인합니다.
- **맥에서 접근 불가할 때**: 시스템 키체인에 `localhost` 인증서를 수동으로 신뢰하도록 설정하면 대부분 해결됩니다.

### 7.6 연결 확인 체크리스트

- 브라우저에서 `https://localhost:5173`(프런트)와 `https://localhost:8080/actuator/health`(백엔드)에 접근해 경고 없이 열리는지 확인합니다.
- 프런트엔드에서 QA 백엔드 호출이 필요하다면 `.env`의 API 베이스 URL을 `https://qa-api.pull.it.kr` 등으로 지정하고 동일한 인증서를 재
  사용해 교차 통신을 확인합니다.
- Insomnia 요청 URL도 모두 `https://`로 업데이트하고, QA/로컬 전환 시 `Host` 헤더가 정확한지 점검합니다.

## 8. 프로필 및 배포 스크립트 활용

- **로컬 개발**: 기본 프로필은 `local`이며 DevTools, p6spy가 활성화됩니다.
- **QA 점검**: `SPRING_PROFILES_ACTIVE=qa` 환경 변수와 QA용 `.env.qa`를 사용하고, `docker-compose.qa.yml`로 QA 인프라를 기동합니다.
- **배포 스크립트**: `deploy-qa.sh`는 필요한 환경 변수를 점검하므로 실행 전 `export` 상태를 확인하세요.
- **테스트 지원**: 통합 테스트는 H2 및 `WithMockMember` 유틸을 활용해 인증을 대체합니다. 로컬에서 전체 테스트를 실행할 때 Docker가 필요하지는 않지만, DB 통합 테스트는 MariaDB가 떠 있어야 합니다.

## 9. 자주 발생하는 문제 해결

- **JDK 인식 실패**
  - macOS/Linux/WSL: `export JAVA_HOME=$(/usr/libexec/java_home -v21)` 또는 배포판별 JDK 경로를 확인합니다.
  - Windows: `System Properties > Environment Variables`에서 `JAVA_HOME`을 JDK 21 설치 경로로 설정합니다.
- **Docker 연결 오류**
  - Docker Desktop이 실행 중인지 확인하고, Linux/WSL은 `sudo service docker start` 후 `docker ps`로 점검합니다.
- **포트 충돌**
  - `8080` 또는 `3306` 포트가 사용 중이라면 해당 프로세스를 종료하거나 `application-local.yml`에서 포트를 임시 변경합니다.
- **DB 인증 실패**
  - `docker compose logs mariadb`로 로그를 확인하고 `.env`의 계정 정보가 `compose.yaml`과 일치하는지 검증합니다.
- **OAuth 리다이렉트 오류**
  - 로컬 프런트엔드 주소가 `JWT_REDIRECT_URL_*` 목록에 포함되어 있는지 확인합니다.
- **정적 리소스 핫 리로드 지연**
  - 루트에서 `touch .reloadtrigger` (Windows PowerShell은 `ni .reloadtrigger -Force`)로 DevTools 재시작을 트리거합니다.
- **권한 문제 (Windows/WSL)**
  - Git 클론 후 `chmod +x gradlew` 또는 PowerShell에서 `Set-ExecutionPolicy`를 조정하여 실행 권한을 부여합니다.
- **OpenAPI 생성 실패**
  - 8088 포트를 다른 프로세스가 점유하고 있지 않은지 확인하고, `.env`에 필수 키가 있는지 검증합니다.

이 문서를 따라 macOS, Windows, Linux 어디서든 동일한 설정으로 Pullit 백엔드 개발을 시작할 수 있습니다. 추가 세부 사항은 Backend Tech Spec과 각 세부 가이드를 참고하세요.
