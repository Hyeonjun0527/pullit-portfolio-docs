# 배포 전략 및 운영 가이드

> **과거 운영 기록:** 이 문서의 `pull.it.kr`, `api.pull.it.kr`, `qa.api.pull.it.kr` 인프라 설명은 현재 복구 대상이 아닙니다. 현재 표준 공개 경로는 `https://portfolio.yeon.world/pull-it`입니다. 기존/현재 도메인 설정을 이 절차로 생성·삭제·변경하지 마세요.

이 문서는 Pullit 백엔드의 배포 방식을 온보딩 관점에서 설명합니다. 초기에 어떤 인프라 조합을 검토했는지, 최종적으로 선택한 아키텍처가 무엇인지, 그리고 현재 운영 환경을 유지하기 위해 따라야 하는 절차를 정리했습니다. 실사용자가 많지 않은 단계에서 비용과 학습 목표를 모두 만족시키기 위해 **로컬 빌드 → 컨테이너 레지스트리 → EC2 실행**이라는 단순하고 예측 가능한 플로우를 채택했습니다.

## 1. 후보 스택 비교와 의사결정 과정

### 1.1 1차 후보군 정리

| 분류 | 대표 조합 | 특징 |
| --- | --- | --- |
| "가장 단순/입문" | S3 + CloudFront + Elastic Beanstalk, 또는 S3 + CloudFront + EC2 | 빠르게 시작할 수 있지만 백엔드 확장성과 학습 과제가 제한적 | 
| Amplify 기반 | Amplify + Elastic Beanstalk, 혹은 Amplify + ECS | 프런트 자동 배포는 편리하지만 커스터마이징과 디버깅 경험이 부족 | 
| ECS(Fargate/EC2) | CloudFront + ECS + ALB + ECR | 컨테이너 표준에 가깝고 확장성 우수 |
| 서버리스 | API Gateway + Lambda, Amplify + AppSync | 운영 부담은 줄지만 기존 Spring 생태계와 괴리가 큼 | 
| EKS | CloudFront + EKS + ALB | 멀티서비스 운영에는 적합하나 초기 학습 비용이 큼 |
| CodeDeploy/수동 Docker | GitHub Actions + CodeDeploy + EC2 | 배포 자동화는 가능하지만 관리 포인트가 많음 | 
| Lightsail | Lightsail + Route53 | 매우 저렴하지만 고급 네트워크 구성 제약이 큼 |
| App Runner | Amplify + App Runner | 서버 관리가 거의 없지만 세밀한 Nginx 학습이 어려움 | 

### 1.2 선택 기준

- **비용**: 실제 사용자 수가 적은 단계라서 고정비가 큰 매니지드 서비스는 보류했습니다.
- **학습 목표**: Nginx 리버스 프록시, HTTPS, Docker Compose 운영 경험을 직접 쌓는 것이 우선 순위였습니다.
- **단계적 확장성**: 사용자가 늘어나면 ECS/ALB/RDS를 도입할 수 있도록, 컨테이너 이미지를 중심으로 한 구조를 유지했습니다.

### 1.3 최종 결론

- **프런트엔드**는 팀원이 선호하는 Vercel을 사용합니다.
- **백엔드**는 "로컬 빌드 → Docker Hub → EC2" 흐름을 기준으로 합니다.
- **리버스 프록시**는 EC2에 설치한 Nginx가 담당하며, HTTPS와 Basic Auth로 보호합니다.
- **데이터베이스**는 초기에는 컨테이너 기반 MariaDB를 사용하고, RDS는 사용자 증가 이후로 미룹니다.

## 2. 과거 경험에서 나온 제약 사항

