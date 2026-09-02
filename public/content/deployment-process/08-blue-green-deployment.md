# 8. Blue/Green 무중단 배포

Pull-it 프로젝트는 사용자의 서비스 이용 중단 없이 새로운 버전을 배포하기 위해 **Blue/Green 무중단 배포** 전략을 사용합니다. 이 문서는 해당 배포 방식의 개념과 실제 배포 과정을 설명합니다.

## 핵심 구성 요소

### 1. Multi-stage Docker Build

안정적이고 효율적인 배포를 위해 Docker를 사용하며, Multi-stage 빌드 방식으로 이미지를 생성합니다. 이는 최종 이미지의 크기를 줄이고 보안을 강화하는 효과를 가져옵니다.

상세한 `Dockerfile` 내용과 빌드 전략은 [**3. Docker 빌드 전략 (Multi-stage)**](./03-deploy-docker-build.md) 문서를 참고해주세요.

### 2. Nginx를 이용한 Blue/Green 환경 구성

Nginx를 리버스 프록시로 사용하여 두 개의 독립적인 백엔드 환경(Blue, Green)을 운영합니다.

- `upstream api_backend_blue`: **Blue** 환경으로, 특정 포트(예: 18080)에서 실행되는 컨테이너를 가리킵니다.
- `upstream api_backend_green`: **Green** 환경으로, 다른 포트(예: 18081)에서 실행되는 컨테이너를 가리킵니다.
- `upstream api_backend`: 실제 트래픽을 처리할 **활성(Active)** 환경을 가리키는 프록시입니다. 배포 시 이 부분의 설정만 변경하여 트래픽 전환이 이루어집니다.

```nginx
# ===============================================
#  Upstream (백엔드 서비스 목록)
# ===============================================

# Blue 컨테이너 (예: docker에서 "18080:8080")
upstream api_backend_blue {
    server 127.0.0.1:18080;
    keepalive 32;
}

# Green 컨테이너 (예: docker에서 "18081:8080")
upstream api_backend_green {
    server 127.0.0.1:18081;
    keepalive 32;
}

# 실제로 서버블록에서 참조하는 이름
# 배포할 때 이 부분만 blue <-> green 으로 sed 해서 교체
upstream api_backend {
    # 처음엔 blue로 시작
    server 127.0.0.1:18080;
    keepalive 32;
}
```

## 배포 프로세스

1. **새 버전 이미지 빌드**
   - CI/CD 파이프라인에서 Git의 최신 소스코드를 가져와 `Dockerfile`을 이용해 새로운 Docker 이미지를 빌드합니다.

2. **현재 활성 환경 확인**
   - 배포 스크립트가 Nginx의 `upstream api_backend` 설정을 확인하여 현재 트래픽을 처리 중인 환경(Blue/Green)을 판단합니다.

3. **비활성 환경에 새 버전 배포**
   - 현재 **활성** 환경이 **Blue**라면, **비활성** 상태인 **Green** 환경에 새로 빌드한 Docker 이미지를 컨테이너로 실행합니다.
   - (예: `docker run -d -p 18081:8080 --name green-container new-image`)

4. **새 버전 상태 확인 (Health Check)**
   - 새로 실행된 Green 컨테이너가 정상적으로 동작하는지 내부적으로 헬스체크를 수행합니다. (`Dockerfile`에 정의된 `HEALTHCHECK` 또는 스크립트를 통한 API 호출)

5. **트래픽 전환**
   - Green 컨테이너가 정상 상태임이 확인되면, 배포 스크립트가 Nginx 설정을 변경하여 `api_backend`가 Green 환경을 가리키도록 수정합니다.
   - `sed`와 같은 명령어를 사용하여 `upstream api_backend`의 서버 주소를 Green 환경의 포트(18081)로 변경합니다.
   - `nginx -s reload` 명령으로 Nginx 설정을 재로딩하여 중단 없이 트래픽을 새로운 버전(Green)으로 전환합니다.

6. **이전 버전 환경 중지**
   - 트래픽 전환이 성공적으로 완료되면, 이전 버전의 컨테이너(Blue)는 중지 및 삭제됩니다. 이를 통해 리소스를 확보하고, 문제가 발생할 경우를 대비해 일정 시간 대기 후 정리할 수도 있습니다.

이러한 과정을 통해 사용자는 서비스 중단을 전혀 느끼지 못하며, 개발팀은 안정적으로 새로운 기능을 배포할 수 있습니다.
