# actions/deploy

整合了打包发布与清理的过程, 最大程度的减少文件可见性, 可用于包装私有化文件发布系统

核心原理:
```
创建 Artifacts --id--> 提交构建页面请求 --500ms--> 立刻删除资源 ----> 等待页面构建完成
```

整个过程中资源对外可见性仅 1 秒, 外部用户难以获取文件包的访问权限

## 调用方式


```yaml
jobs:
  build-and-deploy:
    permissions:
      pages: write
      id-token: write 
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      # - name: 构建网页
      #   ...

      - name: Deploy to GitHub Pages
        id: deployment
        uses: Wu-Yijun/actions/.github/actions/deploy@main
        with:
          token: ${{ github.token }}  # 密钥, 默认使用 actions 自带的权限
          path: "dist/"               # 静态页面路径, 默认使用 dist 文件夹
          expire: 0.5                 # 文件暴露时间, 默认 0.5 秒(越长越稳定, 越短越安全)
```

> [!IMPORTANT]
> 请确保设置中配置了从 Actions 发布页面, 且仓库状态为公开