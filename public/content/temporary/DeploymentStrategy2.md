# 배포 전략 가이드

> **과거 운영 기록:** 이 문서의 `*.pull.it.kr` 인프라와 `deploy-qa.sh` 절차는 이전 환경을 설명합니다. 현재 복구 환경에서는 새 DNS·인증서를 만들거나 기존 것을 변경하지 않고 `https://portfolio.yeon.world/pull-it`의 경로 프록시와 `docker-compose.prod.yml`을 사용합니다.

이 문서는 Pullit 백엔드가 어떤 배포 옵션을 비교했는지, 왜 현재의 인프라 구성을 선택했는지를 정리한 온보딩 자료입니다. 초기 사용자 수가 적은 단계에서도 운영 복잡도를 제어하면서 Nginx, Docker, HTTPS 등 필수 학습 목표를 달성할 수 있도록 설계했습니다.

## 1. 배경과 문제의식

- 실제 이용자가 거의 없는 상태에서 다중 환경(QA, 운영)을 모두 유지하면 비용과 운영 부담이 커집니다.
- 이전 프로젝트에서 Jenkins, Lightsail, 별도 QA 서버를 병행했을 때 잦은 충돌과 인프라 편차로 시간 낭비가 발생했습니다.
- 이번 프로젝트의 우선순위는 **최소 비용**, **Nginx 기반 학습**, **컨테이너 표준 파이프라인 습득**입니다.

## 2. 검토했던 배포 옵션

다음 표는 프로젝트 킥오프 시점에 검토했던 대표 조합과 보류 사유입니다.

| 분류 | 조합 | 장점 | 보류 사유 |
| --- | --- | --- | --- |
| 가장 단순/입문 | S3+CloudFront(프론트) + Elastic Beanstalk(백엔드)<br>S3+CloudFront + EC2<br>Amplify + Elastic Beanstalk | 빠르게 시작 가능, 관리 편의성 | EB/Amplify 경험상 커스터마이징 한계. EC2 직접 운용은 학습 대비 효용 불확실 |
| 컨테이너 표준(ECS) | Amplify + ECS Fargate<br>S3+CloudFront + ECS (Fargate/EC2)<br>ECS Blue/Green + CodeDeploy | 서버 관리 없이 확장 용이, 무중단 배포 표준 | 초기 러닝커브와 비용이 현재 사용자 규모 대비 과도함 |
| 서버리스 | S3+CloudFront + API Gateway + Lambda<br>Amplify + AppSync<br>App Runner | 서버 관리 없음, 초저비용 | 장기적으로 API 상태 추적·SSE 지원 등 현재 아키텍처와 괴리 |
| 쿠버네티스 | S3+CloudFront + EKS + ALB | 대규모 확장성, GitOps 도입 용이 | 운영 난이도가 학습 목표 대비 높음 |
| CodeDeploy/수동 Docker | GitHub Actions + CodeDeploy + EC2<br>Jenkins + CodeDeploy + EC2 | 블루/그린, 저비용 | 현재 프로덕션 부재, 스크립트 복잡도 증가 |
| Lightsail/간단 | Lightsail + Lightsail LB | 매우 간단, 저비용 | 네트워킹 옵션 제약, 장기 확장성 부족 |

결론적으로 **EC2 + Docker Compose + Nginx + Route53** 조합이 학습 목표와 비용 사이 균형을 가장 잘 만족했습니다.

## 3. 최종 아키텍처 개요

```
로컬/CI (Docker build & push)
        ↓
Docker Hub (이미지 저장)
        ↓ pull
EC2 (Ubuntu)
  ├─ Docker Compose (Spring Boot + MariaDB)
  ├─ Nginx (80/443 → 8080 리버스 프록시)
  ├─ Certbot (Let's Encrypt 자동 발급)
  └─ Route53 + 가비아 DNS 위임 (qa.api.pull.it.kr)
```

- 프런트엔드: 팀 선호에 따라 Vercel 호스팅 (독립 파이프라인).
- 백엔드: 단일 EC2 인스턴스가 QA 겸 운영 역할을 담당하며, 사용자 증가 시 추가 노드나 ALB를 도입할 수 있도록 Docker 기반으로 유지합니다.
- 당시 HTTPS는 `https://qa.api.pull.it.kr`로 통일했습니다. 현재 복구 환경의 표준 API 경로는
  `https://portfolio.yeon.world/pull-it/api`입니다.

## 4. 릴리스 플로우

