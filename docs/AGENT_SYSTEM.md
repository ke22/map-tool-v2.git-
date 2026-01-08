# AGENT_SYSTEM.md - Agent 系统设计文档

> Workflow-based Map Tool v2 Agent 系统架构设计

## 目录

- [Agent 架构设计](#agent-架构设计)
- [Agent 类型定义](#agent-类型定义)
- [Agent 通信协议](#agent-通信协议)
- [Agent 生命周期](#agent-生命周期)
- [Agent 错误处理](#agent-错误处理)
- [Agent 可观测性](#agent-可观测性)

---

## Agent 架构设计

### 整体架构

```
┌─────────────────────────────────────────┐
│          Agent System                   │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────┐                       │
│  │ Agent        │                       │
│  │ Registry     │                       │
│  └──────┬───────┘                       │
│         │                                │
│    ┌────┴────┬──────────┬──────────┐   │
│    ↓         ↓          ↓          ↓    │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌───┐│
│ │ GeoExt │ │ GeoRes │ │Workflow│ │Exp ││
│ │ Agent  │ │ Agent  │ │ Agent  │ │Agt ││
│ └────┬───┘ └────┬───┘ └────┬───┘ └───┬┘│
│      │          │           │         │ │
│      └──────────┴───────────┴─────────┘ │
│                  │                       │
│                  ↓                       │
│         ┌─────────────────┐             │
│         │   EventBus      │             │
│         └─────────────────┘             │
│                  │                       │
│                  ↓                       │
│         ┌─────────────────┐             │
│         │  UI/Workflow    │             │
│         └─────────────────┘             │
└─────────────────────────────────────────┘
```

### Agent 注册机制

```javascript
class AgentRegistry {
  constructor(eventBus) {
    this.agents = new Map();
    this.eventBus = eventBus;
  }
  
  register(name, agentClass) {
    const agent = new agentClass(this.eventBus);
    this.agents.set(name, agent);
    agent.initialize();
    return agent;
  }
  
  get(name) {
    return this.agents.get(name);
  }
  
  getAll() {
    return Array.from(this.agents.values());
  }
}
```

---

## Agent 类型定义

### Agent 基类

```javascript
class BaseAgent {
  constructor(eventBus, config = {}) {
    this.eventBus = eventBus;
    this.config = config;
    this.name = this.constructor.name;
    this.status = 'idle'; // idle, running, error
  }
  
  async initialize() {
    // 初始化 Agent
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // 监听相关事件
    this.eventBus.on(`agent:request:${this.name}`, this.handleRequest.bind(this));
  }
  
  async handleRequest(request) {
    try {
      this.status = 'running';
      const response = await this.process(request);
      this.status = 'idle';
      return response;
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }
  
  async process(request) {
    throw new Error('process method must be implemented');
  }
}
```

### Agent 类型列表

1. **GeoExtractorAgent** - 地理提取 Agent
2. **GeoResolverAgent** - 地理解析 Agent
3. **WorkflowAgent** - 工作流管理 Agent
4. **ExportAgent** - 导出优化 Agent
5. **ValidationAgent** - 验证 Agent

---

## Agent 通信协议

### 消息格式规范（JSON Schema）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "唯一请求 ID（UUID）"
    },
    "agent": {
      "type": "string",
      "enum": ["GeoExtractor", "GeoResolver", "Workflow", "Export", "Validation"],
      "description": "Agent 名称"
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
    },
    "options": {
      "type": "object",
      "properties": {
        "timeout": {
          "type": "number",
          "description": "超时时间（毫秒）"
        },
        "priority": {
          "type": "string",
          "enum": ["low", "normal", "high"],
          "default": "normal"
        }
      }
    }
  },
  "required": ["id", "agent", "action", "payload", "timestamp"]
}
```

### 响应格式

```json
{
  "id": "请求 ID",
  "agent": "Agent 名称",
  "success": true,
  "data": {
    // 响应数据
  },
  "metadata": {
    "processingTime": 1234,
    "timestamp": 1234567890
  }
}
```

### 错误响应格式

```json
{
  "id": "请求 ID",
  "agent": "Agent 名称",
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误消息",
    "details": {}
  },
  "metadata": {
    "processingTime": 1234,
    "timestamp": 1234567890
  }
}
```

### 同步/异步通信

**同步通信** (< 1 秒):
- 用于简单查询操作
- 直接返回结果
- 示例: GeoResolverAgent 的地名解析

**异步通信** (> 1 秒):
- 用于复杂处理（AI 分析）
- 使用 Promise 或事件回调
- 示例: GeoExtractorAgent 的文本分析

```javascript
// 同步通信示例
const result = await agentRegistry.get('GeoResolver').resolveLocation('Beijing');

// 异步通信示例
agentRegistry.get('GeoExtractor').extractLocations(text)
  .then(result => {
    // 处理结果
  })
  .catch(error => {
    // 处理错误
  });
```

### 超时处理机制

```javascript
class AgentRequest {
  constructor(agent, action, payload, options = {}) {
    this.id = uuidv4();
    this.agent = agent;
    this.action = action;
    this.payload = payload;
    this.timeout = options.timeout || 30000; // 默认 30 秒
    this.startTime = Date.now();
  }
  
  async execute() {
    return Promise.race([
      this.agent.process(this),
      this.createTimeoutPromise()
    ]);
  }
  
  createTimeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      }, this.timeout);
    });
  }
}
```

---

## Agent 生命周期

### 生命周期阶段

```
初始化 (initialize)
  ↓
