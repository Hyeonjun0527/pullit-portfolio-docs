# Gemini 연동 가이드

신규 기여자가 Pullit 백엔드의 AI 문제 생성 파이프라인을 이해하고 운영 환경에서 동일한 품질을 재현할 수 있도록, 본 문서는 Google Gemini API를 선택한 배경과 실제 연동 방식을 설명합니다. 문제 집합 생성은 이벤트 기반으로 실행되며, 업로드된 학습 자료(PDF)를 Gemini로 전송해 JSON 형태의 문제 목록을 받아 저장합니다.

## 1. Gemini를 선택한 이유

- **이미지 포함 PDF 분석 지원**: AI가 이미지 기반 문제(예: 스캔된 문제집, 도표가 포함된 페이지)를 처리해야 하므로 텍스트만 추출하는 모델보다 멀티모달 처리가 가능한 Gemini를 채택했습니다. 팀 내부 비교에서 GPT 계열 모델과 Gemini 계열 모델을 비교한 결과 동일한 PDF에서 그림과 표를 Gemini가 더 정확하게 분석하여 답변을 생성했습니다.


- **Free Tier와 SDK 제공**: 개인 Google 계정만으로 분당 60회, 일일 1,000회까지 무료 호출이 가능해 초기 개발·QA 비용을 최소화할 수 있습니다. 또한 공식 Java SDK를 제공하므로 서버 코드에서 직접 API를 호출해 동일한 방식으로 로컬과 운영 환경을 구성할 수 있습니다. GPT의 경우 Free Tier 플랜이 없고, 반드시 과금을 해야하는 구조였습니다.
- **명시적 JSON 스키마 제어**: Gemini는 응답 스키마를 JSON Schema로 고정할 수 있어, 응답 포맷이 바뀌더라도 파싱 실패를 줄이고 예측 가능한 오류 메시지를 제공할 수 있습니다. 내부 `GeminiConfigBuilder`가 문제집 제목과 문항 구조를 모두 강제합니다.

## 2. 구성 요소 개요

Gemini 호출은 `QuestionService → LlmClient(GeminiClient) → Gemini API` 순으로 이뤄집니다.

| 계층 | 주요 역할 | 구현 위치 |
| --- | --- | --- |
| 도메인 서비스 | 문제집 생성 요청을 검증하고 학습 자료 스트림을 수집합니다. | `QuestionService.generateQuestions()` |
| LLM 어댑터 | 프롬프트, 첨부 파일, 모델명을 하나의 요청 객체로 조합해 Gemini SDK를 호출합니다. | `GeminiClient#getLlmGeneratedQuestionContent` |
| 요청 DTO | 모델 기본값과 multipart 파트(학습 자료 PDF)를 구성합니다. | `GeminiRequest.from()` |
| 설정 | API 키를 주입하고, JSON 스키마(문항 필드, 선택지 개수 등)를 빌드합니다. | `GeminiProperties`, `GeminiConfigBuilder` |

### 2.1 API 호출 세부 흐름

- `GeminiClient`는 생성자에서 Google GenAI Java SDK의 `Client`를 초기화하면서 API 키와 요청 타임아웃을 명시적으로 지정합니다. 모든 호출은 SDK의 `models.generateContent` 메서드를 통해 Gemini 호스팅 API로 전달됩니다.
- 서비스 계층에서 전달한 `LlmGeneratedQuestionRequest`는 `GeminiRequest.from()`을 통해 모델명, 텍스트 파트, 파일 스트림, 응답 스키마를 포함한 SDK 전용 DTO로 변환됩니다.
- API 응답은 `GenerateContentResponse`로 수신되며, `finishReason`이 `STOP`인지 확인한 뒤 JSON 페이로드를 `ObjectMapper`로 역직렬화해 문제집 결과 객체를 생성합니다.

## 3. 이벤트 기반 호출 흐름

