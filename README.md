# actions
Reuseable Workflows for Github Actions
通用 GitHub Actions 可复用工作流库

## 可用工作流


| 名称 | 调用方式 | 描述 |
|------|-----------|------|
| 从 React 项目构建 Apk | <pre>uses: [Wu-Yijun/actions/.github/workflows/react-apk.yml@main](./.github/workflows/react-apk.yml)<br>with:<br>  app_name: My App               # required<br>  app_package: com.exmaple.myapp # required<br>  retention-days: 7              # optional<br></pre> | 从现有仓库获取 React 项目, 使用 Capacitor 自动构建  Android App |
