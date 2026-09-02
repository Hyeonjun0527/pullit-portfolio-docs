# 기술스택 선택 근거
<!-- 하이퍼링크 위치 수정 필요: 프론트엔드 기술 스택 -->
본 문서는 <a href=#>프론트엔드 기술 스택</a> 문서의 참고 자료로, 해당 기술 스택을 적용한 근거와 사유에 대해 설명합니다.

## 기술 스택 선정 결과

| 분류 | 최종 기술선정 | 경쟁 기술 | 편의성 | 생태계/대중성/트렌드 | 성능/최적화 | 추가 근거 |
|------|----------------|-----------|--------|-------------------|-------------|-----------|
| 깃허브 잔디 스타일 라이브러리 | react-calendar-heatmap 1.10.0 | - | - | - | - | - |
| 빌드도구 | VITE 7.1.3 | Parcel, Turbopack, Webpack, esbuild | 가장 익숙, 가장 편리 | 가장 인기 | 충분히 빠르다 | 1. STEP2에서 사용했던 VITE가 익숙함<br>2. 제로에 가까운 설정<br>3. 표준급 채택률 |
| 런타임 | Node v22.18.0 | Bun, Deno | 가장 익숙 | 가장 인기, 가장 큼 | 충분히 빠르다 | 1. 오랜 세월 쌓인 npm 중심 생태계<br>2. Deno와 Bun은 NPM 패키지 완벽 지원 불가<br>3. 안정성과 호환성을 고려한 안전한 선택 |
| 트랜스파일러 | tsc | - | - | - | - | TypeScript 코드를 JavaScript로 변환하기 위해 사용 |
| CSS library | Emotion 11.14.0 / emotion/styled 11.14.1 / framer-motion 12.23.12 | Emotion, Plain CSS, PostCSS, SASS/SCSS, Tailwind CSS, Vanilla Extract | 가장 편리, 사용경험 부족 | 가장 인기, 가장 큼 | 충분히 빠르다 | 1. STEP2에서 사용하여 익숙함<br>2. 조건부 스타일 지정 용이<br>3. 컴포넌트 단위 캡슐화 |
| UI 컴포넌트 | Chakra UI 2.10.9 | Ant Design, MUI, Radix, Semantic UI, shadcn/ui | 사용경험 부족 | 가장 인기, 가장 큼 | - | 미리 정의된 컴포넌트를 사용하여 개발 속도 향상 |
| 테스트도구 | vitest (추후 추가) | Jest | 사용경험 부족 | - | - | 1. Jest와 사용법 유사하지만 Vitest가 더 빠름<br>2. React + Vite 프로젝트 적합 |
| 언어 | TypeScript 5.8.3 | Javascript | 가장 익숙 | - | - | 타입 안정성 확보 목적 |
| 뷰 라이브러리 | React 19.1.1 | HTMX, Preact, Svelte, Vue.js | 가장 익숙 | - | - | 학습 내용과 익숙함으로 React 선택 |
| 라우팅 | React Router Dom 7.8.2 | react-router | 가장 익숙 | - | - | 표준적 선택, 웹 서비스 전용 패키지 |
| 서버 상태 | TanStack Query (react-query) 5.85.5 | - | - | - | - | 서버 상태 관리, 캐싱, 자동 갱신 용이 |
| 클라이언트 상태 | Context API | - | - | - | - | 초기 설정이 간단하고 가벼움 |
| 패키지 매니저 | pnpm 10.15.0 | npm, yarn | 사용경험 부족 | 가장 인기, 가장 큼 | 충분히 빠르다 | Node 버전 관리 용이 |
| 런타임버전관리 | pnpm 10.15.0 | - | - | - | - | Node 버전 관리 용이 |
| 데이터 요청 | axios 1.11.0 | fetch, ky | 가장 익숙 | 가장 큼, 성숙한 문서 | - | 1. 요청/응답 인터셉터 가능<br>2. 러닝커브 최소화 |
| 애니메이션 | lottie | react-bits | - | - | - | 파일 크기 작고 복잡한 애니메이션 가능 |
| 애니메이션 라이브러리 | lottie 0.17.1 | - | - | - | - | - |
| 그래픽 렌더 엔진 | dotlottie (thorVG) | - | - | - | - | .lottie 파일로 리소스 압축 및 관리 가능 |
| 배포방식 | 정적 빌드 배포 | - | - | - | - | 정적 빌드 vs SSG, ISR |
| 호스팅 | Vercel | EC2 | - | - | - | React 배포 최적화 및 일반적 사용 |
| lint | eslint 9.34.0 | - | - | - | - | 코드 유지보수성 향상 |
| formatter | prettier 3.6.2 | - | - | - | - | 코드 유지보수성 향상 |
| code convention | airbnb (eslint에 반영) | - | - | - | - | 대표적인 코드 컨벤션 |
| 압축 및 이미지 압축 | gzip, WebP 변환 플러그인 (추후 결정) | - | - | - | - | - |
| CI/CD | Github Action, Vercel | - | - | - | - | - |
| 아이콘 라이브러리 | lucide-react 0.542.0 | - | - | - | - | - |
| alert 라이브러리 | react-toastify 11.0.5 | - | - | - | - | - |
| husky | husky 9.1.7 | - | - | - | - | - |
