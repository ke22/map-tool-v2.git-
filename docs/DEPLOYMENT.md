# DEPLOYMENT.md - 部署指南

> Workflow-based Map Tool v2 部署指南

## 目录

- [构建流程](#构建流程)
- [部署步骤](#部署步骤)
- [环境配置](#环境配置)
- [性能优化](#性能优化)
- [监控和日志](#监控和日志)

---

## 构建流程

### 静态站点构建

本项目是静态站点，无需构建步骤。

**注意**: 如果未来需要构建步骤（如代码压缩、打包），可以添加构建脚本。

### 预部署检查

部署前确保：

1. **测试通过**: 所有测试通过
```bash
npm test
```

2. **Lint 检查**: 代码通过 lint 检查
```bash
npm run lint
```

3. **功能验证**: 手动测试主要功能

---

## 部署步骤

### GitHub Pages 部署

项目配置了 GitHub Actions 自动部署到 GitHub Pages。

#### 自动部署

当代码推送到 `main` 或 `master` 分支时，自动触发部署工作流。

**工作流文件**: `.github/workflows/deploy.yml`

#### 手动部署

1. **触发工作流**

在 GitHub 上手动触发部署工作流：
- 进入 Actions 页面
- 选择 "Deploy to GitHub Pages" 工作流
- 点击 "Run workflow"

2. **等待部署完成**

部署通常需要 1-2 分钟。

3. **访问站点**

部署完成后，站点可通过 GitHub Pages URL 访问：
`https://<username>.github.io/map-tool-v2/`

### 其他部署方式

#### 静态文件服务器

将项目文件复制到静态文件服务器：

```bash
# 复制文件到服务器
rsync -avz . user@server:/var/www/map-tool-v2/
```

#### CDN 部署

将项目文件上传到 CDN（如 AWS CloudFront、Cloudflare）。

---

## 环境配置

### 环境变量

项目使用环境变量配置：

#### 必需配置

- `MAPBOX_TOKEN`: Mapbox 访问令牌

#### 可选配置

- `GEMINI_API_KEY`: Gemini API 密钥（如果使用直接 API 调用）
- `NODE_ENV`: 环境变量（`development` / `production`）

### 配置文件

#### config.js

主配置文件，包含默认配置：

```javascript
const CONFIG = {
  MAPBOX: {
    TOKEN: process.env.MAPBOX_TOKEN || 'default-token',
    STYLE: 'mapbox://styles/mapbox/light-v11'
  },
  GEMINI: {
    ENABLED: true,
    USE_BACKEND_PROXY: true,
    PROXY_ENDPOINT: '/api/gemini/generateContent'
  }
};
```

#### .env 文件

开发环境使用 `.env` 文件（不提交到 Git）：

```bash
MAPBOX_TOKEN=your-mapbox-token
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=development
```

### GitHub Pages 环境配置

GitHub Pages 使用仓库设置中的 Secrets 配置环境变量：

1. 进入仓库 Settings
2. 选择 Secrets and variables > Actions
3. 添加必要的 Secrets

**注意**: GitHub Pages 静态站点无法直接使用环境变量，需要通过后端代理服务器使用。

---

## 性能优化

### 资源优化

1. **代码压缩**: 使用构建工具压缩 JavaScript/CSS
2. **图片优化**: 优化图片大小和格式
3. **缓存策略**: 设置适当的缓存头

### CDN 使用

使用 CDN 加速静态资源加载：

- Mapbox GL JS: 使用 Mapbox CDN
- 其他资源: 考虑使用 CDN

### 懒加载

- 地图数据懒加载
- 图片懒加载
- 代码分割（如果使用构建工具）

### 性能监控

使用以下工具监控性能：

- **Google Analytics**: 用户行为分析
- **Lighthouse**: 性能评估
- **Chrome DevTools**: 性能分析

---

## 监控和日志

### 错误监控

建议集成错误监控服务：

- **Sentry**: 错误跟踪
- **LogRocket**: 会话重放
- **Rollbar**: 错误监控

### 日志系统

项目包含日志系统（开发环境）：

```javascript
import { Logger } from './core/Logger';

const logger = new Logger('ModuleName');
logger.error('Error message', error);
```

### 性能监控

监控关键指标：

- **页面加载时间**
- **API 响应时间**
- **错误率**
- **用户会话数据**

---

## 参考文档

- [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) - CI/CD 完整指南
- [SPECIFICATION.md](./SPECIFICATION.md) - 技术规格文档
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排除文档



