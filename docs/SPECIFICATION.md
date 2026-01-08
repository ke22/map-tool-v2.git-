# SPECIFICATION.md - 技术规格文档

> Workflow-based Map Tool v2 完整技术规格

## 目录

- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [数据流设计](#数据流设计)
- [API 接口规范](#api-接口规范)
- [数据结构定义](#数据结构定义)
- [性能要求](#性能要求)
- [兼容性要求](#兼容性要求)

---

## 项目概述

**项目名称**: Workflow-based Map Tool v2  
**版本**: 2.0.0  
**类型**: Web 应用 - 基于 Mapbox GL JS 的分阶段工作流地图工具

### 核心特性

- 分阶段工作流（国家区域 → 行政区 → 导出）
- 统一搜索和 AI 文本分析（通过 GeoExtractorAgent）
- 独立标注层（标记和文字，跨阶段可见）
- 阶段独立的边界线控制
- 增强的导出功能（预览调整、Globe 视图）

---

## 技术栈

### 核心框架和库

- **Mapbox GL JS**: v3.2.0+（地图渲染引擎）
- **Node.js**: v18+（开发服务器）
- **Express**: v5.2.1+（后端 API 服务器）

### AI 和外部服务

- **Gemini API**: 通过代理服务器（文本分析和地理提取）
- **GADM 数据**: 全球行政区划数据（GeoJSON 格式）

### 开发工具

- **Playwright**: E2E 测试框架
- **ESLint**: v9.39.2+（代码质量检查）
- **Prettier**: v3.7.4+（代码格式化）
- **EditorConfig**: 编辑器配置统一

### 浏览器兼容性

- Chrome/Edge: 最新 2 个版本
- Firefox: 最新 2 个版本
- Safari: 最新 2 个版本

---

## 系统架构

### 架构层次

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow Map Tool v2                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   UI Layer   │  │ Workflow     │  │  Agent       │      │
│  │              │  │ Engine       │  │  System      │      │
│  │ - Stage Nav  │→ │ - State      │→ │ - Extractors │      │
│  │ - Controls   │  │   Manager    │  │ - Resolvers  │      │
│  │ - Preview    │  │ - Stage      │  │ - Validators │      │
│  └──────────────┘  │   Controller │  └──────────────┘      │
│         ↓          └──────────────┘         ↓              │
│  ┌──────────────────────────────────────────────────┐      │
│  │           Module Layer (Reusable)                │      │
│  │  - GADMLoader  - MarkerManager  - TextManager   │      │
│  │  - LabelRenderer - ExportManager - DataManager  │      │
│  └──────────────────────────────────────────────────┘      │
│         ↓                                                    │
│  ┌──────────────────────────────────────────────────┐      │
│  │           Core Layer (Foundation)                │      │
│  │  - StateManager - EventBus - Logger - Config    │      │
│  └──────────────────────────────────────────────────┘      │
│         ↓                                                    │
│  ┌──────────────────────────────────────────────────┐      │
│  │           External Services                      │      │
│  │  - Mapbox GL JS - Gemini API - GADM Data        │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 核心模块

1. **Workflow Engine** - 工作流引擎
   - WorkflowState - 状态定义和管理
   - StageManager - 阶段管理器
   - StageController - 阶段控制器

2. **Agent System** - Agent 系统
   - GeoExtractorAgent - 地理提取
   - GeoResolverAgent - 地理解析
   - WorkflowAgent - 工作流管理
   - ExportAgent - 导出优化
   - ValidationAgent - 验证

3. **Module Layer** - 可复用模块
   - Boundary - 边界管理
   - Markers - 标记管理
   - Labels - 标签管理
   - Export - 导出功能
   - Data - 数据加载

4. **Core Layer** - 核心层
   - EventBus - 事件总线
   - StateManager - 状态管理
   - Logger - 日志系统
   - Config - 配置管理

---

## 数据流设计

### 工作流状态流转

```
初始化 → 国家区域阶段 → 行政区阶段 → 导出阶段 → 完成
   ↓          ↓              ↓            ↓
  跳过     → 跳过          → 跳过      → 完成
```

### 数据流向

1. **用户输入** → UI Layer → Workflow Engine → State Manager
2. **搜索请求** → UI Layer → GeoResolverAgent → GADM Data
3. **AI 分析** → UI Layer → GeoExtractorAgent → Gemini API → Workflow Engine
4. **导出请求** → UI Layer → ExportAgent → Export Manager → 文件下载

---

## API 接口规范

### 内部 API（模块间通信）

#### EventBus 事件

```javascript
// 阶段切换事件
EventBus.emit('stage:switch', { from: 'country', to: 'administration' });

// 状态更新事件
EventBus.emit('state:update', { stage: 'country', data: {...} });

// Agent 请求事件
EventBus.emit('agent:request', { agent: 'GeoExtractor', payload: {...} });

// Agent 响应事件
EventBus.emit('agent:response', { agent: 'GeoExtractor', result: {...} });
```

### 外部 API（后端服务）

#### Gemini API 代理

**端点**: `/api/gemini/generateContent`

**请求**:
```json
{
  "text": "用户输入的文本",
  "options": {
    "context": "country" | "administration",
    "language": "zh-CN" | "en-US"
  }
}
```

**响应**:
```json
{
  "locations": [
    {
      "name": "地理位置名称",
      "confidence": 0.95,
      "gadmId": "IDN.1.1",
      "bbox": [lng1, lat1, lng2, lat2]
    }
  ],
  "metadata": {
    "processingTime": 1234,
    "model": "gemini-pro"
  }
}
```

---

## 数据结构定义

### WorkflowState 完整定义

```typescript
interface WorkflowState {
  currentStage: 'country' | 'administration' | 'export';
  
  countryStage: {
    status: 'pending' | 'active' | 'completed' | 'skipped';
    areas: Area[];
    boundaryVisible: boolean;
    boundaryMode: 'fill' | 'outline';
    boundaryColor?: string;
    boundaryOpacity?: number;
  };
  
  administrationStage: {
    status: 'pending' | 'active' | 'completed' | 'skipped';
    areas: Area[];
    boundaryVisible: boolean;
    boundaryMode: 'fill' | 'outline';
    boundaryColor?: string;
    boundaryOpacity?: number;
  };
  
  annotations: {
    markers: Marker[];
    textLabels: TextLabel[];
  };
  
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

interface Area {
  id: string;
  gadmId: string;
  name: string;
  nameLocal?: string;
  level: number; // 0=country, 1=admin1, 2=admin2, etc.
  color: string;
  opacity: number;
  geometryRef: string; // 引用到 GeometryStore，而非完整 GeoJSON
  bbox: [number, number, number, number];
}

interface Marker {
  id: string;
  type: 'point' | 'circle' | 'pin';
  coordinates: [number, number];
  color: string;
  size: number;
  icon?: string;
  zIndex: number;
}

interface TextLabel {
  id: string;
  text: string;
  coordinates: [number, number];
  fontSize: number;
  color: string;
  backgroundColor?: string;
  padding: number;
  zIndex: number;
}
```

### 状态序列化/反序列化规范

```javascript
// 序列化（压缩）
function serializeState(state: WorkflowState): string {
  // 1. 压缩 geometryRef（仅存储 ID 引用）
  // 2. 移除未修改的默认值
  // 3. JSON 压缩
  return JSON.stringify(compressedState);
}

// 反序列化（展开）
function deserializeState(serialized: string): WorkflowState {
  // 1. JSON 解析
  // 2. 展开 geometryRef（从 GeometryStore 加载完整 GeoJSON）
  // 3. 填充默认值
  return expandedState;
}
```

### Agent 消息格式规范（JSON Schema）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "唯一请求 ID"
    },
    "agent": {
      "type": "string",
      "enum": ["GeoExtractor", "GeoResolver", "Workflow", "Export", "Validation"]
    },
    "action": {
      "type": "string",
      "description": "操作类型"
    },
    "payload": {
      "type": "object",
      "description": "请求载荷"
    },
    "timestamp": {
      "type": "number",
      "description": "时间戳（毫秒）"
    }
  },
  "required": ["id", "agent", "action", "payload", "timestamp"]
}
```

### 通信协议

- **同步通信**: 用于简单查询操作（< 1秒）
- **异步通信**: 用于 AI 处理和复杂操作（> 1秒）
- **超时处理**: 默认超时 30 秒，可配置
- **错误传播**: 统一错误格式，包含错误代码和消息

---

## 性能要求

### 数据加载性能

- **基准**: < 3 秒加载 1000 个区域
- **文件大小优化**:
  - 使用 mapshaper 优化 GeoJSON
  - 简化几何精度（根据缩放级别）
  - 考虑 Vector Tiles 替代方案（未来优化）

### 渲染性能

- **FPS 目标**: 保持 60fps，最低 30fps
- **图层数量控制**: 最大 50 个图层（可配置）
- **内存使用限制**: 最大 500MB（可配置，根据设备能力调整）

### 导出性能

- **导出时间基准**:
  - 150 DPI, 1920x1080: < 5 秒
  - 300 DPI, 1920x1080: < 10 秒
  - 600 DPI, 1920x1080: < 20 秒
- **导出质量与性能权衡**: 提供快速/标准/高质量三档
- **Globe 视图导出技术方案**:
  - 主要方案: html2canvas（可能有限制）
  - 备选方案: Mapbox Static Images API
  - 特殊处理: Globe 视图转换为 2D 投影后导出

### Agent 性能

- **GeoExtractorAgent**: < 5 秒（包括 API 调用）
- **GeoResolverAgent**: < 1 秒（本地查询）
- **WorkflowAgent**: < 500ms（实时建议）
- **ExportAgent**: 同导出性能基准

---

## 兼容性要求

### 浏览器支持

- **Chrome/Edge**: 最新 2 个版本（ES2020+）
- **Firefox**: 最新 2 个版本（ES2020+）
- **Safari**: 最新 2 个版本（ES2020+）

### 功能降级策略

- **Mapbox GL JS 不支持**: 提示用户升级浏览器
- **Gemini API 失败**: 降级到本地搜索，提示用户
- **GADM 数据加载失败**: 显示错误，提供重试机制

### 响应式支持

- **桌面端**: 完整功能（> 1024px）
- **平板端**: 完整功能（768px - 1024px）
- **移动端**: 核心功能（< 768px，部分功能简化）

---

## 版本历史

- **v2.0.0** (计划中): 初始版本，完整工作流系统
- **v1.x**: 前身版本（单阶段地图工具）

---

## 参考文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构详细设计
- [FEATURES.md](./FEATURES.md) - 功能设计文档
- [API_REFERENCE.md](./API_REFERENCE.md) - API 参考文档
- [CLAUDE.md](../CLAUDE.md) - 项目开发规范




