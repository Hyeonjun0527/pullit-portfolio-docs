# SSE 연결과 유지

Pull-it 애플리케이션에서는 **SSE(Server-Sent Events)**를 사용하여 문제집 생성 요청 이후, 사용자가 다른 페이지에서 다른 작업을 하더라도 **생성 완료 상태를 실시간으로 수신할 수 있도록** 설계되어 있습니다.

이 기능은 **사용자 경험(UX) 개선**을 목적으로 하며, 문제집 생성 완료 시 **react-toastify**를 통해 알림을 표시하고, 사용자가 알림을 클릭하면 즉시 해당 문제집 페이지로 이동하도록 구현됩니다.

SSE는 단일 HTTP 연결을 통해 서버에서 클라이언트로 지속적인 이벤트를 전송하므로, 모든 페이지에서 해당 연결이 **끊기지 않고 일관적으로 유지되는 것**이 매우 중요합니다.

---

## 기술 개요

- **SSE(Server-Sent Events)**  
  서버에서 클라이언트로 실시간 데이터를 전송하기 위한 단방향 통신 방식입니다.  
  WebSocket에 비해 단순하며, HTTP 기반으로 작동하기 때문에 추가적인 프로토콜 설정이 필요 없습니다.

- **EventSourcePolyfill**  
  브라우저 호환성을 위해 사용되는 SSE 폴리필 라이브러리입니다.  
  기본 `EventSource` 인터페이스를 확장하여 요청 헤더 설정(`Authorization`)을 지원합니다.

- **인증 처리**  
  JWT 토큰을 포함한 인증 헤더(`Authorization: Bearer <token>`)를 설정하여  
  인증된 사용자만 이벤트를 수신할 수 있도록 합니다.

---

## 주요 상수

```ts
const SSE_SUB_URL = `${import.meta.env.VITE_API_BASE_URL}/api/notifications/subscribe`;
```
- SSE_SUB_URL: 백엔드 SSE 구독 엔드포인트 경로입니다.  
  .env 환경 변수의 API 기본 경로를 사용하여 구성됩니다.

```ts
const EVENT_NAME = {
  QUESTION_SET_CREATION_COMPLETE: 'questionSetCreationComplete',
  HANDSHAKE_COMPLETE: 'handShakeComplete',
} as const;
```

이벤트 이름 | 설명
--- | ---
questionSetCreationComplete | 문제집 생성 완료 이벤트
handShakeComplete | SSE 연결 초기화 및 서버와의 연결 확인 이벤트

---

## NotificationSse 클래스 구조

### 생성자

```ts
constructor() {
  const token = getToken();
  if (!token) {
    throw new Error('[SSE] 인증 토큰이 없어 SSE 연결을 생성할 수 없습니다.');
  }

  this.eventSource = new EventSourcePolyfill(SSE_SUB_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    withCredentials: true,
  });
}
```

- SSE 연결을 초기화하며 인증 토큰을 확인합니다.  
- 토큰이 없으면 연결이 생성되지 않습니다.  
- Authorization 헤더를 통해 백엔드 인증을 수행합니다.

### 이벤트 리스너 등록 메서드

- `onOpen(callback: EventCallback)`: 연결 성공 시 호출  
- `onError(callback: EventCallback)`: 연결 오류 시 호출  
- `onHandShake(callback: EventCallback)`: 초기 핸드셰이크 완료 시 호출  
- `onQuestionCreationComplete(callback: (v: onQuestionSetCreationCompletePayload) => void)`: 문제집 생성 완료 이벤트 수신  
- `onCustom(eventName: string, callback: EventCallback)`: 커스텀 이벤트 구독  
- `removeListener(eventName: string, callback: EventCallback)`: 이벤트 리스너 제거  
- `readyState()`: 연결 상태 반환 (0=CONNECTING, 1=OPEN, 2=CLOSED)  
- `close()`: SSE 연결 종료

### 이벤트 데이터 예시

```json
{
  "success": true,
  "questionSetId": 1024,
  "message": "문제집 생성이 완료되었습니다."
}
```

---

#### [참고]
- 인증 만료 시 재인증 후 새 인스턴스 재생성
- 현 chrome의 정책에 따라 45000ms 마다 sse 연결이 끊기는 현상이 있으며, 바로 재연결을 통해 유지시키는 방법을 적용 중임.