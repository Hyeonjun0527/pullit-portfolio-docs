# 10. CD (Continuous Deployment)

CD(지속적 배포)는 CI 단계를 성공적으로 통과한 코드를 자동으로 프로덕션 또는 스테이징 환경에 배포하는 프로세스입니다. 이를 통해 개발부터 배포까지의 전체 파이프라인을 자동화할 수 있습니다.

## CD 워크플로우 (`cd.yml`)

이 워크플로우는 **CI 워크플로우(`Code check`)가 `develop` 브랜치에서 성공적으로 완료되었을 때**만 트리거됩니다.

```yaml
name: Deploy to EC2 (Compose)

on:
  workflow_run:
    workflows: ["Code check (linter, formatter)"]
    types:
      - completed
    branches:
      - develop

jobs:
  deploy:
    if: github.event.workflow_run.conclusion == 'success'
    environment: qa
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v5
        with:
          ref: ${{ github.event.workflow_run.head_sha }}

      - name: Login to Docker registry
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.DOCKER_REGISTRY_HOST }}
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
          ecr: false

      - name: Setup SSH key
        run: |
          mkdir -p ~/.ssh
          echo '${{ secrets.EC2_SSH_KEY }}' > ~/.ssh/ec2_key.pem
          chmod 600 ~/.ssh/ec2_key.pem
          ssh-keyscan -H ${{ secrets.EC2_HOST }} >> ~/.ssh/known_hosts 2>/dev/null || true

      - name: Create app directory on EC2
        run: ssh -i ~/.ssh/ec2_key.pem -o StrictHostKeyChecking=no ubuntu@${{ secrets.EC2_HOST }} "mkdir -p /home/ubuntu/app/prometheus"

      - name: Upload configs and deployment script
        run: |
          scp -i ~/.ssh/ec2_key.pem -o StrictHostKeyChecking=no docker-compose.qa.yml ubuntu@${{ secrets.EC2_HOST }}:/home/ubuntu/app/docker-compose.qa.yml
          scp -i ~/.ssh/ec2_key.pem -o StrictHostKeyChecking=no prometheus/prometheus.qa.yml ubuntu@${{ secrets.EC2_HOST }}:/home/ubuntu/app/prometheus/prometheus.qa.yml
          scp -i ~/.ssh/ec2_key.pem -o StrictHostKeyChecking=no scripts/deploy-qa.sh ubuntu@${{ secrets.EC2_HOST }}:/home/ubuntu/app/deploy-qa.sh

      - name: Execute Blue-Green Deployment
        run: |
          ssh -i ~/.ssh/ec2_key.pem -o StrictHostKeyChecking=no ubuntu@${{ secrets.EC2_HOST }} "
            export DOCKER_IMAGE_NAME='${{ secrets.DOCKER_IMAGE_NAME }}'
            export IMAGE_TAG='${{ github.event.workflow_run.head_sha }}'
            export DB_USERNAME='${{ secrets.DB_USERNAME }}'
            export DB_PASSWORD='${{ secrets.DB_PASSWORD }}'
            export DB_ROOT_PASSWORD='${{ secrets.DB_ROOT_PASSWORD }}'
            export KAKAO_REST_API_KEY='${{ secrets.KAKAO_REST_API_KEY }}'
            export KAKAO_CLIENT_SECRET='${{ secrets.KAKAO_CLIENT_SECRET }}'
            export S3_ACCESS_KEY='${{ secrets.S3_ACCESS_KEY }}'
            export S3_SECRET_KEY='${{ secrets.S3_SECRET_KEY }}'
            export GEMINI_API_KEY='${{ secrets.GEMINI_API_KEY }}'
            export JWT_REDIRECT_URL='${{ secrets.JWT_REDIRECT_URL }}'
            export JWT_COOKIE_DOMAIN='${{ secrets.JWT_COOKIE_DOMAIN }}'
            export AWS_REGION='ap-northeast-2'
            export SENTRY_DSN='${{ secrets.SENTRY_DSN }}'
            export SENTRY_AUTH_TOKEN='${{ secrets.SENTRY_AUTH_TOKEN }}'
            export GRAFANA_ADMIN_PASSWORD='${{ secrets.GRAFANA_ADMIN_PASSWORD }}'
            export RABBITMQ_DEFAULT_USER='${{ secrets.RABBITMQ_DEFAULT_USER }}'
            export RABBITMQ_DEFAULT_PASS='${{ secrets.RABBITMQ_DEFAULT_PASS }}'

            # Make the script executable and run it
            chmod +x /home/ubuntu/app/deploy-qa.sh
            bash /home/ubuntu/app/deploy-qa.sh
          "
      - name: Cleanup
        if: always()
        run: rm -f ~/.ssh/ec2_key.pem
```

## 주요 단계 설명

1.  **트리거 조건**:
    -   `on.workflow_run`: CI 워크플로우(`Code check`)가 완료되었을 때 실행됩니다.
    -   `if: ...conclusion == 'success'`: CI가 성공했을 경우에만 배포를 진행합니다.

2.  **배포 준비**:
    -   `actions/checkout@v5`: CI를 트리거했던 특정 커밋(`head_sha`)의 소스코드를 체크아웃하여 일관성을 유지합니다.
    -   `docker/login-action@v3`: CI 단계에서 푸시한 Docker 이미지를 EC2에서 pull 받기 위해 Docker Registry에 로그인합니다.
    -   `Setup SSH key`: GitHub Secrets에 저장된 EC2의 SSH 비공개 키를 사용하여 Runner가 서버에 접속할 수 있도록 준비합니다.

3.  **파일 전송**:
    -   `scp` 명령어를 사용하여 배포에 필요한 설정 파일들(`docker-compose.qa.yml`, `prometheus.qa.yml`)과 배포 스크립트(`deploy-qa.sh`)를 EC2 서버의 `/home/ubuntu/app` 디렉터리로 복사합니다.

4.  **배포 스크립트 실행**:
    -   `ssh`를 통해 EC2에 원격 접속하여 `deploy-qa.sh` 스크립트를 실행합니다.
    -   이때, `docker-compose.qa.yml`에서 사용될 모든 환경 변수들을 GitHub Secrets에서 가져와 `export` 명령어로 주입합니다.
    -   `deploy-qa.sh` 스크립트는 Blue/Green 배포 로직(새 버전 컨테이너 실행, Nginx 설정 변경, 이전 버전 컨테이너 중지 등)을 수행하게 됩니다.

5.  **정리**:
    -   `Cleanup`: 배포가 성공하든 실패하든 관계없이, Runner에 남아있는 SSH 키 파일을 삭제하여 보안을 유지합니다.
