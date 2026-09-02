# Nginx 전체 설정

> **과거 운영 기록:** 이 문서의 `*.pull.it.kr` Nginx 구성과 인증서는 종료 예정인 이전 인프라의 기록입니다. 현재 Pull-it의 공개 진입점은 `https://portfolio.yeon.world/pull-it`이며, 새 설정은 [복구 환경 배포 계약](https://github.com/Hyeonjun0527/Team2_BE/blob/main/docs/production-secret-contract.md)을 기준으로 합니다. 이 문서의 설정을 현재 서버에 복사하거나 수정하지 마세요.

EC2 서버에서 실행 중인 Nginx의 전체 설정 파일(`sites-available/default`)입니다. Blue/Green 배포를 위한 `upstream` 설정과 각 서비스(API, Grafana, Prometheus, RabbitMQ)의 리버스 프록시 규칙을 포함하고 있습니다.

## 주요 설정 설명

이 설정 파일은 크게 세 부분으로 나뉩니다: **Upstream**, **Server Blocks**, **SSL**.

### 1. `upstream` (백엔드 서버 그룹)

-   `upstream` 블록은 Nginx가 요청을 전달할 백엔드 서버들의 그룹을 정의합니다. 로드 밸런싱이나 서버 이중화를 위해 사용됩니다.
-   **블루/그린 무중단 배포**:
    -   `api_backend_blue`와 `api_backend_green`이라는 두 개의 독립된 서버 그룹을 미리 정의해 둡니다. 각각 다른 포트(18080, 18081)를 바라봅니다.
    -   실제 `server` 블록에서는 `api_backend`라는 이름의 `upstream`을 사용합니다.
    -   배포 시, 배포 스크립트는 `api_backend`가 `api_backend_blue`를 가리킬지, `api_backend_green`을 가리킬지만 변경합니다. 이 방식을 통해 사용자는 서비스 중단 없이 새로운 버전으로 자연스럽게 전환됩니다.
-   **기타 서비스**: Grafana, Prometheus, RabbitMQ와 같은 모니터링 및 메시징 도구들도 각각의 `upstream`으로 정의하여 관리의 편의성을 높입니다.

### 2. `server` (가상 호스트 설정)

-   `server` 블록은 특정 도메인으로 들어온 요청을 어떻게 처리할지 정의하는 핵심 영역입니다.
-   `server_name` 지시어로 `qa.api.pull.it.kr`과 같은 도메인을 지정하여, 해당 도메인으로 들어오는 요청에 대해서만 이 블록의 규칙을 적용합니다.

### 3. `location` (경로별 처리 규칙)

-   `location` 블록은 특정 URL 경로에 대한 처리 규칙을 상세하게 정의합니다.
-   `location /`:
    -   `/api/notifications/subscribe` 경로를 제외한 모든 일반적인 API 요청을 처리합니다.
    -   `proxy_pass http://api_backend;`를 통해 `upstream`으로 정의된 백엔드 서버로 요청을 전달합니다.
    -   `proxy_set_header` 지시어들은 클라이언트의 원래 요청 정보를 백엔드 서버가 알 수 있도록 헤더를 설정해주는 중요한 역할을 합니다. (예: 실제 IP, 프로토콜 등)
-   `location /api/notifications/subscribe`:
    -   **SSE(Server-Sent Events)** 연결을 위한 특별한 처리를 합니다. SSE는 서버에서 클라이언트로 실시간 데이터를 지속적으로 보내는 기술입니다.
    -   `proxy_buffering off;`: **(핵심 설정)** Nginx의 기본 동작인 '버퍼링'을 끕니다. 만약 이 설정이 없으면, Nginx는 백엔드 서버로부터 응답이 완전히 끝날 때까지 데이터를 쌓아두었다가 한 번에 클라이언트에게 보내려고 합니다. 이는 실시간 스트리밍을 불가능하게 만듭니다. 이 설정을 통해 백엔드에서 데이터가 생성되는 즉시 클라이언트로 전달될 수 있습니다.
    -   `proxy_cache off;`, `gzip off;`: 실시간 통신이므로 캐시나 압축을 사용하지 않도록 설정합니다.
    -   긴 `timeout` 설정들 (`1h`, `7200s`): SSE 연결은 오랫동안 유지되어야 하므로, 연결이 중간에 끊기지 않도록 타임아웃을 길게 설정합니다.

### 4. SSL 및 HTTP → HTTPS 리다이렉션

-   `listen 443 ssl;`과 `ssl_certificate` 관련 지시어들은 Let's Encrypt를 통해 발급받은 SSL 인증서를 적용하여 HTTPS 통신(암호화)을 활성화합니다.
-   80번 포트(HTTP)로 들어오는 요청을 `return 301 https://$host$request_uri;`를 통해 443번 포트(HTTPS)로 영구 리다이렉션하여 모든 통신이 암호화되도록 강제합니다.

```nginx
# ===============================================
#  Upstream (백엔드 서비스 목록)
#  - blue / green 두 개를 미리 정의해두고
#  - 실제로 location에서 쓸 건 api_backend 하나만 둔다.
#  - 배포 스크립트가 이 아래 한 줄만 바꿔주는 구조.
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
    server 127.0.0.1:18081;
    keepalive 32;
}

# 기타 서비스
upstream grafana_backend {
    server 127.0.0.1:9485;
}

upstream prometheus_backend {
    server 127.0.0.1:9486;
}

upstream rabbitmq_backend {
    server 127.0.0.1:15672;
}


# ===============================================
#  Server Blocks (도메인별 처리 규칙)
# ===============================================

# --- Spring Boot API (qa.api.pull.it.kr) ---
server {
    server_name qa.api.pull.it.kr;

    # SSE, 이벤트 스트림 같은 긴 커넥션
    location /api/notifications/subscribe {
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin            $http_origin;

        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        gzip off;
        chunked_transfer_encoding on;
        proxy_read_timeout 1h;
        proxy_send_timeout 1h;
        keepalive_timeout 7200s;
    }

    # 일반 API
    location / {
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin            $http_origin;

        proxy_pass http://api_backend;
        proxy_read_timeout 60s;
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
    }

    access_log /var/log/nginx/qa.api.access.log;
    error_log  /var/log/nginx/qa.api.error.log;

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/qa.api.pull.it.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qa.api.pull.it.kr/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = qa.api.pull.it.kr) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name qa.api.pull.it.kr;
    return 404;
}


# --- Grafana (grafana.qa.api.pull.it.kr) ---
server {
    server_name grafana.qa.api.pull.it.kr;

    location / {
        proxy_pass http://grafana_backend;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/grafana.qa.api.pull.it.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grafana.qa.api.pull.it.kr/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = grafana.qa.api.pull.it.kr) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name grafana.qa.api.pull.it.kr;
    return 404;
}


# --- Prometheus (prometheus.qa.api.pull.it.kr) ---
server {
    server_name prometheus.qa.api.pull.it.kr;

    location / {
        proxy_pass http://prometheus_backend;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/prometheus.qa.api.pull.it.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prometheus.qa.api.pull.it.kr/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = prometheus.qa.api.pull.it.kr) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name prometheus.qa.api.pull.it.kr;
    return 404;
}


# --- RabbitMQ (rabbitmq.qa.api.pull.it.kr) ---
server {
    server_name rabbitmq.qa.api.pull.it.kr;

    location / {
        proxy_pass http://rabbitmq_backend;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/rabbitmq.qa.api.pull.it.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rabbitmq.qa.api.pull.it.kr/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = rabbitmq.qa.api.pull.it.kr) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name rabbitmq.qa.api.pull.it.kr;
    return 404;
}
