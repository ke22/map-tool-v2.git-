# ARCHITECTURE.md - 系统架构文档

> Workflow-based Map Tool v2 系统架构详细设计

## 目录

- [整体架构设计](#整体架构设计)
- [模块划分](#模块划分)
- [组件关系图](#组件关系图)
- [数据流图](#数据流图)
- [状态管理架构](#状态管理架构)
- [工作流引擎设计](#工作流引擎设计)
- [性能优化架构](#性能优化架构)
- [扩展性设计](#扩展性设计)

---

## 整体架构设计

### 架构层次图

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

### 架构原则

1. **分层架构**: 清晰的层次划分，上层依赖下层
2. **模块化设计**: 高内聚、低耦合的模块
3. **事件驱动**: 通过 EventBus 进行模块间通信
4. **状态集中管理**: 单一状态源（Single Source of Truth）
5. **可扩展性**: 易于添加新功能和新 Agent

---

## 模块划分

### 目录结构

```
map-tool-v2/
├── js/
│   ├── workflow/              # 工作流核心
│   │   ├── WorkflowState.js   # 状态定义和管理
│   │   ├── StageManager.js    # 阶段管理器
│   │   └── StageController.js # 阶段控制器
│   │
│   ├── modules/               # 可复用模块（从 v1 迁移）
│   │   ├── boundary/          # 边界管理
│   │   │   ├── BoundaryManager.js
│   │   │   └── BoundaryRenderer.js
│   │   ├── markers/           # 标记管理
│   │   │   ├── MarkerManager.js
│   │   │   └── MarkerRenderer.js
│   │   ├── labels/            # 标签管理
│   │   │   ├── LabelManager.js
│   │   │   └── LabelRenderer.js
│   │   ├── export/            # 导出功能
│   │   │   ├── ExportManager.js
│   │   │   └── ExportRenderer.js
│   │   └── data/              # 数据加载
│   │       ├── GADMLoader.js
│   │       └── GeometryStore.js
│   │
│   ├── agents/                # Agent 系统
│   │   ├── workflow/          # 工作流 Agent
│   │   │   └── WorkflowAgent.js
│   │   ├── geo/               # 地理处理 Agent
│   │   │   ├── GeoExtractorAgent.js
│   │   │   └── GeoResolverAgent.js
│   │   ├── export/            # 导出 Agent
│   │   │   └── ExportAgent.js
│   │   └── validation/        # 验证 Agent
│   │       └── ValidationAgent.js
│   │
│   ├── skills/                # Skill 系统
│   │   ├── workflow/          # 工作流技能
│   │   ├── rendering/         # 渲染技能
│   │   └── optimization/      # 优化技能
│   │
│   └── core/                  # 核心层
│       ├── EventBus.js        # 事件总线
│       ├── StateManager.js    # 状态管理器
│       ├── Logger.js          # 日志系统
│       └── Config.js          # 配置管理
│
├── css/                       # 样式文件
├── data/                      # 数据文件
├── docs/                      # 文档
├── tests/                     # 测试文件
└── scripts/                   # 脚本文件
```

---

## 组件关系图

### 核心组件交互

```
┌─────────────┐
│  UI Layer   │
└──────┬──────┘
       │ 用户操作
       ↓
┌──────────────────┐      ┌──────────────┐
│ StageController  │ ←──→ │ StageManager │
└──────┬───────────┘      └──────┬───────┘
       │                          │
       ↓                          ↓
┌──────────────────┐      ┌──────────────┐
│ WorkflowState    │ ←──→ │ StateManager │
└──────┬───────────┘      └──────┬───────┘
       │                          │
       ↓                          ↓
┌──────────────────┐      ┌──────────────┐
│   EventBus       │ ←──→ │   Modules    │
└──────────────────┘      └──────────────┘
       │
       ↓
┌──────────────┐
│   Agents     │
└──────────────┘
```

### Agent 系统交互

```
┌──────────────────┐
│   UI/Workflow    │
└─────────┬────────┘
          │ 请求
          ↓
┌──────────────────┐
│  Agent Registry  │
└─────────┬────────┘
          │
    ┌─────┴─────┬──────────┬──────────┐
    ↓           ↓          ↓          ↓
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ GeoExt  │ │ GeoRes  │ │Workflow │ │ Export  │
│ Agent   │ │ Agent   │ │ Agent   │ │ Agent   │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
     │           │           │           │
     └───────────┴───────────┴───────────┘
                    │
                    ↓
            ┌───────────────┐
            │  EventBus     │
            └───────────────┘
```

---

## 数据流图

### 工作流状态流转

```
初始化
  │
  ├─→ [国家区域阶段]
  │     │
  │     ├─→ 搜索/AI分析 → GeoResolver/GeoExtractor
  │     │     │
  │     │     └─→ 填充区域 → WorkflowState.countryStage
  │     │
  │     └─→ 完成/跳过
  │           │
  │           ↓
  ├─→ [行政区阶段]
  │     │
  │     ├─→ 搜索/AI分析 → GeoResolver/GeoExtractor
  │     │     │
  │     │     └─→ 填充区域 → WorkflowState.administrationStage
  │     │
  │     └─→ 完成/跳过
  │           │
  │           ↓
  └─→ [导出阶段]
        │
        ├─→ 预览调整
        │
        └─→ 导出 → ExportAgent → 文件下载
```

### 状态更新流程

```
用户操作
  │
  ↓
UI Layer (事件触发)
  │
  ↓
StageController (处理逻辑)
  │
  ↓
StateManager (状态更新)
  │
  ↓
WorkflowState (状态变更)
  │
  ↓
EventBus (事件广播)
  │
  ↓
Modules/Agents (响应更新)
  │
  ↓
Mapbox GL JS (渲染更新)
```

---

## 状态管理架构

### WorkflowState 结构

```javascript
WorkflowState {
  currentStage: 'country' | 'administration' | 'export'
  
  countryStage: {
    status: 'pending' | 'active' | 'completed' | 'skipped'
    areas: Array<Area>
    boundaryVisible: boolean
    boundaryMode: 'fill' | 'outline'
    boundaryColor?: string
    boundaryOpacity?: number
  }
  
  administrationStage: {
    status: 'pending' | 'active' | 'completed' | 'skipped'
    areas: Array<Area>
    boundaryVisible: boolean
    boundaryMode: 'fill' | 'outline'
    boundaryColor?: string
    boundaryOpacity?: number
  }
  
  annotations: {
    markers: Array<Marker>
    textLabels: Array<TextLabel>
  }
  
  metadata: {
    createdAt: string
    updatedAt: string
    version: string
  }
}
```

### 状态压缩机制

**目标**: 减少状态大小，提高序列化/反序列化性能

**策略**:
1. **Geometry 引用**: Area 对象使用 `geometryRef` 而非完整 GeoJSON
2. **默认值省略**: 不存储默认值（如 `opacity: 1.0`）
3. **增量更新**: 仅存储变更的部分
4. **压缩算法**: 使用 JSON 压缩（移除空格、短键名）

```javascript
// 压缩前
{
  area: {
    id: "area-1",
    geometry: { type: "Polygon", coordinates: [...] }, // 完整 GeoJSON
    color: "#ff0000",
    opacity: 1.0, // 默认值
  }
}

// 压缩后
{
  area: {
    id: "area-1",
    geometryRef: "gadm-IDN.1.1", // 引用
    color: "#ff0000"
    // opacity 省略（默认值）
  }
}
```

### 状态引用管理

**GeometryStore**: 全局几何数据存储

```javascript
class GeometryStore {
  constructor() {
    this.store = new Map(); // gadmId -> GeoJSON
  }
  
  get(gadmId) {
    return this.store.get(gadmId);
  }
  
  set(gadmId, geometry) {
    this.store.set(gadmId, geometry);
  }
  
  // 批量加载
  async loadBatch(gadmIds) {
    // 从 GADM 数据加载
  }
}
```

### 撤销/重做实现

```javascript
class HistoryManager {
  constructor() {
    this.history = [];
    this.currentIndex = -1;
    this.maxHistory = 50;
  }
  
  push(state) {
    // 移除当前索引之后的历史
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // 添加新状态
    this.history.push(serializeState(state));
    this.currentIndex++;
    
    // 限制历史长度
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }
  }
  
  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return deserializeState(this.history[this.currentIndex]);
    }
    return null;
  }
  
  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return deserializeState(this.history[this.currentIndex]);
    }
    return null;
  }
}
```

---

## 工作流引擎设计

### StageManager

负责阶段状态管理和切换逻辑

```javascript
class StageManager {
  constructor(stateManager, eventBus) {
    this.stateManager = stateManager;
    this.eventBus = eventBus;
  }
  
  switchStage(targetStage) {
    const currentStage = this.stateManager.getCurrentStage();
    
    // 验证切换合法性
    if (!this.canSwitch(currentStage, targetStage)) {
      throw new Error(`Cannot switch from ${currentStage} to ${targetStage}`);
    }
    
    // 更新状态
    this.stateManager.updateState({
      currentStage: targetStage,
      [targetStage + 'Stage']: {
        ...this.stateManager.getState()[targetStage + 'Stage'],
        status: 'active'
      }
    });
    
    // 触发事件
    this.eventBus.emit('stage:switch', {
      from: currentStage,
      to: targetStage
    });
  }
  
  canSwitch(from, to) {
    // 定义切换规则
    const rules = {
      'country': ['administration', 'export'],
      'administration': ['export'],
      'export': [] // 导出阶段是最终阶段
    };
    
    return rules[from]?.includes(to) || false;
  }
}
```

### StageController

处理阶段相关的业务逻辑

```javascript
class StageController {
  constructor(stageManager, agentRegistry) {
    this.stageManager = stageManager;
    this.agentRegistry = agentRegistry;
  }
  
  async addArea(stage, area) {
    // 添加区域到指定阶段
    const state = this.stageManager.getState();
    state[stage + 'Stage'].areas.push(area);
    
    // 触发更新
    this.stageManager.updateState(state);
    
    // Agent 建议（异步）
    this.agentRegistry.get('WorkflowAgent').suggestNextAction();
  }
  
  skipStage(stage) {
    // 跳过阶段
    const state = this.stageManager.getState();
    state[stage + 'Stage'].status = 'skipped';
    this.stageManager.updateState(state);
  }
}
```

---

## 性能优化架构

### 图层管理策略

**图层合并策略**:
- 相同样式的区域合并到同一图层
- 使用数据驱动样式（data-driven styling）
- 按需加载图层（懒加载）

**图层数量控制**:
- 最大图层数: 50（可配置）
- 超出限制时自动合并
- 提供图层合并预览

### 内存管理机制

**大数据集清理**:
- 未使用的几何数据自动清理
- LRU 缓存策略（最近最少使用）
- 内存阈值监控（超过阈值触发清理）

```javascript
class MemoryManager {
  constructor(maxMemory = 500 * 1024 * 1024) { // 500MB
    this.maxMemory = maxMemory;
    this.monitorInterval = 5000; // 5秒检查一次
  }
  
  startMonitoring() {
    setInterval(() => {
      const usage = this.getMemoryUsage();
      if (usage > this.maxMemory) {
        this.cleanup();
      }
    }, this.monitorInterval);
  }
  
  cleanup() {
    // 清理未使用的几何数据
    // 清理历史记录
    // 触发垃圾回收
  }
}
```

### 数据加载架构

**GADM 数据优化方案**:
1. **预加载**: 常用国家/地区预加载
2. **按需加载**: 用户搜索时加载
3. **缓存策略**: 已加载数据缓存到内存
4. **瓦片化考虑**: 未来考虑 Vector Tiles（大规模数据）

**缓存策略**:
- 内存缓存: 已加载的几何数据
- IndexedDB: 持久化缓存（浏览器支持时）
- Service Worker: 离线缓存（未来）

---

## 扩展性设计

### 插件系统

**Agent 注册机制**:
```javascript
class AgentRegistry {
  constructor() {
    this.agents = new Map();
  }
  
  register(name, agentClass) {
    this.agents.set(name, new agentClass());
  }
  
  get(name) {
    return this.agents.get(name);
  }
}
```

**Skill 注册机制**:
```javascript
class SkillRegistry {
  constructor() {
    this.skills = new Map();
  }
  
  register(name, skill) {
    this.skills.set(name, skill);
  }
  
  execute(name, context) {
    const skill = this.skills.get(name);
    return skill.execute(context);
  }
}
```

### 事件系统扩展

**事件类型扩展**:
- 自定义事件类型
- 事件中间件（Middleware）
- 事件订阅/取消订阅

---

## 参考文档

- [SPECIFICATION.md](./SPECIFICATION.md) - 技术规格文档
- [FEATURES.md](./FEATURES.md) - 功能设计文档
- [WORKFLOW_DESIGN.md](./WORKFLOW_DESIGN.md) - 工作流设计文档




