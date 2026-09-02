# 프론트엔드 초기세팅 절차
프론트엔드 작업에 앞서, 아래와 같은 개발도구를 필요로 합니다. 
<table>
<tr>
    <th>순번</th>
    <th>개발도구명</th>
    <th>버전</th>
    <th>비고</td>
</tr>
<tr>
    <td>1</td>
    <td>Visual Studio Code</td>
    <td>버전 무관</td>
    <td></td>
</tr>
<tr>
    <td>2</td>
    <td>Node.js</td>
    <td>22.18.0</td>
    <td>22.1x 버전 사용 요망</td>
</tr>
<tr>
    <td>3</td>
    <td>Git Bash</td>
    <td>버전 무관</td>
    <td>깃 작업용</td>
</tr>
<tr>
    <td>4</td>
    <td>Insomnia</td>
    <td>버전 무관</td>
    <td>API 명세 확인용</td>
</tr>
</table>

## 브랜치를 받은 후 필요한 세팅
원활한 개발을 위해 프로젝트에서 아래와 같은 작업을 해야합니다. 순서대로 진행하여 초기 세팅을 마무리 해 주세요.

### 1. 로컬 환경에서의 HTTPS 설정을 해야합니다.<br>

<!-- 해당 문서로 하이퍼링크 걸어줄 것 : 백엔드 및 프론트 환경 구성 -->
<a href=#>백엔드 및 프론트 환경 구성</a> 문서를 참조하여 컴퓨터와 프로젝트에 HTTPS 인증서를 설치해 주세요.

### 2. .env.local 파일 생성 및 환경 변수 적용

해당 프로젝트의 최상단 위치에 .env.local 파일을 생성한 후 아래의 내용을 작성해 저장해 주세요.
```bash
// 파일명: .env.local
VITE_API_BASE_URL=https://portfolio.yeon.world/pull-it
VITE_BASIC_USER=pullit
# Basic Auth 비밀번호는 문서에 저장하지 않습니다. 로컬 비밀 저장소 또는 배포 환경변수로만 관리합니다.
```

#### [참고] Node.js 패키지 매니저에 대하여
저희 프로젝트에서 사용하는 Node.js 패키지 매니저는 pnpm 입니다.
작업하는 컴퓨터에서 처음 pnpm을 사용할 경우, shell에서 아래와 같이 입력해 pnpm을 설치해 주세요.
```bash
npm install -g pnpm
```
