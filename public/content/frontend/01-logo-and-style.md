# 로고 디자인과 기본 스타일
- 로고와 기본 색상을 정의해 놓은 문서입니다.
- 본 프로젝트에는 theme에 color, typograpy, radius, space가 정의되어 있습니다.

## 로고 정보
### 로고 이미지
<img src='/content/frontend/imgs/logo.png' style="width:400px"><br>
- 기본적으로 해당 로고를 기본으로 하며, 좌측의 아이콘만 독립적으로 사용이 가능합니다.
- 어떠한 협의 없이 아이콘의 색상과 디자인을 바꿀 수 없습니다.
- 해당 아이콘은 `/src/shared/assets/IconBadge.tsx`에 정의되어 있으며, 필요에 따라 사용할 수 있습니다.

### 기본 색상
- 현 서비스의 기본 색상은 `#16a34a`이며, 주요 버튼이나 디자인에서는 본 색상을 적용합니다.
- 보조적인 색상으로 `#dcfce7`을 사용하는데, 이는 어떤 페이지를 강조하고 싶을 때 주로 사용합니다.
- 기본적으로 `#ffffff`의 배경색을 사용합니다. 단, 로그인 후 사이드바 우측의 배경색은 모든 페이지의 통일성을 위해 `#f7f8f9`로 고정합니다.

## 기본 스타일
- 본 프로젝트에는 공통적인 스타일 토큰이 있으며, 최대한 본 토큰을 사용해 일관적인 디자인을 유지하는 것을 목표로 합니다.
- 스타일 토큰은 `/src/shared/styles/theme.ts`에 정의되어 있으며, 해당 토큰을 추가/삭제/수정하는 것은 무조건 협의를 거쳐야 합니다.
- 요소의 번호는 크기/진하기에 따른 순번 표시는 작은 것 -> 큰 것 / 밝은 것 -> 어두운 것 순으로 번호를 나열합니다. 단, 기존에 요소가 정의되어 등차적으로 나열되어 있는 상태에서 추후 추가되는 경우 기존의 번호는 그대로 유지하되, 해당 요소에 없는 다음 번호로 이름을 지정하고 스타일 토큰에는 밝기의 순서에 따라 나열합니다. <br>
    <b>[예시]</b><br>
    <img src="/content/frontend/imgs/color example.png" style="width:350px">

### 스타일 토큰 사용법
해당 스타일 토큰을 사용할 때는 사용할 때 별도로 theme를 import 할 필요는 없으며, 바로 사용 가능합니다.
#### [예시]
```ts
const QuestionAreaWrapper = styled.div`
  background-color: ${({ theme }) => theme.colors.gray.gray0};
  border: 1px solid ${({ theme }) => theme.colors.gray.gray4};
  padding: ${({ theme }) => theme.spacing.spacing4};
  border-radius: ${({ theme }) => theme.radius.radius2};
`;
```