| 과거 스택 | 관찰한 문제 | 현재 전략에 반영한 점 |
| --- | --- | --- |
| Amplify | 설정 난도가 높고 디버깅 경험이 부족 | 프런트 배포는 Vercel에 위임 |
| Jenkins + Lightsail | Jenkins가 풀링 방식으로 리소스를 많이 사용, Lightsail은 확장성이 낮음 | GitHub Actions와 수동 스크립트로 대체 |
| QA/운영 완전 분리 | 코드·데이터가 지나치게 벌어져 핫픽스가 오래 걸림 | 초기에는 **단일 서버**만 운영, 환경 변수가 QA/운영을 모두 커버하도록 설계 |
| RDB 도입 | 고정비와 관리 비용이 빠르게 증가 | Docker Compose로 로컬/서버 모두 동일한 MariaDB 사용 |
| ALB 실습 | 인증/인가 설정에 많은 시간이 필요했고 학습 대비 효용이 낮음 | Nginx에서 SSL, 헤더 전달, SSE 설정을 직접 학습 |

## 3. 현재 배포 아키텍처

```
개발자 노트북
  └─ ./deploy-qa.sh (이미지 빌드 & 푸시)
      └─ Docker Hub 레포지토리 (latest, SHA 태그)
          └─ EC2 (Ubuntu)
              ├─ docker compose -f docker-compose.qa.yml up -d
              │   ├─ pullit-qa-app (Spring Boot)
              │   └─ pullit-qa-db (MariaDB 10.11)
              └─ Nginx (80/443 → 127.0.0.1:8080 프록시)
```

- **멀티 스테이지 Dockerfile**은 Gradle 캐시를 최대화하고, 런타임 컨테이너를 `amazoncorretto:21-alpine`으로 최소화합니다.
- `docker-compose.qa.yml`은 앱 컨테이너와 DB 컨테이너를 하나의 브리지 네트워크로 묶고, 앱 포트를 `127.0.0.1:8080`에만 노출해 외부에서 직접 접근하지 못하도록 막습니다.
- EC2는 오직 이미지를 pull 해서 실행만 하며, 빌드 도구(Gradle, JDK)는 EC2에 설치하지 않습니다.

## 4. 빌드 및 배포 절차

1. **사전 준비**
   - 로컬 `.env` 혹은 셸에서 `DOCKER_IMAGE_NAME`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `GEMINI_API_KEY` 등 필수 환경 변수를 로드합니다.
   - Docker Hub에 사전에 레포지터리를 생성하고 로그인합니다.
2. **이미지 빌드 & 푸시**
   - `./deploy-qa.sh`를 실행하면 현재 커밋 SHA와 `latest` 태그를 동시에 빌드합니다.
   - 스크립트는 성공 후 EC2에서 실행할 명령어 목록을 출력합니다.
3. **EC2에서 컨테이너 실행**
   - EC2에 SSH 접속 → `docker login` → 스크립트가 출력한 `export` 명령어를 실행해 환경 변수를 주입합니다.
   - `docker compose -f docker-compose.qa.yml pull`로 이미지를 받아오고 `up -d`로 기동합니다.
4. **헬스 체크 & 로그 확인**
   - `docker compose -f docker-compose.qa.yml ps` 혹은 `curl http://localhost:8080/actuator/health`로 상태를 확인합니다.
   - 실패 시 `docker logs pullit-qa-app` 또는 `docker logs pullit-qa-db`를 확인합니다.

> **Tip**: 서버에서 이미지를 교체할 때는 `docker compose pull` 후 `docker compose up -d`만 실행하면 됩니다. 필요 시 `docker compose down`으로 중단 후 볼륨은 그대로 유지할 수 있습니다.

## 5. 환경 분리 정책

