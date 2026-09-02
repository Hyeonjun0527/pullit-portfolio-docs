# Pullit Docs Server

Pullit 프로젝트의 문서 관리 및 제공을 위한 서버입니다.

## 복구된 공개 경로

- 문서 포털: `https://portfolio.yeon.world/pull-it/docs`
- API 명세: `https://portfolio.yeon.world/pull-it/docs/redoc.html`
- 백엔드 OpenAPI 원본: `https://portfolio.yeon.world/pull-it/api-docs`

배포 전 `.env.example`을 기준으로 `DATABASE_URL`과
`POSTGRES_URL_NON_POOLING`을 설정합니다. 실제 키와 비밀번호는 저장소에
커밋하지 않습니다.

## 주요 스크립트 명령어

### 데이터베이스 초기화 및 시딩

```bash
npx prisma migrate reset
```

이 명령어는 데이터베이스를 완전히 초기화하고, `public/content` 디렉토리의 모든 마크다운 파일로 데이터를 새로 채웁니다. 내부적으로 다음 세 가지 작업을 순서대로 수행합니다.

1.  기존 데이터베이스의 모든 데이터를 영구적으로 삭제합니다.
2.  최신 마이그레이션(`prisma/migrations`)을 적용하여 데이터베이스 스키마를 다시 생성합니다.
3.  `prisma/seed.js` 스크립트를 실행하여 로컬 문서 파일들을 데이터베이스에 삽입합니다.

> **⚠️ 경고:** 이 명령어는 모든 데이터를 삭제하므로, 주로 개발 환경에서 데이터베이스를 초기 상태로 되돌리고 싶을 때 사용해야 합니다.

### 데이터베이스 연결 및 데이터 확인

```bash
npm run check-db
```

`scripts/check-db.js` 스크립트를 실행하여 현재 데이터베이스에 정상적으로 연결되는지 확인하고, `Document` 테이블에 저장된 모든 문서의 개수와 내용 일부를 터미널에 출력합니다. 데이터베이스 상태를 간단히 확인할 때 유용합니다.

### 프로덕션용 CSS 빌드

```bash
npm run build:css:prod
```

`src/styles/main.scss` 파일을 `public/css/main.css`로 컴파일합니다. `--style compressed` 옵션이 적용되어 공백과 주석이 모두 제거된, 용량이 최적화된 CSS 파일을 생성합니다. 실제 서비스 배포 시 사용됩니다.

## 콘텐츠 동기화 명령어

데이터베이스와 로컬 `public/content` 디렉토리 간의 문서 데이터를 확인하고 동기화하는 명령어들입니다.

### 차이점 확인

```bash
npm run check-diff
```

데이터베이스와 로컬 파일 시스템을 비교하여 내용이 다르거나 한쪽에만 존재하는 파일 목록을 상세한 diff 로그와 함께 보여줍니다. 동기화 작업을 수행하기 전에 어떤 변경사항이 있는지 확인할 때 유용합니다.

### 로컬 → 데이터베이스로 동기화

```bash
npm run diff:to-db
```

로컬 `public/content` 폴더의 현재 상태를 데이터베이스에 그대로 덮어씁니다. 로컬에서 수정한 최신 내용을 데이터베이스에 반영할 때 사용합니다. 로컬에 없는 파일은 데이터베이스에서도 삭제됩니다.

### 데이터베이스 → 로컬로 동기화

```bash
npm run diff:from-db
```

데이터베이스의 현재 상태를 `public/content` 폴더로 그대로 가져와 덮어씁니다. 다른 팀원이 웹 에디터를 통해 수정한 내용을 자신의 로컬 파일 시스템으로 가져올 때 사용합니다. 데이터베이스에 없는 문서에 해당하는 로컬 파일은 삭제됩니다.
