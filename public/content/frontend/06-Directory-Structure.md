# 디렉터리 구조

본 프로젝트는 Feature-based 디렉터리 구조를 준수하고 있으며, 기능 단위로 작업을 진행합니다.

## Feature-Based 구조

Feature-based architecture 또는 Feature-Oriented Software Development(FOSD)라고도 부릅니다.

### 개념

- Feature(기능) : 사용자가 인식할 수 있는 시스템의 구체적인 기능 단위 (예: 로그인, 검색, 알림 기능 등)

- Feature-based 구조 : 시스템을 기능 단위(feature unit)로 나누어 개발, 관리, 확장하는 소프트웨어 구조

### 특징

#### 기능별로 모듈화(Modularization)

- 기능을 독립적으로 추가/삭제 가능 (재사용성 향상)

- 제품 라인(product line) 개발에 적합 (여러 버전의 앱에서 기능 조합만 다르게 구성 가능)

### Feature-based 구조 예시

```
src/
├─ app/
│  ├─ routes/
│  ├─ index.tsx
│  └─ routePaths.ts
│
│
├─ pages/
│  ├─ HomePage.tsx
│  ├─ LoginPage.tsx
│  ├─ ProductListPage.tsx
│  ├─ ProductDetailPage.tsx
│  ├─ OrderPage.tsx
│  ├─ NotFoundPage.tsx
│  └─ _layout/
│     └─ AppLayout.tsx
│
│
├─ features/
│  ├─ auth/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ services/
│  │  └─ index.ts
│  ├─ order/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ services/
│  │  └─ index.ts
│  └─ product/
│     ├─ components/
│     ├─ hooks/
│     ├─ services/
│     └─ index.ts
│
├─ shared/
│  ├─ components/
│  ├─ hooks/
│  ├─ utils/
│  ├─ api/
│  ├─ styles/
│  └─ config/
│
└─ main.tsx
```
