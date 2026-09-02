# 프론트엔드 CI/CD

프론트엔드 프로젝트는 GitHub에 Pull Request를 생성하거나 코드가 업로드될 때,  
**GitHub Actions**와 **Vercel**의 CI/CD 과정을 통해 자동으로 코드 품질과 빌드 안정성을 검증합니다.  
모든 조건을 통과해야 병합 및 배포가 진행됩니다.

---

### Github Action

| 순서 | 단계명 | 설명 | 사용 액션 / 명령어 |
|:---:|:--------|:------|:-------------------|
| 1 | **코드 체크아웃 (Checkout code)** | GitHub 저장소의 코드를 워크플로우 실행 환경으로 가져옵니다. | `actions/checkout@v4` |
| 2 | **pnpm 환경 설정 (Setup pnpm)** | 프로젝트에서 사용하는 패키지 매니저인 `pnpm`을 설치하고 버전을 지정합니다. | `pnpm/action-setup@v4`<br>`version: 10` |
| 3 | **Node.js 환경 설정 (Setup Node.js)** | Node.js 22 버전 환경을 설정하고, `pnpm` 캐시를 활성화하여 의존성 설치 속도를 최적화합니다. | `actions/setup-node@v4`<br>`node-version: 22`<br>`cache: pnpm` |
| 4 | **의존성 설치 (Install dependencies)** | `pnpm install` 명령으로 `package.json`과 `pnpm-lock.yaml`을 기준으로 의존성을 설치합니다. | `pnpm install --frozen-lockfile` |
| 5 | **Prettier 코드 스타일 검사 (Run Prettier check)** | 프로젝트 내 코드 스타일이 `Prettier` 규칙에 맞는지 검증합니다. | `pnpm prettier-check` |
| 6 | **ESLint 문법 검사 (Run ESLint check)** | `ESLint`를 통해 코드 문법, 규칙 위반 여부를 검사합니다. | `pnpm lint-check` |
| 7 | **TypeScript 타입 검사 (Run TSC check)** | `TypeScript Compiler(tsc)`를 이용해 타입 오류를 확인합니다. | `pnpm tsc-check` |

---

### Github Action 트리거 조건

| 항목 | 설명 |
|:-----|:------|
| **on.pull_request** | Pull Request가 생성될 때마다 자동 실행됩니다. |

---

### 주요 특징

| 구분 | 설명 |
|:----:|:------|
| **CI 목적** | 코드 스타일, 린트, 타입 검사를 자동화하여 코드 품질을 보장 |
| **빌드 환경** | Ubuntu 최신 환경(`ubuntu-latest`)에서 실행 |
| **CI 실패 조건** | Prettier, ESLint, TypeScript 중 하나라도 실패 시 Pull Request 병합 불가 |
| **패키지 관리 도구** | `pnpm` |
| **Node 버전** | 22.x |
| **자동화 이점** | 개발자가 수동으로 코드 검증을 수행하지 않아도, 자동으로 일관된 품질 유지 가능 |

---

### Vercel CD(Continuous Deployment)

- GitHub의 main 브랜치 병합 이후, **Vercel**에서 자동으로 배포가 진행됩니다.  
- 배포 전 GitHub Action에서 모든 CI 검증을 통과해야만 Vercel 배포 단계로 진입할 수 있습니다.  
- 빌드 실패 시 자동으로 배포가 중단되며, PR 병합이 차단됩니다.

### Husky를 이용한 커밋 전 자동 코드 포맷팅

- 본 프로젝트는 **Husky**를 이용하여 커밋 전 자동으로 코드 스타일을 정리하고 린트 오류를 수정하도록 설정되어 있습니다.

- git commit을 할 때마다 자동으로 적용되며, 오류 발생 시 커밋이 되지 않습니다.

#### 스크립트 위치
`.husky/pre-commit`

#### 실행 내용

| 순서 | 수행 작업 | 명령어 |
|:----:|:-----------|:-------|
| 1 | **ESLint 자동 실행** | `pnpm exec eslint . --ext .js,.jsx,.ts,.tsx --fix` |
| 2 | **Prettier 자동 실행** | `pnpm exec prettier . --write` |