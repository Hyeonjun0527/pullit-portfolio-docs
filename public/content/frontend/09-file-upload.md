# 파일 업로드와 통신

- 백엔드에서 AWS S3를 통한 파일 업로드를 요청함에 따라, 프론트엔드 애플리케이션에서 AWS S3에 PDF 파일을 업로드하기 위해 **프리사인드(Pre-signed URL)** 방식을 사용해야 합니다.
- Pull-it은 문제집 생성 페이지에서 PDF 업로드 시 해당 방식을 사용합니다.

## 프리사인드(Pre-signed URL)란?

**프리사인드 URL**은 AWS S3에서 제공하는 기능으로,  
백엔드 서버가 인증된 사용자 대신 **일시적으로 유효한 업로드/다운로드 URL**을 생성하여 클라이언트에게 전달하는 방식입니다.  

이 URL을 이용하면 클라이언트는 AWS 자격 증명 없이도 제한된 시간 동안 S3에 직접 접근할 수 있습니다.  
이를 통해 **서버 부하를 줄이고**, **보안적으로 안전한 파일 업로드**를 구현할 수 있습니다.


## 사용 기술

- **Axios**  
  HTTP 통신을 위한 라이브러리로, 백엔드 API와 S3 업로드 요청에 사용됩니다.

- **TypeScript**  
  인터페이스를 정의하여 타입 안정성을 보장합니다.

- **AWS S3 Pre-signed URL**  
  인증된 사용자가 직접 S3에 파일을 업로드할 수 있도록 백엔드에서 임시 URL을 발급받아 사용하는 방식입니다.

## 파일 업로드 절차

프론트엔드에서 AWS S3로 파일을 업로드하는 절차는 일반적으로 다음 세 단계로 구성됩니다.

### 1. 프리사인드 URL 요청

1. 업로드할 파일의 메타데이터(이름, 크기, 타입 등)를 백엔드로 전송합니다.  
2. 백엔드는 해당 정보를 기반으로 S3 업로드용 **프리사인드 URL**을 생성합니다.  
3. 클라이언트는 응답으로 받은 URL과 관련 메타데이터를 사용해 이후 단계를 수행합니다.

    ```ts
    const { data } = await api.post('/learning/source/upload', {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
    });
    ```

    백엔드 응답 예시
    ```json
    {
        "uploadUrl": "https://s3.amazonaws.com/bucket-name/...",
        "uploadId": "uuid-1234",
        "filePath": "uploads/example.pdf",
        "originalName": "example.pdf",
        "contentType": "application/pdf",
        "fileSizeBytes": 245760
    }
    ```

### 2. S3로 직접 파일 업로드

- 백엔드에서 받은 uploadUrl을 사용해, 클라이언트는 직접 S3에 파일을 업로드합니다.
이때는 일반적인 API 요청이 아닌, S3에 대한 HTTP PUT 요청을 수행합니다.

    ```ts
    await axios.put(uploadUrl, file, {
        headers: {
            'Content-Type': file.type,
        },
    });
    ```

- 이 단계에서 백엔드는 개입하지 않으며, 파일이 S3 버킷에 직접 저장됩니다.

### 3. 업로드 완료 알림

- S3 업로드가 성공적으로 완료되면, 클라이언트는 다시 백엔드로 “업로드 완료” 알림 요청을 전송합니다.

- 백엔드는 이 요청을 받아 업로드 상태를 기록하거나 추가적인 데이터 처리(예: 학습 리소스 등록, 사용자 기록 저장 등)를 수행할 수 있습니다.
    ```ts
    await api.post('/learning/source/upload-complete', {
        uploadId,
        filePath,
        originalName,
        contentType,
        fileSizeBytes,
    });
    ```

- 업로드 결과 예시

    업로드 완료 후, 프론트엔드는 다음과 같은 형태의 정보를 구성해 화면에 표시할 수 있습니다.
    ```ts
    {
        id: uploadId,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        date: new Date().toISOString().split('T')[0].replace(/-/g, '. ') + '.',
        new: true
    }
    ```