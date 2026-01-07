# README.md - 项目说明文档

> Workflow-based Map Tool v2 - 基于 Mapbox GL JS 的分阶段工作流地图工具

## 目录

- [项目概述](#项目概述)
- [快速开始](#快速开始)
- [功能概览](#功能概览)
- [文档索引](#文档索引)

---

## 项目概述

**Workflow-based Map Tool v2** 是一个基于 Mapbox GL JS 的分阶段工作流地图工具，帮助用户快速制作专业的地图可视化。

### 核心特性

- 🗺️ **分阶段工作流**: 清晰的三阶段工作流（国家区域 → 行政区 → 导出）
- 🔍 **智能搜索**: 支持地名搜索、坐标搜索和 AI 文本分析
- 📍 **标注管理**: 独立的标注层，支持标记和文字标签
- 🎨 **灵活样式**: 阶段独立的边界线控制和样式调整
- 📤 **高质量导出**: 支持多种格式和分辨率的地图导出
- 🌍 **Globe 视图**: 3D Globe 视图支持（导出阶段）

### 技术栈

- **Mapbox GL JS**: v3.2.0+（地图渲染引擎）
- **Node.js**: v18+（开发服务器）
- **Gemini API**: AI 文本分析
- **Playwright**: E2E 测试框架

---

## 快速开始

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd map-tool-v2

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置 Mapbox Token 和 Gemini API Key
```

### 运行

```bash
# 启动开发服务器（如果配置了）
npm start

# 或直接打开 index.html
```

### 测试

```bash
# 运行测试
npm test

# 查看测试报告
npx playwright show-report
```

---

## 功能概览

### 1. 分阶段工作流

- **国家区域阶段**: 选择国家/地区级别的区域
- **行政区阶段**: 选择行政区级别的区域
- **导出阶段**: 预览和导出最终地图

### 2. 搜索和 AI 分析

- **地名搜索**: 通过地名查找地理位置
- **坐标搜索**: 通过经纬度坐标定位
- **AI 文本分析**: 从文本中自动提取地理位置

### 3. 标注功能

- **标记管理**: 添加和管理地图标记点
- **文字标签**: 添加和管理文字标签
- **跨阶段可见**: 标注在所有阶段可见

### 4. 样式控制

- **边界线控制**: 每个阶段独立控制边界线显示
- **颜色和透明度**: 灵活的颜色和透明度调整
- **填充/轮廓模式**: 选择填充或轮廓显示模式

### 5. 导出功能

- **预览调整**: 预览地图并调整视图
- **Globe 视图**: 3D Globe 视图支持
- **多种格式**: 支持 PNG 和 JPG 格式
- **高质量导出**: 支持 150/300/600 DPI

---

## 文档索引

### 用户文档

- [用户指南](./USER_GUIDE.md) - 用户使用指南
- [使用情境](./USER_SCENARIOS.md) - 典型使用场景
- [用户体验设计](./UX_DESIGN.md) - UX 设计文档

### 技术文档

- [技术规格](./SPECIFICATION.md) - 完整技术规格
- [系统架构](./ARCHITECTURE.md) - 系统架构设计
- [功能设计](./FEATURES.md) - 功能详细设计
- [工作流设计](./WORKFLOW_DESIGN.md) - 工作流设计文档

### Agent 和 Skill 系统

- [Agent 系统设计](./AGENT_SYSTEM.md) - Agent 系统架构
- [Agent 技术规格](./AGENT_SPEC.md) - Agent 详细规格
- [Skill 系统设计](./SKILL_SYSTEM.md) - Skill 系统架构

### 开发文档

- [开发指南](./DEVELOPMENT_GUIDE.md) - 开发环境设置和工作流程
- [贡献指南](./CONTRIBUTING.md) - 代码贡献指南
- [API 参考](./API_REFERENCE.md) - API 参考文档

### 部署和运维

- [部署指南](./DEPLOYMENT.md) - 部署指南
- [CI/CD 指南](./CI_CD_GUIDE.md) - CI/CD 完整指南
- [故障排除](./TROUBLESHOOTING.md) - 故障排除文档

---

## 项目结构

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
└── scripts/               # 脚本文件
```

---

## 开发状态

**当前版本**: v2.0.0 (计划中)

**开发阶段**: 规划阶段

---

## 许可证

[待定]

---

## 贡献

欢迎贡献！请查看 [贡献指南](./CONTRIBUTING.md) 了解如何参与项目。

---

## 联系方式

[待定]

---

## 参考文档

- [CLAUDE.md](../CLAUDE.md) - 项目开发规范
- [技术规格](./SPECIFICATION.md) - 完整技术规格文档