- 현재는 **단일 EC2**에서 QA/운영 역할을 겸합니다. 도메인이 `qa.api.pull.it.kr`이지만 실제 운영 트래픽이 해당 서버로 들어옵니다.
- 환경별 차이는 **환경 변수 조합**으로 제어합니다. 예를 들어 `SPRING_PROFILES_ACTIVE=qa`를 유지하되, `JWT_REDIRECT_URL`이나 `ACCESS_CONTROL_ALLOWED_ORIGINS` 등은 운영 도메인 기준으로 설정합니다.
- 사용자 수가 증가하거나 블루/그린 배포가 필요해지면 다음 순서로 확장을 고려합니다.
  1. Docker Hub에 버전 태그 관리 강화 및 자동화(예: GitHub Actions).
  2. 별도 QA EC2 인스턴스 도입 후 ALB 혹은 Route 53 가중치 라우팅.
  3. RDS, ElastiCache 등 매니지드 스토리지로 이전.

## 6. 네트워크, DNS, HTTPS 구성

1. **도메인 위임**
   - 가비아에서 `pull.it.kr` 도메인을 구매하고, 기본 NS를 Vercel(NS1/NS2)로 설정합니다.
   - `api.pull.it.kr` 서브도메인에 대해서만 Route 53의 NS 4개를 위임해 백엔드 전용 Hosted Zone을 운영합니다.
   - `qa.api.pull.it.kr` A 레코드는 EC2의 Elastic IP를 가리킵니다. (Elastic IP를 사용하지 않으면 인스턴스 재기동 시 IP가 바뀔 수 있으니 주의하세요.)
2. **Nginx 리버스 프록시**
   - `/etc/nginx/conf.d/api-qa.pull.it.kr.conf`에서 80/443 포트를 열고, `proxy_pass http://127.0.0.1:8080`으로 백엔드 컨테이너에 트래픽을 전달합니다.
   - SSE를 위해 `proxy_http_version 1.1`, `proxy_set_header Connection ""` 등 헤더를 명시합니다.
3. **HTTPS & Basic Auth**
   - `sudo certbot --nginx -d qa.api.pull.it.kr` 명령으로 TLS 인증서를 발급하고 자동 갱신을 설정합니다.
   - 외부 노출 범위를 제한하기 위해 `auth_basic`과 `htpasswd`로 베이직 인증을 적용했습니다. 실사용자 유입 시에는 별도 WAF 혹은 인증 체계를 검토해야 합니다.
4. **문제 해결 팁**
   - Nginx 설정 변경 후에는 `sudo nginx -t`로 문법 체크 → `sudo systemctl reload nginx` 혹은 stop/start로 적용합니다.
   - HTTP 502/504가 발생하면 `access.log`, `error.log`를 확인해 프록시 포워딩 여부를 추적합니다.

## 7. 서버 초기 세팅 요약 (Ubuntu)

1. 패키지 업데이트 및 zsh, htop 등 기본 도구 설치
2. Docker 공식 저장소 추가 후 `docker-ce`, `docker-compose-plugin` 설치
3. Nginx 설치 및 서비스 등록
4. 선택: `oh-my-zsh`, `zsh-autosuggestions`, `zsh-syntax-highlighting`으로 셸 환경 통일
5. (처음 한 번) `mkcert`, `certbot` 등 HTTPS 관련 도구 설치
6. `docker` 그룹에 사용자 추가 후 재로그인 (`sudo usermod -aG docker $USER`)

## 8. 앞으로의 확장 시나리오

| 트리거 | 대응 전략 |
| --- | --- |
| 동시 접속자 증가 | ALB + ECS(Fargate)로 이전하여 오토스케일 도입 |
| 데이터 정합성/백업 요구 | Amazon RDS(MariaDB) + 정기 스냅샷 |
| 다중 환경 필요 | 별도 QA 스택 구축 후 GitHub Actions에서 환경별 compose 파일 배포 |
| 배포 자동화 필요 | GitHub Actions 워크플로로 Docker 빌드/푸시/원격 명령 실행 자동화 |

현재 구성은 "가볍게 시작하되, 컨테이너 이미지를 중심으로 언제든지 확장"을 목표로 설계했습니다. 신규 기여자는 위 절차를 따라 최초 배포를 경험한 뒤, 필요한 영역을 자동화하거나 고도화하면 됩니다.
