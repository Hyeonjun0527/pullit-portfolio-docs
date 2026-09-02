# API 호출과 설정
- 프론트엔드-백엔드 간의 통신에서 API를 호출할 경우 아래의 가이드를 따라야합니다.
- API 명세는 insomnia를 통해 확인할 수 있습니다.
- 해당 API 호출 인스턴스는 axios를 기반으로 작성되었습니다.

## Pull-it FE API 요청 가이드
이 문서는 프로젝트에서 API를 올바르게 호출하는 방법에 대한 규칙과 예시를 제공합니다. 이 가이드를 따르지 않으면 인증 오류, CORS 오류 등이 발생할 수 있습니다.

## 핵심 규칙

1. **반드시 커스텀 `api` 인스턴스를 사용하세요.**
    - `axios`를 직접 import하여 사용하지 마세요.
    - `@/shared/api/axiosClient.ts` 파일에 정의된 `api` 객체를 import하여 사용해야 합니다.
    - 이 인스턴스에는 **Base URL 자동 설정**, **인증 헤더(Basic Auth) 자동 주입** 등 중요한 인터셉터가 설정되어 있습니다.
2. **URL은 반드시 상대 경로를 사용하고, `/api`는 제외하세요.**
    - 전체 URL(`https://...`)을 사용하면 Vite 프록시를 우회하여 **CORS 에러**가 발생합니다.
    - 경로에 `/api`를 포함하면 URL이 `/api/api/...` 와 같이 중복되어 **404 에러**가 발생합니다.
    - 호출하려는 엔드포인트 경로만 정확히 기입하세요.

### 사용 예시

```tsx
// Good: 올바른 사용법
import { api } from '@/shared/api/axiosClient';

// ✅ URL에 /api가 없고, 상대 경로만 사용
api.get('/learning/source/upload');
api.post('/users/login', { email, password });

// Bad: 잘못된 사용법
import axios from 'axios';

// ❌ axios를 직접 사용: 인증 헤더, Base URL 누락
axios.get('/learning/source/upload');

// ❌ 전체 URL 사용: CORS 에러 발생
api.get('<https://portfolio.yeon.world/pull-it/api/learning/source/upload>');

// ❌ URL에 /api 포함: 경로 중복으로 404 에러 발생
api.get('/api/learning/source/upload');

```
