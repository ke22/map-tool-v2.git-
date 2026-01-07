# API_REFERENCE.md - API 参考文档

> Workflow-based Map Tool v2 API 参考

## 目录

- [核心 API](#核心-api)
- [模块 API](#模块-api)
- [Agent API](#agent-api)
- [Skill API](#skill-api)

---

## 核心 API

### WorkflowState

工作流状态管理 API。

#### `WorkflowState.createInitialState()`

创建初始工作流状态。

**返回值**: `WorkflowState`

```javascript
const state = WorkflowState.createInitialState();
```

#### `WorkflowState.getCurrentStage(state)`

获取当前阶段。

**参数**:
- `state` (WorkflowState): 工作流状态

**返回值**: `string` - 当前阶段名称

```javascript
const currentStage = WorkflowState.getCurrentStage(state);
```

#### `WorkflowState.switchStage(state, targetStage)`

切换阶段。

**参数**:
- `state` (WorkflowState): 工作流状态
- `targetStage` (string): 目标阶段名称

**返回值**: `WorkflowState` - 新状态

```javascript
const newState = WorkflowState.switchStage(state, 'administration');
```

---

### StageManager

阶段管理器 API。

#### `new StageManager(stateManager, eventBus)`

创建阶段管理器实例。

**参数**:
- `stateManager` (StateManager): 状态管理器
- `eventBus` (EventBus): 事件总线

```javascript
const stageManager = new StageManager(stateManager, eventBus);
```

#### `stageManager.switchStage(targetStage)`

切换阶段。

**参数**:
- `targetStage` (string): 目标阶段名称

**返回值**: `Promise<void>`

```javascript
await stageManager.switchStage('administration');
```

#### `stageManager.canSwitch(from, to)`

检查是否可以切换阶段。

**参数**:
- `from` (string): 源阶段
- `to` (string): 目标阶段

**返回值**: `boolean`

```javascript
const canSwitch = stageManager.canSwitch('country', 'administration');
```

---

### EventBus

事件总线 API。

#### `eventBus.emit(event, data)`

发送事件。

**参数**:
- `event` (string): 事件名称
- `data` (any): 事件数据

```javascript
eventBus.emit('stage:switch', { from: 'country', to: 'administration' });
```

#### `eventBus.on(event, handler)`

订阅事件。

**参数**:
- `event` (string): 事件名称
- `handler` (Function): 事件处理函数

**返回值**: `Function` - 取消订阅函数

```javascript
const unsubscribe = eventBus.on('stage:switch', (data) => {
  console.log('Stage switched:', data);
});

// 取消订阅
unsubscribe();
```

---

## 模块 API

### BoundaryManager

边界管理器 API。

#### `new BoundaryManager(map, eventBus)`

创建边界管理器实例。

**参数**:
- `map` (MapboxMap): Mapbox 地图实例
- `eventBus` (EventBus): 事件总线

```javascript
const boundaryManager = new BoundaryManager(map, eventBus);
```

#### `boundaryManager.addArea(stage, area)`

添加区域。

**参数**:
- `stage` (string): 阶段名称
- `area` (Area): 区域对象

**返回值**: `Promise<void>`

```javascript
await boundaryManager.addArea('country', area);
```

#### `boundaryManager.setVisibility(stage, visible)`

设置边界可见性。

**参数**:
- `stage` (string): 阶段名称
- `visible` (boolean): 是否可见

```javascript
boundaryManager.setVisibility('country', true);
```

---

### MarkerManager

标记管理器 API。

#### `new MarkerManager(map, eventBus)`

创建标记管理器实例。

**参数**:
- `map` (MapboxMap): Mapbox 地图实例
- `eventBus` (EventBus): 事件总线

```javascript
const markerManager = new MarkerManager(map, eventBus);
```

#### `markerManager.addMarker(marker)`

添加标记。

**参数**:
- `marker` (Marker): 标记对象

**返回值**: `string` - 标记 ID

```javascript
const markerId = markerManager.addMarker({
  coordinates: [121.5654, 25.0330],
  type: 'point',
  color: '#ff0000'
});
```

#### `markerManager.removeMarker(markerId)`

删除标记。

**参数**:
- `markerId` (string): 标记 ID

```javascript
markerManager.removeMarker(markerId);
```

---

### ExportManager

导出管理器 API。

#### `new ExportManager(map, eventBus)`

创建导出管理器实例。

**参数**:
- `map` (MapboxMap): Mapbox 地图实例
- `eventBus` (EventBus): 事件总线

```javascript
const exportManager = new ExportManager(map, eventBus);
```

#### `exportManager.export(options)`

导出地图。

**参数**:
- `options` (ExportOptions): 导出选项

**返回值**: `Promise<Blob>` - 导出的文件 Blob

```javascript
const blob = await exportManager.export({
  format: 'png',
  dpi: 300,
  width: 1920,
  height: 1080
});
```

---

## Agent API

### AgentRegistry

Agent 注册表 API。

#### `agentRegistry.register(name, agentClass)`

注册 Agent。

**参数**:
- `name` (string): Agent 名称
- `agentClass` (Class): Agent 类

**返回值**: `Agent` - Agent 实例

```javascript
agentRegistry.register('GeoExtractor', GeoExtractorAgent);
```

#### `agentRegistry.get(name)`

获取 Agent。

**参数**:
- `name` (string): Agent 名称

**返回值**: `Agent` - Agent 实例

```javascript
const agent = agentRegistry.get('GeoExtractor');
```

---

### GeoExtractorAgent

地理提取 Agent API。

#### `agent.extractLocations(request)`

从文本提取地理位置。

**参数**:
- `request` (ExtractLocationsRequest): 请求对象

**返回值**: `Promise<ExtractLocationsResponse>`

```javascript
const response = await agent.extractLocations({
  text: '中国、日本、韩国',
  context: 'country',
  language: 'zh-CN'
});
```

---

### GeoResolverAgent

地理解析 Agent API。

#### `agent.resolveLocation(query)`

解析地理位置。

**参数**:
- `query` (string): 查询字符串（地名或坐标）

**返回值**: `Promise<ResolveLocationResponse>`

```javascript
const response = await agent.resolveLocation('Beijing');
```

---

### WorkflowAgent

工作流 Agent API。

#### `agent.suggestNextAction(state, userActions)`

建议下一步操作。

**参数**:
- `state` (WorkflowState): 工作流状态
- `userActions` (UserAction[]): 用户操作历史

**返回值**: `Promise<WorkflowSuggestResponse>`

```javascript
const response = await agent.suggestNextAction(state, userActions);
```

---

## Skill API

### SkillRegistry

Skill 注册表 API。

#### `skillRegistry.register(name, skillClass, dependencies)`

注册 Skill。

**参数**:
- `name` (string): Skill 名称
- `skillClass` (Class): Skill 类
- `dependencies` (string[]): 依赖的 Skill 名称列表

**返回值**: `Skill` - Skill 实例

```javascript
skillRegistry.register('StageTransition', StageTransitionSkill, ['StageValidation']);
```

#### `skillRegistry.get(name)`

获取 Skill。

**参数**:
- `name` (string): Skill 名称

**返回值**: `Skill` - Skill 实例

```javascript
const skill = skillRegistry.get('StageTransition');
```

---

### SkillExecutor

Skill 执行器 API。

#### `executor.execute(skillName, context)`

执行 Skill。

**参数**:
- `skillName` (string): Skill 名称
- `context` (SkillContext): 执行上下文

**返回值**: `Promise<SkillResult>`

```javascript
const result = await executor.execute('StageTransition', {
  fromStage: 'country',
  toStage: 'administration',
  state: workflowState
});
```

---

## 类型定义

### WorkflowState

```typescript
interface WorkflowState {
  currentStage: 'country' | 'administration' | 'export';
  countryStage: StageData;
  administrationStage: StageData;
  annotations: AnnotationsData;
  metadata: Metadata;
}
```

### Area

```typescript
interface Area {
  id: string;
  gadmId: string;
  name: string;
  level: number;
  color: string;
  opacity: number;
  geometryRef: string;
  bbox: [number, number, number, number];
}
```

### Marker

```typescript
interface Marker {
  id: string;
  type: 'point' | 'circle' | 'pin';
  coordinates: [number, number];
  color: string;
  size: number;
  icon?: string;
  zIndex: number;
}
```

---

## 参考文档

- [SPECIFICATION.md](./SPECIFICATION.md) - 技术规格文档
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构文档
- [AGENT_SYSTEM.md](./AGENT_SYSTEM.md) - Agent 系统设计



