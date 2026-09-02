# PR 요청 및 승인 요령

본 프로젝트의 PR 템플릿은 `.github/PULL_REQUEST_TEMPLATE.md`에 정의되어 있으며, 기본적으로 모든 PR은 해당 양식을 따릅니다.

## PR 요청
### PR 템플릿 양식
```
## PR 설명

- <PR 설명>

## 작업 상세 내용

- <작업 상세 내용>

## 기타사항 / 참고사항

- <기타사항 / 참고사항>
```

- 위의 템플릿에 맞춰 PR을 요청하면, Github Action에 의해 CI/CD가 자동으로 진행되며, 모든 검사에 통과해야 합니다.
- 만약, Github Action, Vercel 중 하나라도 통과하지 못했다면 로그를 확인하여 수정 후 다시 요청합니다.
- 현재 PR이 해당 조건이 만족되지 않으면 병합이 안 되도록 설정되어 있습니다.
- 모든 PR의 병합은 최종적으로 1명 이상의 Approve를 받아야 병합될 수 있습니다.

## PR 승인
- PR 검토 Request를 받으면 검토자는 해당 PR에 대해 Approve나 Request Change 등의 의견을 남겨야 합니다.
- 기본적으로 최소 한 줄 이상의 comment를 작성해 주는 것을 권장하고 있습니다.
- PR 병합은 배포 완료의 증거가 아닙니다. Vercel 또는 Backend Deploy workflow의 성공과 `https://portfolio.yeon.world/pull-it`의 해당 기능을 각각 확인한 뒤에만 반영 완료로 기록합니다.
