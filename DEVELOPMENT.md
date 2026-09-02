# 🚀 개발 환경 설정 가이드

## 📋 필수 요구사항

- Node.js (v22 이상)
- npm

## 🔧 개발 서버 실행

### 1단계: SCSS 감시 모드 실행
```bash
npm run build:css
```
- SCSS 파일 변경사항을 자동으로 감지하여 CSS로 컴파일
- **이 터미널은 개발하는 동안 계속 켜두세요**
- 파일 변경 시 자동으로 `public/css/main.css` 생성/업데이트

### 2단계: Express 개발 서버 실행 (새 터미널)
```bash
npm start
```
- 로컬 개발 서버 실행
- 브라우저에서 `http://localhost:3000` 접속
- Express API와 정적 파일 서빙

## 📁 개발 워크플로우

```bash
# 터미널 1 (SCSS 감시)
npm run build:css

# 터미널 2 (웹 서버)
npm start
```

### 개발 중 파일 수정 순서:
1. `src/styles/` 폴더의 SCSS 파일 수정
2. 터미널 1에서 자동 컴파일 확인
3. 브라우저에서 새로고침하여 변경사항 확인

## 🎯 주요 명령어

### CSS 관련
```bash
# 개발용 - SCSS 감시 모드 (자동 컴파일)
npm run build:css

# 프로덕션용 - 압축된 CSS 생성
npm run build:css:prod
```

### 서버 관련
```bash
# Express 개발 서버 실행
npm start
```

## 📂 파일 구조

```
pullit-docs-server/
├── src/styles/           # SCSS 소스 파일
│   ├── main.scss        # 메인 SCSS (모든 파일 import)
│   ├── utils/           # 변수, 믹스인, 함수
│   ├── components/      # 컴포넌트별 스타일
│   └── pages/           # 페이지별 스타일
├── public/
│   ├── css/
│   │   └── main.css     # 컴파일된 CSS (자동 생성)
│   ├── js/              # JavaScript 파일
│   └── *.html           # HTML 파일들
└── api/                 # Express API
```

## 🔄 SCSS 개발 가이드

### 변수 사용
```scss
// _variables.scss에서 정의된 변수 사용
.my-component {
  color: $primary-color;
  padding: $spacing-4;
  border-radius: $border-radius-lg;
}
```

### 믹스인 사용
```scss
// _mixins.scss에서 정의된 믹스인 사용
.my-card {
  @include card-base;
  @include hover-lift;
}
```

### 반응형 디자인
```scss
.my-element {
  font-size: $text-base;
  
  @include tablet-up {
    font-size: $text-lg;
  }
  
  @include desktop-up {
    font-size: $text-xl;
  }
}
```

## 🚀 배포

### 자동 배포 (권장)
- `main` 브랜치에서 문서 서비스 파일이 바뀌면 GitHub Actions가 ARM64 컨테이너를 빌드한다.
- 제한된 배포 계정이 라즈베리파이의 Pull-it 문서 컨테이너만 교체한다.

### 로컬 프로덕션 확인
```bash
npm run build
docker build --platform linux/arm64 -t pullit-docs:local .
```

## 🐛 트러블슈팅

### SCSS 컴파일 에러
```bash
# Sass 재설치
npm uninstall sass
npm install -D sass

# 캐시 클리어 후 재시작
rm -rf node_modules package-lock.json
npm install
npm run build:css
```

### Express 개발 서버 에러
```bash
# 의존성을 다시 설치한 뒤 실행
npm ci
npm start
```

### 포트 충돌
```bash
# 다른 포트로 실행
PORT=3001 npm start
```

## 📝 개발 팁

1. **SCSS 파일 수정 시**: 터미널 1에서 컴파일 로그 확인
2. **CSS 적용 안될 때**: 브라우저 캐시 클리어 (Ctrl+Shift+R)
3. **새로운 컴포넌트 추가**: `src/styles/components/`에 파일 생성 후 `main.scss`에 import
4. **색상/간격 변경**: `_variables.scss` 수정으로 전체 사이트 일괄 적용

## 🔗 유용한 링크

- [Sass 공식 문서](https://sass-lang.com/documentation)
- [Express 문서](https://expressjs.com/)
- [Vue.js 가이드](https://vuejs.org/guide/)
- [Lucide Icons](https://lucide.dev/icons/)
