# Pullit 파일 업로드 가이드

이 문서는 Pullit 백엔드에서 학습 자료(PDF)를 업로드하는 전체 흐름을 정리합니다. 프런트엔드가 호출하는 API, S3 프리사인드 URL 발급 절차, 파일 메타데이터 검증, 업로드 완료 처리 및 후속 동작을 모두 포함합니다.

## 1. 전체 흐름 요약

| 단계 | 호출 주체 | 주요 처리 내용 |
| --- | --- | --- |
| 1. 업로드 URL 발급 | 클라이언트 → `/api/learning/source/upload` | 업로드할 파일의 이름, MIME 타입, 크기를 제출하고 일회용 업로드 URL과 파일 경로를 발급받습니다. |
| 2. 파일 업로드 | 클라이언트 → AWS S3 | 1단계 응답으로 받은 `uploadUrl`에 `PUT` 요청을 보내 실제 파일을 업로드합니다. |
| 3. 업로드 완료 통보 | 클라이언트 → `/api/learning/source/upload-complete` | 업로드 URL 응답에 포함된 모든 메타데이터를 그대로 전송해 데이터베이스에 파일 정보를 저장하고 상태를 READY로 전환합니다. |
| 4. 후속 활용 | 백엔드 내부 | 업로드된 소스는 조회·삭제 API에서 사용되며, 필요 시 마이그레이션 잡이 상태를 재조정합니다. |

> ⚠️ 업로드 완료 API는 1단계 응답 값을 그대로 재사용하지 않으면 실패합니다. 특히 `filePath`와 `contentType`이 누락되면 S3 검증과 DB 저장이 모두 중단됩니다.

## 2. 업로드 URL 발급 (`POST /api/learning/source/upload`)

- **역할 분담**
  - 컨트롤러는 인증된 회원 ID와 업로드 요청 DTO를 받아 서비스로 위임합니다.
  - 서비스는 프리사인드 URL과 업로드 세션 식별자(`uploadId`)가 담긴 응답 DTO를 조립합니다.
- **검증 규칙**
  - MIME 타입이 `application/pdf`인지 확인합니다.
  - 최대 허용 크기는 50MB입니다. 초과 시 URL이 발급되지 않습니다.
- **파일 경로 정책**
  - 모든 업로드는 `learning-sources/{yyyy/MM/dd}/member-{id}/{uuid}.pdf` 경로 규칙을 따릅니다.
- **요청/응답 스키마**
  - 요청 DTO: `fileName`, `contentType`, `fileSize` 필드가 필수이며 Bean Validation으로 검증합니다.
  - 응답 DTO: `uploadUrl`, `filePath`, `originalName`, `contentType`, `fileSizeBytes`, `uploadId`를 제공합니다.
- **참고 문서**
  - OpenAPI 명세(`static/openapi/paths/learning_source.yml`)에 동일한 단계 설명과 예시가 포함되어 있습니다.

## 3. S3 업로드 단계 (클라이언트 → AWS S3)

1단계에서 발급된 `uploadUrl`은 `PUT` 전용 프리사인드 주소입니다. 클라이언트는 브라우저 File API에서 얻은 `File` 혹은 `Blob` 객체를 본문으로 전송하고, `Content-Type` 헤더를 1단계 요청과 동일하게 설정해야 합니다. URL의 기본 유효기간은 15분이며, `S3StorageProps.presignedUrlExpiration` 값으로 조정할 수 있습니다.

## 4. 업로드 완료 처리 (`POST /api/learning/source/upload-complete`)

- 컨트롤러는 인증된 회원과 업로드 완료 요청을 받고 서비스로 전달합니다.
- 서비스는 먼저 S3에 파일이 실제로 존재하는지 확인한 뒤, 업로드 정보가 이미 있는지에 따라 다음을 수행합니다.
  - **신규 업로드**: 회원 정보를 검증하고 기본 폴더를 준비한 뒤 `Source.create()`로 엔터티를 생성합니다.
  - **기존 업로드**: 파일 메타데이터를 최신화하고 상태를 READY로 갱신합니다.
- 요청 DTO는 `uploadId`, `filePath`, `originalName`, `contentType`, `fileSizeBytes` 필드가 모두 필요합니다.
- 업로드 완료 API 역시 OpenAPI 명세에 예제가 포함되어 있어 프런트엔드가 참조할 수 있습니다.

## 5. 업로드 후 활용 및 정리 작업

- **조회**: `SourceService.getMySources()`가 회원별 학습 자료 목록을 제공합니다.
- **다운로드**: `SourceService.getContentStream()`이 권한 검증 후 S3에서 파일 스트림을 내려줍니다.
- **삭제**: `SourceService.deleteSource()`가 데이터베이스와 S3에서 동시에 파일을 제거합니다.
- **마이그레이션**: 배치 지원 메서드가 과거 `UPLOADED` 상태 데이터를 READY로 승격해 정합성을 유지합니다.

## 6. 운영 고려사항

- **인증 요구**: 모든 업로드·완료 API는 JWT 인증이 필요하며, 컨트롤러에서는 `@AuthenticationPrincipal Long memberId`를 사용해 인증된 회원만 접근하도록 합니다.
- **예외 처리**
  - 파일 검증 실패 시 400 오류를 반환하므로, 프런트엔드는 사용자에게 원인을 안내해야 합니다.
  - 업로드 완료 호출 전에 실제로 S3 업로드가 성공했는지 반드시 확인해야 합니다. 파일이 없으면 완료 처리가 실패합니다.
- **환경 변수**: `app.storage.s3.*` 프로퍼티에 버킷명, 자격 증명, 리전, 프리사인드 URL 만료시간 등을 설정합니다.
- **테스트 전략**: 업로드 API 테스트에서는 실제 S3 호출을 목킹하거나 QA 버킷을 사용하고, `WithMockMember` 유틸로 인증을 대체할 수 있습니다.

위 지침을 따르면 프런트엔드와 백엔드가 동일한 업로드 프로토콜을 공유하면서 사용자 PDF 자료를 안정적으로 수집하고 관리할 수 있습니다.