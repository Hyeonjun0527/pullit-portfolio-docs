# 인증 절차 가이드

Pullit 백엔드의 인증 체계를 한눈에 이해할 수 있도록 OAuth2 소셜 로그인(Kakao), JWT 발급·검증, 환경별 보안 설정, 개발/테스트 유틸리티를 정리했습니다.

## 전체 흐름 한눈에 보기

| 단계 | 설명 |
| --- | --- |
| 1 | 사용자가 `/oauth2/authorization/kakao`로 이동해 Kakao OAuth2 로그인을 시작합니다. |
| 2 | Spring Security가 `CustomOAuth2UserService`를 호출해 Kakao 회원 정보를 조회·생성합니다. |
| 3 | `OAuth2AuthenticationSuccessHandler`가 액세스/리프레시 토큰을 발급하고, 리프레시 토큰은 HTTP-only 쿠키로 내려보냅니다. |
| 4 | 클라이언트는 발급된 액세스 토큰을 `Authorization: Bearer <token>` 헤더에 담아 API를 호출합니다. |
| 5 | `JwtAuthenticationFilter`가 토큰을 검증하고 성공 시 `SecurityContext`에 `PullitAuthenticationToken`을 적재합니다. |
| 6 | 컨트롤러가 `@AuthenticationPrincipal`을 통해 인증된 `memberId`를 주입받습니다. |
| 7 | 액세스 토큰 만료 시 `/auth/refresh`로 리프레시 토큰을 보내 새 액세스 토큰을 받습니다. |
| 8 | `/auth/logout` 호출 시 서버가 리프레시 토큰을 무효화하고 쿠키를 삭제합니다. |

## OAuth2 로그인 구성 요소

### 사용자 정보 매핑

`CustomOAuth2UserService`는 Kakao 응답을 `KakaoPrincipal`로 변환한 뒤 멤버 API로 회원을 조회하거나 생성하고, `DefaultOAuth2User`에 Kakao `id`와 역할 기반 권한을 채워서 반환합니다.

### 성공 처리기

`OAuth2AuthenticationSuccessHandler`는 로그인 성공 시 다음을 처리합니다.

- `AuthService`로부터 액세스·리프레시 토큰을 발급받아 리프레시 토큰을 멤버 엔터티에 저장합니다.
- 세션의 `redirect_uri_after_login` 값을 검증해 최종 리다이렉트 URL을 정하고, 액세스 토큰을 쿼리 파라미터에 첨부합니다.
- `CookieManager`를 사용해 `HttpOnly`, `Secure`, `SameSite=None` 속성을 가진 `refresh_token` 쿠키를 생성하고 `/auth/refresh` 경로로 한정해 응답에 실어 보냅니다.

쿠키 도메인은 요청 호스트와 `JwtProps` 설정을 바탕으로 동적으로 결정되며, 적절한 도메인을 찾지 못하면 기본값으로 돌아갑니다.

### 인가 요청 저장소

`OAuth2AuthorizationRequestRepository`는 인가 요청과 `redirect_uri` 값을 세션에 저장·복원해 성공 처리기가 사용할 수 있도록 `redirect_uri_after_login` 키로 노출합니다.


## JWT 토큰 수명 주기

### 발급

`AuthService`는 멤버 ID로 회원을 조회한 뒤 `JwtTokenProvider`로 액세스/리프레시 토큰을 생성하고 새 리프레시 토큰을 DB에 저장합니다.


`JwtTokenProviderImpl`은 HMAC256 서명을 사용하며 `memberId`, `email`, `role`, `tokenType` 등을 클레임에 포함하고 액세스·리프레시 토큰에 서로 다른 만료 시간을 부여합니다.


### 검증

`JwtTokenProviderImpl`의 `validateAccessToken`과 `validateRefreshToken`은 토큰 유형 불일치나 만료 여부를 검사해 `TokenValidationResult` 실패 정보를 반환하거나 예외를 발생시킵니다.

`JwtAuthenticator`는 검증된 토큰에서 `memberId`를 꺼내 실제 멤버를 조회해 권한을 구성하고, 실패 시 `JwtAuthenticationException`으로 Spring Security 예외 흐름에 위임합니다.

### API 요청 필터링

`JwtAuthenticationFilter`는 모든 API 요청 전에 Authorization 헤더를 검사해 `JwtAuthenticator`에 검증을 위임하고, 성공 시 `SecurityContext`에 `PullitAuthenticationToken`을 저장합니다. 실패하면 `JwtAuthenticationEntryPoint`가 401 응답을 반환합니다.

컨트롤러에서는 `PullitAuthenticationToken`의 `principal`(회원 ID)이 그대로 `@AuthenticationPrincipal Long memberId`에 주입됩니다.

## 토큰 갱신과 로그아웃

- `/auth/refresh`는 리프레시 토큰 쿠키를 읽어 새 액세스 토큰을 발급하며, 토큰이 유효하지 않거나 DB 값과 다르면 예외를 던집니다.
- `/auth/logout`은 인증된 회원의 리프레시 토큰을 제거하고 `@ClearCookie` AOP로 클라이언트 쿠키를 만료시킵니다.

## 환경별 보안 설정

`SecurityConfig`는 프로필별로 서로 다른 `SecurityFilterChain`을 정의합니다.

- **공통**: CORS 및 CSRF 비활성화, 세션 정책 설정, `/actuator/**` 공개.
- **운영/QA (`!local`)**: `/api/**`는 JWT 인증이 필요하고 `/api/admin/**`는 `ROLE_ADMIN` 권한이 요구되며, 웹 요청(`/` 포함)은 OAuth2 로그인으로 리다이렉트됩니다.
- **로컬 (`local`)**: 모든 요청을 허용하지만 필요 시 JWT 필터를 적용할 수 있고, `DevAuthenticationFilter`가 `Authorization: Bearer 1` 헤더를 감지해 가짜 인증을 주입해 로그인 없이 개발/테스트가 가능합니다

## 컨트롤러 인증 주입 보조

`NotNullAuthenticationPrincipalArgumentResolver` 덕분에 `@AuthenticationPrincipal`을 사용하는 컨트롤러는 항상 null이 아닌 Principal을 받으며, 인증 정보가 없으면 `AuthenticationCredentialsNotFoundException`이 즉시 발생해 잘못된 호출을 차단합니다.

## 공개/보호 엔드포인트 규칙

`AuthorizationRules`는 전역 허용 엔드포인트 목록을 관리합니다. `/auth/refresh`, `/auth/logout`, `/api/notifications/**` 등은 공개되며 그 외 `/api/**`는 인증이 필요합니다.

## 테스트 및 개발 편의 기능

테스트 환경에서는 `@WithMockMember`와 `AuthenticatedMvcSliceTest`를 사용해 JWT 필터 없이 가짜 인증을 주입할 수 있습니다. 상세한 사용법은 `docs/WithMockMember-Usage-Guide.md`를 참고하세요.