就绪 (ready)
  ↓
运行 (running)
  ↓
完成 (completed) / 错误 (error)
  ↓
就绪 (ready)
```

### 生命周期管理

```javascript
class AgentLifecycleManager {
  constructor(agentRegistry) {
    this.agentRegistry = agentRegistry;
    this.lifecycleState = new Map();
  }
  
  async initializeAgent(name) {
    const agent = this.agentRegistry.get(name);
    if (!agent) {
      throw new Error(`Agent ${name} not found`);
    }
    
    this.lifecycleState.set(name, 'initializing');
    try {
      await agent.initialize();
      this.lifecycleState.set(name, 'ready');
    } catch (error) {
      this.lifecycleState.set(name, 'error');
      throw error;
    }
  }
  
  async shutdownAgent(name) {
    const agent = this.agentRegistry.get(name);
    if (agent && agent.shutdown) {
      await agent.shutdown();
      this.lifecycleState.set(name, 'shutdown');
    }
  }
}
```

---

## Agent 错误处理

### 错误传播机制

```javascript
class AgentError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'AgentError';
  }
}

// 错误代码定义
const ERROR_CODES = {
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_TIMEOUT: 'AGENT_TIMEOUT',
  AGENT_INVALID_REQUEST: 'AGENT_INVALID_REQUEST',
  AGENT_PROCESSING_ERROR: 'AGENT_PROCESSING_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR'
};
```

### 错误处理策略

1. **重试机制**: 网络错误可重试（最多 3 次）
2. **降级策略**: AI 分析失败时降级到本地搜索
3. **错误通知**: 向用户显示友好的错误消息
4. **错误日志**: 记录错误详情用于调试

```javascript
class ErrorHandler {
  async handleError(error, context) {
    // 记录错误
    this.logError(error, context);
    
    // 根据错误类型处理
    switch (error.code) {
      case ERROR_CODES.AGENT_TIMEOUT:
        return this.handleTimeout(error, context);
      case ERROR_CODES.EXTERNAL_API_ERROR:
        return this.handleExternalAPIError(error, context);
      default:
        return this.handleGenericError(error, context);
    }
  }
  
  async handleTimeout(error, context) {
    // 超时处理：提示用户重试
    return {
      userMessage: '操作超时，请重试',
      retryable: true
    };
  }
  
  async handleExternalAPIError(error, context) {
    // 外部 API 错误：降级处理
    if (context.agent === 'GeoExtractor') {
      return {
        userMessage: 'AI 分析暂时不可用，请使用搜索功能',
        fallback: 'search'
      };
    }
  }
}
```

---

## Agent 可观测性

### 监控指标定义

#### 执行时间监控

```javascript
class AgentMetrics {
  constructor() {
    this.metrics = {
      executionTime: new Map(),
      successRate: new Map(),
      errorRate: new Map()
    };
  }
  
  recordExecution(agentName, duration, success) {
    const agentMetrics = this.metrics.executionTime.get(agentName) || [];
    agentMetrics.push(duration);
    this.metrics.executionTime.set(agentName, agentMetrics);
    
    // 记录成功率
    this.updateSuccessRate(agentName, success);
  }
  
  getAverageExecutionTime(agentName) {
    const times = this.metrics.executionTime.get(agentName) || [];
    return times.reduce((a, b) => a + b, 0) / times.length;
  }
}
```

#### 成功率/失败率

- 记录每个 Agent 的成功/失败次数
- 计算成功率百分比
- 设置告警阈值（成功率 < 90%）

#### 置信度分布

- 记录 AI Agent 的置信度分布
- 分析置信度趋势
- 识别低置信度模式

#### 用户反馈收集

- 收集用户对 Agent 结果的反馈
- 用于改进 Agent 算法
- A/B 测试支持

### 日志系统设计

#### 结构化日志格式

```javascript
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "agent": "GeoExtractor",
  "action": "extractLocations",
  "requestId": "uuid",
  "data": {
    // 日志数据
  },
  "metadata": {
    "duration": 1234,
    "userAgent": "..."
  }
}
```

#### 日志级别定义

- **DEBUG**: 详细调试信息
- **INFO**: 一般信息（请求、响应）
- **WARN**: 警告信息（降级、重试）
- **ERROR**: 错误信息（异常、失败）
- **FATAL**: 致命错误（系统崩溃）

#### 日志收集

```javascript
class AgentLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
  }
  
  log(level, agent, action, data, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      agent,
      action,
      data,
      metadata
    };
    
    this.logs.push(logEntry);
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // 输出到控制台（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log(logEntry);
    }
  }
}
```

---

## 参考文档

- [AGENT_SPEC.md](./AGENT_SPEC.md) - Agent 技术规格
- [SPECIFICATION.md](./SPECIFICATION.md) - 技术规格文档
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构文档




