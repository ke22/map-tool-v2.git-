# DEVELOPMENT_GUIDE.md - 开发指南

> Workflow-based Map Tool v2 开发环境设置和工作流程

## 目录

- [开发环境设置](#开发环境设置)
- [项目结构说明](#项目结构说明)
- [代码规范](#代码规范)
- [开发工作流程](#开发工作流程)
- [测试指南](#测试指南)
- [调试指南](#调试指南)
- [性能优化指南](#性能优化指南)
- [API 使用策略](#api-使用策略)

---

## 开发环境设置

### 前置要求

- **Node.js**: v18 或更高版本
- **npm**: v9 或更高版本
- **Git**: 最新版本
- **编辑器**: VS Code 或 Cursor（推荐）

### 安装步骤

1. **克隆仓库**
```bash
git clone <repository-url>
cd map-tool-v2
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置 Gemini API Key
```

4. **验证安装**
```bash
npm test
```

### AI 工作流基础设施

项目使用 AI 辅助开发工作流，包含以下基础设施：

- **CLAUDE.md**: 项目开发规范（Single Source of Truth）
- **.shared-context/**: 共享上下文目录
  - `known-issues.md`: 已知问题和 TODOs
  - `project-notes.md`: 项目笔记和决策
- **.cursor/hooks/**: Cursor IDE 集成
  - `session-start.sh`: 会话启动钩子

### Cursor IDE 集成说明

项目配置了 Cursor IDE 集成，每次新会话启动时会自动加载项目上下文。

**特性**:
- 自动加载 CLAUDE.md
- 自动显示项目状态
- 自动检查环境配置

### 代码质量工具

#### ESLint

配置文件: `.eslintrc.js`

运行检查:
```bash
npm run lint
```

自动修复:
```bash
npm run lint:fix
```

#### Prettier

配置文件: `.prettierrc`

格式化代码:
```bash
npm run format
```

#### EditorConfig

配置文件: `.editorconfig`

确保编辑器使用一致的代码风格。

---

## 项目结构说明

```
map-tool-v2/
├── js/
│   ├── workflow/          # 工作流核心
│   ├── modules/           # 可复用模块
│   ├── agents/            # Agent 系统
│   ├── skills/            # Skill 系统
│   └── core/              # 核心层
├── css/                   # 样式文件
├── data/                  # 数据文件
├── docs/                  # 文档
├── tests/                 # 测试文件
├── scripts/               # 脚本文件
├── .github/               # GitHub 配置
│   └── workflows/         # CI/CD 工作流
├── .cursor/               # Cursor IDE 配置
│   └── hooks/             # 钩子脚本
├── .shared-context/       # 共享上下文
├── config.js              # 配置文件
├── package.json           # 项目配置
├── CLAUDE.md              # 项目开发规范
└── README.md              # 项目说明
```

详细结构说明请参考 [ARCHITECTURE.md](./ARCHITECTURE.md)。

---

## 代码规范

### JavaScript 规范

#### 命名约定

- **变量/函数**: `camelCase` (例如: `handleMapClick`, `switchToCountryStage`)
- **常量**: `UPPER_SNAKE_CASE` (例如: `IS_DEV_MODE`, `MAX_RETRIES`)
- **文件**: `kebab-case.js` (例如: `workflow-state.js`, `geo-extractor-agent.js`)
- **类/构造函数**: `PascalCase` (例如: `WorkflowState`, `StageManager`)

#### 代码组织

```javascript
// 1. 常量定义
const STAGES = {
  COUNTRY: 'country',
  ADMINISTRATION: 'administration',
  EXPORT: 'export'
};

// 2. 状态对象
const workflowState = {
  currentStage: STAGES.COUNTRY,
  countryStage: { ... },
  administrationStage: { ... },
  annotations: { ... }
};

// 3. 工具函数
function isValidStage(stage) { ... }

// 4. 事件处理
function handleStageSwitch(newStage) { ... }

// 5. 初始化
document.addEventListener('DOMContentLoaded', () => { ... });
```

#### 注释要求

- **必须注释**: 复杂算法、业务逻辑、非直观的代码
- **推荐注释**: 函数参数说明、返回值说明
- **禁止**: 显而易见的代码注释（如 `// 设置变量 x = 1`）

详细规范请参考 [CLAUDE.md](../CLAUDE.md)。

---

## 开发工作流程

### 1. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

### 2. 开发功能

- 编写代码
- 运行测试
- 修复 lint 错误

### 3. 提交代码

```bash
git add .
git commit -m "feat: your feature description"
```

**提交信息格式**: 遵循 [Conventional Commits](https://www.conventionalcommits.org/)

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

### 4. 推送和创建 PR

```bash
git push origin feature/your-feature-name
```

然后在 GitHub 上创建 Pull Request。

### CI/CD 工作流概览

- **YOLO Push**: 直接推送到主分支（不推荐）
- **代码审查**: 通过 PR 进行代码审查
- **CI 测试**: 自动运行测试
- **部署**: 自动部署到 GitHub Pages

详细说明请参考 [CI_CD_GUIDE.md](./CI_CD_GUIDE.md)。

### Git Hooks 配置

项目配置了 Git Hooks：

- **pre-commit**: 运行 lint 检查
- **commit-msg**: 验证提交信息格式

### 分支管理策略

- **main/master**: 主分支（生产环境）
- **develop**: 开发分支
- **feature/**: 功能分支
- **bugfix/**: Bug 修复分支

**基础设施文件同步**: 以下文件需要在所有分支同步：
- `.github/workflows/`
- `.cursor/hooks/`
- `.shared-context/`
- `CLAUDE.md`
- `.eslintrc.*`
- `.prettierrc.*`
- `.editorconfig`

详细说明请参考 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 测试指南

### 测试框架

使用 **Playwright** 进行 E2E 测试。

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npx playwright test tests/your-test.spec.js

# 运行测试并查看 UI
npx playwright test --ui

# 查看测试报告
npx playwright show-report
```

### 编写测试

测试文件应放在 `tests/` 目录下，使用 `.spec.js` 扩展名。

示例:
```javascript
import { test, expect } from '@playwright/test';

test('should switch to administration stage', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('[data-testid="next-stage-button"]');
  await expect(page.locator('[data-testid="administration-stage"]')).toBeVisible();
});
```

---

## 调试指南

### 浏览器调试

1. 打开浏览器开发者工具（F12）
2. 使用 Console 查看日志
3. 使用 Network 查看 API 请求
4. 使用 Sources 设置断点

### VS Code 调试

配置 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/@playwright/test/cli.js",
      "args": ["test", "--debug"]
    }
  ]
}
```

### 日志系统

使用内置的 Logger 系统：

```javascript
import { Logger } from './core/Logger';

const logger = new Logger('MyModule');
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
```

---

## 性能优化指南

### 性能测试方法

1. **Chrome DevTools Performance**
   - 记录性能分析
   - 查看 FPS、内存使用
   - 识别性能瓶颈

2. **Lighthouse**
   - 运行性能评估
   - 查看性能指标
   - 获取优化建议

### 性能分析工具使用

- **Chrome DevTools Performance**: 性能分析
- **Chrome DevTools Memory**: 内存分析
- **Chrome DevTools Network**: 网络分析

### 优化最佳实践

1. **代码分割**: 按需加载代码
2. **懒加载**: 延迟加载非关键资源
3. **缓存**: 使用缓存减少重复请求
4. **防抖节流**: 限制高频操作
5. **虚拟滚动**: 大量数据使用虚拟滚动

详细性能要求请参考 [SPECIFICATION.md](./SPECIFICATION.md)。

---

## API 使用策略

### Gemini API 使用

#### 频率限制处理

- 实现请求队列
- 使用指数退避重试
- 监控 API 调用频率

#### 成本控制策略

- 使用缓存减少 API 调用
- 批量处理请求
- 监控 API 使用量

#### 缓存策略

```javascript
class APICache {
  constructor(ttl = 3600000) { // 1 小时
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

#### 降级策略

- API 失败时降级到本地搜索
- 显示友好的错误消息
- 提供替代方案

---

## 参考文档

- [CLAUDE.md](../CLAUDE.md) - 项目开发规范
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构文档
- [CONTRIBUTING.md](./CONTRIBUTING.md) - 贡献指南
- [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) - CI/CD 完整指南

