# actions
Reuseable Workflows for Github Actions
通用 GitHub Actions 可复用工作流库

## 复合操作 Composite Action


| 名称 | 调用方式 | 描述 |
|------|-----------|------|
| [发布静态页面](./.github/actions/deploy/readme.md) | <pre>- id: deployment<br>  uses: [Wu-Yijun/actions/.github/actions/deploy@main](./.github/actions/deploy/action.yml)</pre> | 发布 dist 文件夹下的静态页面 |
||||
| 获取指定密钥 | <pre>- uses: [Wu-Yijun/actions/.github/actions/secrets/action@main](./.github/actions/secrets/action.yml)<br>  with:<br>    SECRETS_ACCESS_PAT: \${{ secrets.SECRETS_ACCESS_PAT }}<br>    AGE_PRIVATE_KEY: \${{ secrets.AGE_PRIVATE_KEY }}<br>    output-path: ./.temp.secrets  # Optional<br>    file-list: \| <br>      ./path/to/secret.file.bin<br>      ./path/to/secret_text.txt<br></pre> | 获取 `secrets` 库中的指定密钥, 并解密然后存到 output-path 的对应路径下. 如果是 .txt, 则解密为文本, 并输出到 outputs 内. |
||||
| 为APK签名 | <pre>- uses: [Wu-Yijun/actions/.github/actions/sign-apk/action@main](./.github/actions/sign-apk/action.yml)<br>  with:<br>    SIGNING_STORE_PASSWORD: \${{ secrets.SIGNING_STORE_PASSWORD }}<br>    SIGNING_KEY_ALIAS:      \${{ secrets.SIGNING_KEY_ALIAS }}<br>    SIGNING_KEY_PASSWORD:   \${{ secrets.SIGNING_KEY_PASSWORD }}<br>    keystore: ./path/to/your/keystore.jks<br>    input:    ./path/to/input/unsigned/app.apk<br>    output:   ./path/to/output/signed/app.apk<br></pre> | 从当前文件夹的 React 项目, 构建 Capacitor 应用为 Android App 并签名, 生成到 `./android/app/build/outputs/apk/release/app-release-signed.apk` (同路径下还有 `app-release-unsigned.apk`)<br>Note: 需要提供访问令牌和密钥 |
||||
| 从 React 项目构建 Apk | <pre>- uses: [Wu-Yijun/actions/.github/actions/react-apk/action@main](./.github/actions/react-apk/action.yml)<br>  with:<br>    SECRETS_ACCESS_PAT: \${{ secrets.SECRETS_ACCESS_PAT }}<br>    AGE_PRIVATE_KEY: \${{ secrets.AGE_PRIVATE_KEY }}<br>    app_name: My App<br>    app_package: com.exmaple.myapp<br></pre> | 从当前文件夹的 React 项目, 构建 Capacitor 应用为 Android App 并签名, 生成到 `./android/app/build/outputs/apk/release/app-release-signed.apk` (同路径下还有 `app-release-unsigned.apk`)<br>Note: 需要提供访问令牌和密钥 |
||||

## 可用工作流 Reusable Workflows


| 名称 | 调用方式 | 描述 |
|------|-----------|------|
| 从 React 项目构建 Apk \[已废弃\] | <pre>uses: [Wu-Yijun/actions/.github/workflows/react-apk.yml@main](./.github/workflows/react-apk.yml)<br>with:<br>  app_name: My App               # required<br>  app_package: com.exmaple.myapp # required<br>  retention-days: 7              # optional<br></pre> | 从现有仓库获取 React 项目, 使用 Capacitor 自动构建  Android App |

