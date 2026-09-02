## Checkstyle

1. Marketplace에서 `Checkstyle-IDEA` 플러그인을 설치합니다.
2. Settings > Tools > Checkstyle 로 이동합니다.
3. Configuration File 항목에서 '+' 버튼을 클릭합니다.
4. 'Use a local check configuration file'을 선택하고, 프로젝트 내 `config/checkstyle/google_checks.xml` 파일을 선택합니다.
5. Description에 'Google Style - custom'을 입력하고 설정을 완료합니다.

## Google Java Format

1. Marketplace에서 `google-java-format` 플러그인을 설치합니다.
2. `Help > Edit Custom VM Options` 메뉴를 엽니다.
3. 기존 내용 하단에 아래 내용을 추가합니다.

```
--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNANMED
--add-exports=jdk.compiler/com.sun.tools.javac.code=ALL-UNANMED
--add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNANMED
--add-exports=jdk.compiler/com.sun.tools.javac.parser=ALL-UNANMED
--add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNANMED
--add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNANMED
```

*참조: [Official Guide](https://github.com/google/google-java-format/blob/master/README.md#intellij-jre-config)*
