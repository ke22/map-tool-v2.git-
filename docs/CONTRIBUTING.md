# CONTRIBUTING.md - 贡献指南

> Workflow-based Map Tool v2 贡献指南

## 目录

- [代码提交流程](#代码提交流程)
- [代码审查规范](#代码审查规范)
- [分支管理策略](#分支管理策略)
- [版本发布流程](#版本发布流程)

---

## 代码提交流程

### 1. Fork 和克隆仓库

```bash
# Fork 仓库到你的 GitHub 账户
# 然后克隆你的 Fork
git clone https://github.com/your-username/map-tool-v2.git
cd map-tool-v2
```

### 2. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

**分支命名规范**:
- `feature/`: 新功能
- `bugfix/`: Bug 修复
- `hotfix/`: 紧急修复
- `docs/`: 文档更新
- `refactor/`: 重构

### 3. 开发代码

- 遵循代码规范（参考 [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)）
- 编写测试
- 运行测试确保通过
- 运行 lint 检查

### 4. 提交代码

```bash
git add .
git commit -m "feat: your feature description"
```

**提交信息格式**: 遵循 [Conventional Commits](https://www.conventionalcommits.org/)

格式: `<type>(<scope>): <subject>`

类型:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

示例:
```
feat(workflow): add stage skip functionality
fix(export): fix Globe view export issue
docs(readme): update installation instructions
```

### 5. 推送和创建 Pull Request

```bash
git push origin feature/your-feature-name
```

然后在 GitHub 上创建 Pull Request。

---

## 代码审查规范

### Pull Request 要求

1. **描述清晰**: PR 描述应该清楚说明更改的内容和原因
2. **测试通过**: 所有测试必须通过
3. **代码质量**: 通过 lint 检查
4. **文档更新**: 如果更改了功能，需要更新文档

### 代码审查检查清单

- [ ] 代码遵循项目代码规范
- [ ] 有适当的测试覆盖
- [ ] 所有测试通过
- [ ] 通过 lint 检查
- [ ] 文档已更新（如需要）
- [ ] 提交信息符合规范
- [ ] 没有控制台错误或警告
- [ ] 性能影响已考虑

### YOLO Push 和代码审查工作流说明

**YOLO Push**: 直接推送到主分支（不推荐，仅用于紧急修复）

**代码审查工作流**: 
1. 创建 PR
2. 等待代码审查
3. 根据反馈修改代码
4. 审查通过后合并

---

## 分支管理策略

### 分支类型

- **main/master**: 主分支（生产环境代码）
- **develop**: 开发分支（集成分支）
- **feature/**: 功能分支（从 develop 分支创建）
- **bugfix/**: Bug 修复分支（从 develop 分支创建）
- **hotfix/**: 紧急修复分支（从 main 分支创建）

### 工作流

```
main/master
  │
  ├── develop
  │   ├── feature/feature-1
  │   ├── feature/feature-2
  │   └── bugfix/bug-1
  │
  └── hotfix/hotfix-1
```

### 基础设施文件列表

以下文件需要在所有分支同步（重要配置文件）：

- `.github/workflows/` - CI/CD 工作流
- `.cursor/hooks/` - Cursor IDE 钩子
- `.shared-context/` - 共享上下文
- `CLAUDE.md` - 项目开发规范
- `.eslintrc.*` - ESLint 配置
- `.prettierrc.*` - Prettier 配置
- `.editorconfig` - EditorConfig 配置

### 分支同步方法

#### 方法 1: 手动同步

```bash
# 从主分支获取最新基础设施文件
git checkout main
git checkout develop -- .github/workflows/ .cursor/hooks/ .shared-context/ CLAUDE.md .eslintrc.* .prettierrc.* .editorconfig
git commit -m "chore: sync infrastructure files from main"
```

#### 方法 2: 脚本同步

创建脚本 `scripts/sync-infrastructure.sh`:

```bash
#!/bin/bash
# 同步基础设施文件到当前分支

FILES=(
  ".github/workflows/"
  ".cursor/hooks/"
  ".shared-context/"
  "CLAUDE.md"
  ".eslintrc.js"
  ".prettierrc"
  ".editorconfig"
)

BRANCH=${1:-main}

for file in "${FILES[@]}"; do
  git checkout $BRANCH -- "$file"
done

git commit -m "chore: sync infrastructure files from $BRANCH"
```

#### 方法 3: GitHub Actions 自动同步

创建 GitHub Action 工作流自动同步基础设施文件（未来实现）。

---

## 版本发布流程

### 版本号规则

遵循 [Semantic Versioning](https://semver.org/):

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向后兼容的功能新增
- **PATCH**: 向后兼容的 Bug 修复

示例: `v2.1.3`

### 发布步骤

1. **更新版本号**

```bash
# 更新 package.json 中的版本号
npm version patch  # patch/minor/major
```

2. **更新 CHANGELOG.md**

添加版本变更日志。

3. **创建 Release 分支**

```bash
git checkout -b release/v2.1.3
```

4. **测试 Release 分支**

- 运行完整测试套件
- 手动测试主要功能
- 检查文档

5. **合并到主分支**

```bash
git checkout main
git merge release/v2.1.3
git tag v2.1.3
git push origin main --tags
```

6. **创建 GitHub Release**

在 GitHub 上创建 Release，包含:
- 版本号
- 变更日志
- 下载链接

7. **部署**

自动触发部署工作流（如果配置了）。

---

## 参考文档

- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - 开发指南
- [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) - CI/CD 完整指南
- [CLAUDE.md](../CLAUDE.md) - 项目开发规范