1. 사용자가 문제집 생성을 요청하면, 트랜잭션 종료 후 `QuestionSetCreatedEvent`가 발행됩니다.
2. `QuestionGenerationEventHandler`가 비동기(@Async)로 이벤트를 수신하고, 문제집 메타데이터와 학습 자료 ID를 조회합니다.
3. `QuestionService`는 학습 자료 API를 통해 PDF 스트림을 모아 LLM 요청을 조립하고, Gemini 응답을 받아 문제집을 완료 상태로 전환합니다.
4. 생성된 문제는 전략 패턴(`QuestionCreationStrategyFactory`)을 사용해 문제 유형별 엔티티로 저장되며, 성공 알림이 SSE 채널 등으로 발송됩니다.

## 4. 입력 데이터 준비

- **파일 형식**: 현재 업로드 모듈은 PDF(`application/pdf`)만 허용하며, 50MB를 초과하면 거절합니다. PDF 외의 포맷(hwp, ppt 등)은 사전에 PDF로 변환한 뒤 업로드해야 합니다.
- **스트림 처리**: `QuestionService`는 학습 자료 ID마다 `SourcePublicApi.getContentStream()`을 호출해 InputStream 리스트를 만들고, Gemini 파트로 변환합니다.
- **프롬프트**: 문제 난이도·유형을 기반으로 LLM 프롬프트를 생성하고, 텍스트 파트로 함께 전송합니다.

## 5. 인증 정보와 환경 구성

- 애플리케이션은 `app.gemini.api-key` 속성에 API 키를 주입하며, 기본적으로 `GEMINI_API_KEY` 환경 변수를 참조합니다.
- 로컬 개발자는 `.env` 템플릿에서 제공된 키 슬롯에 개인 키를 입력하고, `./gradlew bootRun` 혹은 통합 테스트 실행 전에 환경을 로드해야 합니다. 키를 변경한 경우 IDE Run Configuration이나 쉘 세션에 재적용해 SDK가 최신 키로 초기화되도록 합니다.
- QA/운영 배포 스크립트(deploy-qa.sh 등)도 동일한 환경 변수를 요구하므로, GitHub Actions나 배포 파이프라인에서 비밀 값을 갱신할 때 잊지 말고 동기화합니다.

## 6. 오류 처리와 대응 전략

- Gemini가 FinishReason을 `STOP` 이외 값으로 반환하면 `LlmException`이 발생하며, 클라이언트는 500 응답과 함께 문제 생성 실패 메시지를 받습니다.
- 응답 본문이 JSON 스키마에 맞지 않거나 파싱이 실패하면 `LlmResponseParseException`이 발생합니다. 동일한 프롬프트와 파일 조합으로 재현하려면 `GeminiRequest` 빌드 결과를 로깅해 확인하고, 스키마가 최신 요구 사항을 반영하는지 검토하세요.
- 반복적으로 실패하는 학습 자료는 PDF 변환 품질(이미지 해상도, 텍스트 추출 가능 여부)을 먼저 점검하고, 필요 시 전처리(명암 보정, OCR) 후 다시 업로드합니다.

## 7. 개발자 체크리스트

1. 로컬/QA `.env` 혹은 비밀 변수에 `GEMINI_API_KEY`를 설정했는지 확인합니다.
2. mkcert로 발급한 HTTPS 인증서를 적용하고, Insomnia Base Environment에서 QA 도메인과 토큰을 최신 상태로 유지합니다.
3. 이미지 기반 PDF를 업로드한 뒤 문제집 생성 이벤트가 성공적으로 완료되는지, SSE 알림 및 QA 대시보드에서 결과가 노출되는지 확인합니다.
4. 서버 로그에 남는 Gemini SDK 요청·응답 정보를 확인해 FinishReason, 프롬프트 길이, 파일 개수를 점검하고, 스키마가 요구하는 필드를 모두 채웠는지 재검토합니다.

