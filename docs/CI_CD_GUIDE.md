# CI_CD_GUIDE.md - CI/CD 完整指南

> Workflow-based Map Tool v2 CI/CD 工作流完整指南

## 目录

- [工作流概览](#工作流概览)
- [工作流文件位置](#工作流文件位置)
- [配置说明](#配置说明)
- [本地测试方法](#本地测试方法)
- [故障排除](#故障排除)
- [最佳实践](#最佳实践)

---

## 工作流概览

### CI 工作流

**文件**: `.github/workflows/ci.yml`

**触发条件**:
- Push 到 `main`, `develop`, `master` 分支
- 创建 Pull Request 到 `main`, `develop`, `master` 分支

**工作流步骤**:
1. Checkout 代码
2. Setup Node.js (v18)
3. 安装依赖 (`npm ci`)
4. 安装 Playwright 浏览器
5. 运行 Playwright 测试
6. 上传测试结果（如果有）
7. 上传测试报告

### 部署工作流

**文件**: `.github/workflows/deploy.yml`

**触发条件**:
- Push 到 `main` 或 `master` 分支
- 手动触发 (`workflow_dispatch`)

**工作流步骤**:
1. Checkout 代码
2. Setup Node.js (v18)
3. 安装依赖（如果需要）
4. Setup GitHub Pages
5. Build（如果需要，当前为静态站点无需构建）
6. 上传 artifact
7. 部署到 GitHub Pages

---

## 工作流文件位置

所有 CI/CD 工作流文件位于：

```
.github/workflows/
├── ci.yml          # CI 测试工作流
└── deploy.yml      # 部署工作流
```

---

## 配置说明

### CI 工作流配置

#### Node.js 版本

```yaml
node-version: '18'
```

#### 测试超时

```yaml
timeout-minutes: 15
```

#### Playwright 浏览器

```yaml
run: npx playwright install --with-deps chromium
```

只安装 Chromium 浏览器以加快 CI 速度。

### 部署工作流配置

#### GitHub Pages 环境

```yaml
environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}
```

#### 并发控制

```yaml
concurrency:
  group: "pages"
  cancel-in-progress: false
```

防止多个部署同时进行。

---

## 本地测试方法

### 使用 act 测试 GitHub Actions

[act](https://github.com/nektos/act) 是一个可以在本地运行 GitHub Actions 的工具。

#### 安装 act

```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

#### 运行 CI 工作流

```bash
act push
```

#### 运行部署工作流

```bash
act workflow_dispatch
```

### 本地运行测试

直接运行测试命令：

```bash
# 安装依赖
npm ci

# 安装 Playwright 浏览器
npx playwright install --with-deps chromium

# 运行测试
npm test
```

---

## 故障排除

### CI 测试失败

#### 问题: 测试超时

**解决方案**:
- 检查测试是否正常
- 增加超时时间（在 `ci.yml` 中）
- 优化测试性能

#### 问题: Playwright 浏览器安装失败

**解决方案**:
- 检查网络连接
- 使用 `--with-deps` 选项安装系统依赖
- 检查系统资源

#### 问题: 依赖安装失败

**解决方案**:
- 检查 `package.json` 和 `package-lock.json` 是否同步
- 清除 npm 缓存: `npm cache clean --force`
- 使用 `npm ci` 而非 `npm install`

### 部署失败

#### 问题: GitHub Pages 部署失败

**解决方案**:
- 检查 GitHub Pages 设置（Settings > Pages）
- 检查工作流权限
- 查看工作流日志

#### 问题: 构建步骤失败

**解决方案**:
- 检查构建脚本
- 检查环境变量配置
- 查看构建日志

### 常见错误

#### Error: Resource not accessible by integration

**原因**: GitHub Actions 权限不足

**解决方案**: 在仓库 Settings > Actions > General 中配置权限

#### Error: Cannot find module

**原因**: 依赖未安装或版本不匹配

**解决方案**: 
- 确保 `package-lock.json` 已提交
- 使用 `npm ci` 安装依赖

---

## 最佳实践

### 1. 保持工作流快速

- 使用缓存加速依赖安装
- 只安装必要的 Playwright 浏览器
- 并行运行测试（如果可能）

### 2. 可靠的工作流

- 使用 `npm ci` 而非 `npm install`
- 指定 Node.js 版本
- 设置合理的超时时间

### 3. 清晰的错误信息

- 使用有意义的步骤名称
- 添加错误处理和日志
- 上传测试报告和日志

### 4. 安全性

- 使用 Secrets 存储敏感信息
- 限制工作流权限
- 定期更新 Actions 版本

### 5. 监控和维护

- 监控工作流运行时间
- 定期更新 Actions 版本
- 检查工作流日志

---

## 参考文档

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - 开发指南
- [GitHub Actions 文档](https://docs.github.com/en/actions)




