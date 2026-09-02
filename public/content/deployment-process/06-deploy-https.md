# 6. HTTPS 적용

> **과거 운영 기록:** 아래 Certbot 예시는 종료 예정인 `*.pull.it.kr` 인프라의 보존 문서입니다. 현재 Pull-it은 `https://portfolio.yeon.world/pull-it` 하위 경로로 제공되며, 이 예시의 도메인·인증서 명령을 새 환경에 적용하지 않습니다.

Let's Encrypt와 Certbot을 사용하여 무료로 SSL/TLS 인증서를 발급받고, Nginx에 적용하여 통신을 암호화(HTTPS)합니다.

## 1. Certbot 설치

Certbot은 Let's Encrypt 인증서를 자동으로 발급받고 갱신해주는 클라이언트입니다.

```bash
# snapd 최신 버전으로 업데이트
sudo snap install core; sudo snap refresh core

# certbot 설치
sudo snap install --classic certbot

# certbot 명령어 심볼릭 링크 생성
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

## 2. Nginx 설정 확인

Certbot이 Nginx 설정을 자동으로 변경해주려면, `/etc/nginx/sites-available/`에 있는 설정 파일에 `server_name`이 **정확히** 명시되어 있어야 합니다. (이전 단계에서 이미 설정했습니다.)

## 3. SSL 인증서 발급 및 Nginx에 자동 적용

아래 명령어를 실행하면 Certbot이 Nginx 설정을 분석하여 `server_name`에 명시된 도메인에 대한 인증서 발급을 시도합니다.

```bash
sudo certbot --nginx
```

**실행 과정:**

1.  **이메일 주소 입력:** 인증서 만료 시 알림을 받을 이메일 주소를 입력합니다.
2.  **서비스 약관 동의:** `Y`를 눌러 동의합니다.
3.  **뉴스레터 수신 동의:** `Y` 또는 `N`을 선택합니다.
4.  **도메인 선택:** Nginx 설정에서 감지된 도메인 목록이 표시됩니다. 인증서를 발급받을 도메인을 선택합니다.
5.  **자동 설정 완료:** Certbot이 인증서 발급을 완료하고, Nginx 설정 파일에 HTTPS 관련 설정을 자동으로 추가합니다. (`/etc/nginx/sites-available/myapp.conf` 파일이 수정됩니다.)

## 4. 수정된 Nginx 설정 확인

Certbot 실행 후 Nginx 설정 파일(`/etc/nginx/sites-available/myapp.conf`)을 열어보면 다음과 같이 HTTPS(443 포트) 설정이 추가된 것을 확인할 수 있습니다.

- 기존 `listen 80` 서버 블록은 HTTP 요청을 HTTPS로 리다이렉션하는 역할로 변경됩니다.
- 새로운 `listen 443 ssl` 서버 블록이 생성되어 실제 HTTPS 요청을 처리합니다.

```nginx
# /etc/nginx/sites-available/myapp.conf

server {
    server_name api-qa.pull.it.kr;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Certbot에 의해 추가된 설정
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/api-qa.pull.it.kr/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/api-qa.pull.it.kr/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = api-qa.pull.it.kr) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name api-qa.pull.it.kr;
    return 404; # managed by Certbot
}
```

## 5. 인증서 자동 갱신 확인

Let's Encrypt 인증서는 90일 동안 유효합니다. Certbot은 설치 시 자동 갱신을 위한 타이머를 시스템에 등록하므로, 별도의 조치 없이도 인증서가 자동으로 갱신됩니다.

아래 명령어로 자동 갱신이 정상적으로 설정되었는지 테스트해볼 수 있습니다.

```bash
sudo certbot renew --dry-run
```

이제 `https://api-qa.pull.it.kr`로 접속하면 브라우저에 자물쇠 아이콘이 표시되며, 안전한 암호화 통신이 이루어지는 것을 확인할 수 있습니다.
