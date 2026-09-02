# Pullit API 설계 가이드라인

이 문서는 Pullit 백엔드 시스템의 API를 설계하고 구현할 때 따라야 할 규칙과 모범 사례를 정의합니다. 일관성 있고 예측 가능한 API를 통해 클라이언트 개발의 편의성을 높이고 유지보수 비용을 절감하는 것을 목표로 합니다.

## 1. API 엔드포인트 설계

API 엔드포인트는 RESTful 원칙을 따라 리소스 중심으로 설계합니다.

- **리소스 식별**: URL은 동사가 아닌 리소스를 나타내는 명사로 표현하며, 복수형 사용을 원칙으로 합니다.
- **계층 구조**: 리소스 간의 관계는 URL 경로의 계층으로 표현합니다. (예: `/question-sets/{id}/questions`)
- **버전 관리**: API 버전은 URL 경로에 명시적으로 포함하여 하위 호환성을 보장합니다. (예: `/api/v1/...`)

| 목적                 | HTTP 메서드 | URL 예시                               | 설명                                     |
| -------------------- | ----------- | -------------------------------------- | ---------------------------------------- |
| 리소스 목록 조회     | `GET`       | `/api/v1/members`                      | 모든 회원 목록을 조회합니다.             |
| 특정 리소스 조회     | `GET`       | `/api/v1/members/{memberId}`           | 특정 ID의 회원을 조회합니다.             |
| 리소스 생성          | `POST`      | `/api/v1/question-sets`                | 새로운 문제 세트를 생성합니다.           |
| 리소스 전체 수정     | `PUT`       | `/api/v1/question-sets/{questionSetId}`| 문제 세트 전체를 새로운 정보로 교체합니다.|
| 리소스 부분 수정     | `PATCH`     | `/api/v1/members/{memberId}`           | 회원의 특정 필드를 수정합니다.           |
| 리소스 삭제          | `DELETE`    | `/api/v1/posts/{postId}`               | 특정 게시물을 삭제합니다.                |

> **나쁜 예**: `GET /getUserInfo`, `POST /createNewPost` 와 같이 동사를 사용하는 것은 지양합니다.

## 2. API 응답 형식

API 응답은 HTTP 상태 코드를 적극적으로 활용하여 요청의 성공, 실패 여부를 명확히 전달합니다.

### 2.1 성공 응답 (2xx)

요청이 성공적으로 처리되었을 경우, 응답 본문(Body)에는 **순수한 데이터 객체(DTO)를 직접 반환**합니다. 별도의 공통 래퍼(Wrapper) 객체로 감싸지 않아 클라이언트가 직관적으로 데이터를 사용할 수 있도록 합니다.

```json
// GET /api/v1/members/1 성공 응답 (HTTP 200 OK)
{
  "id": 1,
  "email": "tester@pullit.kr",
  "nickname": "테스터"
}
```

### 2.2 실패 응답 (4xx, 5xx)

요청 처리 중 오류가 발생했을 경우, 명확한 HTTP 상태 코드와 함께 **RFC 7807 표준을 따르는 `ProblemDetail` 형식**의 에러 정보를 본문에 반환합니다. 이를 통해 클라이언트는 일관된 방식으로 에러를 처리할 수 있습니다.

우리 서비스의 실제 실패 응답 예시는 다음과 같습니다.

```json
// GET /api/v1/members/999 실패 응답 (HTTP 404 Not Found)
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "ID '999'에 해당하는 회원을 찾을 수 없습니다.",
  "instance": "/api/v1/members/999",
  "code": "MEM_001"
}
```

- `type`: 문제 유형을 설명하는 URI 참조입니다. (기본값: "about:blank")
- `title`: 문제에 대한 간단한 요약입니다. (HTTP 상태 코드 이름과 동일)
- `status`: 이 문제가 발생했을 때 생성된 HTTP 상태 코드입니다.
- `detail`: 문제에 대한 사람이 읽을 수 있는 구체적인 설명입니다.
- `instance`: 문제가 발생한 특정 경로(엔드포인트)입니다.
- `code`: Pullit 서비스에서 자체적으로 정의한 비즈니스 에러 코드입니다.

## 3. 에러 코드 명세

예측 가능한 비즈니스 예외 상황에 대해서는 체계적인 에러 코드를 정의하여 클라이언트가 특정 에러 상황에 대응할 수 있도록 돕습니다.

에러 코드는 **`도메인 접두사` + `_` + `세 자리 숫자`** 형식으로 구성됩니다.

- **도메인 접두사**: 에러가 발생한 도메인을 나타내는 영문 대문자 3글자 약어입니다. (예: `MEM` - Member, `QSN` - Question)
- **세 자리 숫자**: 해당 도메인 내에서 고유한 번호입니다.

이 규칙은 `ErrorCode` 인터페이스를 구현하는 각 도메인의 `enum` 클래스에서 관리됩니다.

실제 `Member` 도메인에서 사용 중인 `MemberErrorCode.java`의 예시입니다.

```java
// src/main/java/kr/it/pullit/modules/member/exception/MemberErrorCode.java

public enum MemberErrorCode implements ErrorCode {
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "MEM_001", "%s '%s'에 해당하는 회원을 찾을 수 없습니다."),
    MEMBER_ALREADY_EXISTS(HttpStatus.CONFLICT, "MEM_002", "이미 존재하는 회원입니다."),
    // ...
    ;

    // ... 생성자 및 메서드 구현 ...
}
```

이처럼 `MEM_001` 코드는 `Member` 도메인에서 발생한 '리소스를 찾을 수 없음' 유형의 첫 번째 에러임을 명확히 나타냅니다. 새로운 에러 코드를 추가할 때는 각 도메인별 `ErrorCode` enum을 확인하여 마지막 번호 다음 순번을 부여해야 합니다.
