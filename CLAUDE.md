# CLAUDE.md - 项目开发规范

> 本文档是 AI 助手和开发团队的单一真相来源（Single Source of Truth）
> 每次新的工作阶段开始时会自动加载此文档

## 📋 项目概述

**项目名称**: Workflow-based Map Tool v2  
**类型**: 基于 Mapbox GL JS 的分阶段工作流地图工具  
**主要功能**:
- 分阶段工作流（国家区域 → 行政区 → 导出）
- 统一搜索和AI文本分析（通过GeoExtractorAgent）
- 独立标注层（标记和文字，跨阶段可见）
- 阶段独立的边界线控制
- 增强的导出功能（预览调整、Globe视图）

**技术栈**:
- Mapbox GL JS v3.2.0+
- Gemini API (通过代理服务器)
- Agent系统（GeoExtractor, Workflow, Export, Validation）
- Playwright (E2E 测试)
- Node.js (开发服务器)

---

## 🏗️ 架构决策 (ADR)

### 1. 分阶段工作流设计
- **原因**: 清晰的工作流程，用户明确知道操作阶段
- **实现**: WorkflowState管理三个阶段状态（countryStage, administrationStage, annotations）
- **注意**: 每个阶段独立存储数据，支持跳过和回溯编辑

### 2. 独立标注层
- **原因**: 标记和文字不属于任何特定阶段，跨阶段可见
- **实现**: annotations对象独立于阶段状态
- **注意**: 标注层独立控制，可在任何阶段添加/编辑

### 3. AI分析集成到搜索入口
- **原因**: AI分析作为搜索功能的增强，统一用户体验
- **实现**: GeoExtractorAgent集成到国家区域和行政区阶段的搜索入口
- **注意**: 支持预览和确认后再应用，避免误操作

### 4. 模块化架构
- **原因**: 可复用性，从v1迁移模块，保持代码清晰
- **实现**: workflow/核心、modules/可复用模块、agents/Agent系统、skills/Skill系统
- **注意**: 模块间通过EventBus通信，保持松耦合

### 5. 状态管理优化
- **原因**: 性能优化，避免存储完整的GeoJSON数据
- **实现**: Area对象使用引用而非完整GeoJSON，状态压缩机制
- **注意**: 实现状态序列化/反序列化，支持撤销/重做

---

## 💻 代码风格

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

---

## 📁 项目结构

```
map-tool-v2/
├── js/
│   ├── workflow/          # 工作流核心
│   │   ├── WorkflowState.js
│   │   ├── StageManager.js
│   │   └── StageController.js
│   ├── modules/           # 可复用模块（从v1迁移）
│   │   ├── boundary/
│   │   ├── markers/
│   │   ├── labels/
│   │   ├── export/
│   │   └── data/
│   ├── agents/            # Agent系统
│   │   ├── workflow/
│   │   ├── geo/
│   │   ├── export/
│   │   └── validation/
│   └── skills/            # Skill系统
│       ├── workflow/
│       ├── rendering/
│       └── optimization/
├── css/
├── data/
├── docs/
├── tests/
└── scripts/
```

---

## 🔄 开发工作流

### 阶段1：核心架构（1周）
- 工作流状态管理
- 基础 UI 框架
- 阶段导航组件

### 阶段2：模块迁移（1周）
- 迁移 GADM 加载器
- 迁移标记管理
- 迁移文字管理
- 迁移导出功能

### 阶段3：工作流实现（1周）
- 阶段切换逻辑
- 数据分离存储
- 边界线控制
- 搜索自动填充

### 阶段4：Agent系统（1周）
- WorkflowAgent
- 复用现有 Agent
- Agent 集成

### 阶段5：测试和优化（1周）
- 功能测试
- 性能优化
- 用户体验优化

---

## 📚 参考文档

- 规划文档: `/Users/yulincho/.cursor/plans/新地图工具完整规划文档_5064c5ab.plan.md`
- SPECIFICATION.md - 技术规格（待创建）
- ARCHITECTURE.md - 系统架构（待创建）
- DEVELOPMENT_GUIDE.md - 开发指南（待创建）