1. **이미지 빌드 & 푸시** – `deploy-qa.sh`가 로컬(또는 CI)에서 멀티 스테이지 `Dockerfile`을 사용해 이미지를 빌드하고 Docker Hub에 `latest`와 커밋 SHA 태그를 동시에 푸시합니다.【F:deploy-qa.sh†L1-L87】【F:Dockerfile†L1-L44】
2. **원격 배포 명령 출력** – 스크립트는 EC2에서 실행할 명령(도커 로그인, 환경 변수, `docker compose up`)을 안내합니다.【F:deploy-qa.sh†L47-L87】
3. **EC2에서 Pull & 재기동** – 운영자는 EC2에 SSH 후 `docker compose -f docker-compose.qa.yml pull && ... up -d`를 실행해 새 이미지를 가져옵니다.【F:docker-compose.qa.yml†L1-L63】
4. **런타임 상태 검증** – 컨테이너 헬스체크와 `actuator/health` 응답, `nginx` 접근 로그로 배포 성공 여부를 확인합니다.

> 빌드 과정이 EC2에서 수행되지 않기 때문에 인스턴스 자원 소모가 적고, 실패 시에도 이전 이미지를 즉시 재기동할 수 있습니다.

## 5. 인프라 구성 절차

1. **EC2 초기화** – 우분투 AMI에서 시작 후 Docker, Compose 플러그인, zsh 등을 설치하는 부트스트랩 스크립트를 실행합니다. Docker 그룹에 현재 사용자를 추가해 재로그인 후 비루트 실행이 가능합니다.
2. **Nginx 설치 및 설정**
   - `/etc/nginx/conf.d/api-qa.pull.it.kr.conf`에서 80/443 요청을 8080으로 프록시하고, SSE가 끊기지 않도록 `proxy_http_version 1.1`과 커스텀 타임아웃을 지정했습니다.
   - `auth_basic`을 활성화해 운영 노출 전까지 기본 인증을 요구합니다.
3. **Let's Encrypt 인증서** – `certbot --nginx -d qa.api.pull.it.kr`로 HTTPS를 적용하고, 자동 갱신 크론을 사용합니다.
4. **Route53 + 가비아 DNS** – 루트 도메인은 Vercel이 관리하되, `api.pull.it.kr` 하위 존은 Route53에 위임하여 백엔드 전용 레코드를 관리합니다. `qa.api.pull.it.kr` A 레코드는 EC2 Elastic IP를 가리킵니다.
5. **보안 그룹 및 포트 정책** – 22(SSH), 80/443(Nginx)만 공개하고, 애플리케이션 8080 포트는 `127.0.0.1:8080`으로만 바인딩하여 외부 노출을 막습니다.【F:docker-compose.qa.yml†L7-L9】
6. **Insomnia & 브라우저 설정** – 자체 서명 인증서 대신 공식 인증서를 사용하므로, Insomnia의 *Validate certificates* 옵션을 켠 상태에서도 QA 호출이 가능합니다.

## 6. 환경 분리 원칙

- 현재는 QA와 운영을 동일 인스턴스에서 운영합니다. QA라는 접두어는 과거 명명 규칙이며, 실제 사용자 유입이 발생할 때 운영 도메인으로 변경할 예정입니다.
- 다중 환경을 즉시 도입하지 않은 이유는 다음과 같습니다.
  - Git 히스토리 분기가 커지고, QA ↔ 운영 간 설정 차이로 인해 충돌이 자주 발생했습니다.
  - 배포 파이프라인이 길어져 개발 생산성이 떨어졌습니다.
- 향후 사용자 증가 시에는 `docker-compose` 스택을 복제하거나 ECS/Fargate 등으로 확장할 수 있도록 이미지를 레지스트리에 표준화해두었습니다.

## 7. 향후 확장 로드맵

1. **관측성** – Sentry, CloudWatch 등을 연동해 배포 후 메트릭을 확보합니다.
2. **자동화** – 현재 수동인 EC2 명령 실행을 GitHub Actions 환경에서 SSH 또는 SSM을 통해 자동화하는 방안을 검토합니다.
3. **추가 환경** – 실사용자 발생 시 운영 전용 도메인과 별도 DB 인스턴스를 도입하고, 필요하다면 ALB나 ECS로 옮겨 무중단 배포를 지원합니다.

---

이 문서는 신규 합류자가 "왜 이렇게 배포하고 있는가"를 빠르게 이해하고, 동일한 절차로 배포를 재현할 수 있도록 하기 위한 가이드입니다. 실습이 필요한 설정(Nginx, certbot, DNS)은 팀 노션에 명령어와 스크린샷이 정리되어 있으니 참고하세요.
