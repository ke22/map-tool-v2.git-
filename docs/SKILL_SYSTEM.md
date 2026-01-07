# SKILL_SYSTEM.md - Skill 系统设计文档

> Workflow-based Map Tool v2 Skill 系统架构设计

## 目录

- [Skill 架构设计](#skill-架构设计)
- [Skill 类型定义](#skill-类型定义)
- [Skill 注册机制](#skill-注册机制)
- [Skill 执行流程](#skill-执行流程)
- [Skill 组合机制](#skill-组合机制)
- [Skill 接口规范](#skill-接口规范)

---

## Skill 架构设计

### 整体架构

```
┌─────────────────────────────────────────┐
│          Skill System                  │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────┐                       │
│  │ Skill        │                       │
│  │ Registry     │                       │
│  └──────┬───────┘                       │
│         │                                │
│    ┌────┴────┬──────────┬──────────┐   │
│    ↓         ↓          ↓          ↓    │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌───┐│
│ │Workflow│ │Render  │ │Optimize│ │...││
│ │ Skills │ │ Skills │ │ Skills │ │   ││
│ └────┬───┘ └────┬───┘ └────┬───┘ └───┬┘│
│      │          │           │         │ │
│      └──────────┴───────────┴─────────┘ │
│                  │                       │
│                  ↓                       │
│         ┌─────────────────┐             │
│         │  Skill Executor │             │
│         └─────────────────┘             │
└─────────────────────────────────────────┘
```

---

## Skill 类型定义

### Skill 分类

#### 1. 工作流技能 (Workflow Skills)

- **StageTransitionSkill**: 阶段转换技能
- **StageValidationSkill**: 阶段验证技能
- **DataSyncSkill**: 数据同步技能

#### 2. 渲染技能 (Rendering Skills)

- **MapRenderSkill**: 地图渲染技能
- **LabelRenderSkill**: 标签渲染技能
- **MarkerRenderSkill**: 标记渲染技能

#### 3. 优化技能 (Optimization Skills)

- **PerformanceOptimizeSkill**: 性能优化技能
- **LayoutOptimizeSkill**: 布局优化技能
- **MemoryOptimizeSkill**: 内存优化技能

### Skill 基类

```javascript
class BaseSkill {
  constructor(config = {}) {
    this.name = this.constructor.name;
    this.config = config;
    this.dependencies = [];
  }
  
  async execute(context) {
    throw new Error('execute method must be implemented');
  }
  
  canExecute(context) {
    return true;
  }
  
  getDependencies() {
    return this.dependencies;
  }
}
```

---

## Skill 注册机制

### Skill 注册

```javascript
class SkillRegistry {
  constructor() {
    this.skills = new Map();
    this.skillGraph = new Map(); // 依赖图
  }
  
  register(name, skillClass, dependencies = []) {
    const skill = new skillClass();
    this.skills.set(name, skill);
    this.skillGraph.set(name, dependencies);
    return skill;
  }
  
  get(name) {
    return this.skills.get(name);
  }
  
  getAll() {
    return Array.from(this.skills.values());
  }
  
  resolveDependencies(skillName) {
    // 解析技能依赖关系
    const dependencies = this.skillGraph.get(skillName) || [];
    const resolved = [];
    const visited = new Set();
    
    const visit = (name) => {
      if (visited.has(name)) return;
      visited.add(name);
      
      const deps = this.skillGraph.get(name) || [];
      deps.forEach(dep => visit(dep));
      
      resolved.push(name);
    };
    
    dependencies.forEach(dep => visit(dep));
    visit(skillName);
    
    return resolved.map(name => this.skills.get(name));
  }
}
```

---

## Skill 执行流程

### 执行流程

```
1. 接收执行请求
   ↓
2. 解析技能依赖
   ↓
3. 检查执行条件
   ↓
4. 执行依赖技能（按顺序）
   ↓
5. 执行目标技能
   ↓
6. 处理执行结果
   ↓
7. 返回结果
```

### 执行器实现

```javascript
class SkillExecutor {
  constructor(skillRegistry) {
    this.skillRegistry = skillRegistry;
  }
  
  async execute(skillName, context) {
    // 解析依赖
    const skills = this.skillRegistry.resolveDependencies(skillName);
    
    // 执行依赖技能
    const dependencyResults = {};
    for (const skill of skills.slice(0, -1)) {
      if (skill.canExecute(context)) {
        const result = await skill.execute(context);
        dependencyResults[skill.name] = result;
      }
    }
    
    // 执行目标技能
    const targetSkill = skills[skills.length - 1];
    if (!targetSkill.canExecute(context)) {
      throw new Error(`Skill ${skillName} cannot be executed`);
    }
    
    // 合并上下文
    const mergedContext = {
      ...context,
      ...dependencyResults
    };
    
    const result = await targetSkill.execute(mergedContext);
    return result;
  }
}
```

---

## Skill 组合机制

### 组合方式

#### 顺序执行

技能按顺序执行，前一个技能的输出作为下一个技能的输入。

```javascript
class SequentialSkillComposer {
  async execute(skills, context) {
    let currentContext = context;
    
    for (const skill of skills) {
      if (!skill.canExecute(currentContext)) {
        throw new Error(`Skill ${skill.name} cannot be executed`);
      }
      
      const result = await skill.execute(currentContext);
      currentContext = {
        ...currentContext,
        [skill.name]: result
      };
    }
    
    return currentContext;
  }
}
```

#### 并行执行

多个技能并行执行，最后合并结果。

```javascript
class ParallelSkillComposer {
  async execute(skills, context) {
    const promises = skills.map(skill => {
      if (!skill.canExecute(context)) {
        return Promise.resolve(null);
      }
      return skill.execute(context);
    });
    
    const results = await Promise.all(promises);
    
    // 合并结果
    const mergedResult = {};
    skills.forEach((skill, index) => {
      if (results[index] !== null) {
        mergedResult[skill.name] = results[index];
      }
    });
    
    return {
      ...context,
      ...mergedResult
    };
  }
}
```

### 失败处理策略

```javascript
class SkillExecutionStrategy {
  constructor(strategy = 'stop') {
    this.strategy = strategy; // 'stop' | 'continue' | 'retry'
  }
  
  async handleFailure(error, skill, context) {
    switch (this.strategy) {
      case 'stop':
        throw error;
      
      case 'continue':
        console.warn(`Skill ${skill.name} failed, continuing...`, error);
        return null;
      
      case 'retry':
        return this.retry(skill, context);
      
      default:
        throw error;
    }
  }
  
  async retry(skill, context, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await skill.execute(context);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.delay(1000 * (i + 1)); // 指数退避
      }
    }
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 超时处理

```javascript
class SkillWithTimeout {
  constructor(skill, timeout = 5000) {
    this.skill = skill;
    this.timeout = timeout;
  }
  
  async execute(context) {
    return Promise.race([
      this.skill.execute(context),
      this.createTimeoutPromise()
    ]);
  }
  
  createTimeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Skill ${this.skill.name} timeout after ${this.timeout}ms`));
      }, this.timeout);
    });
  }
}
```

---

## Skill 接口规范

### TypeScript/JavaScript 接口定义

```typescript
interface ISkill {
  name: string;
  dependencies: string[];
  
  execute(context: SkillContext): Promise<SkillResult>;
  canExecute(context: SkillContext): boolean;
  getDependencies(): string[];
}

interface SkillContext {
  [key: string]: any;
  state?: WorkflowState;
  config?: any;
}

interface SkillResult {
  success: boolean;
  data?: any;
  error?: Error;
  metadata?: {
    executionTime: number;
    [key: string]: any;
  };
}
```

### 输入/输出接口规范

```typescript
// 输入接口
interface SkillInput {
  context: SkillContext;
  parameters?: Record<string, any>;
}

// 输出接口
interface SkillOutput {
  result: any;
  metadata: {
    executionTime: number;
    skillName: string;
    timestamp: number;
  };
}
```

### 执行上下文定义

```typescript
interface ExecutionContext {
  // 工作流状态
  workflowState: WorkflowState;
  
  // 配置
  config: Config;
  
  // 事件总线
  eventBus: EventBus;
  
  // 其他上下文数据
  [key: string]: any;
}
```

### 依赖关系定义

```typescript
interface SkillDependency {
  skillName: string;
  required: boolean; // 是否必需
  version?: string; // 版本要求
}
```

### Skill 实现示例

```javascript
class StageTransitionSkill extends BaseSkill {
  constructor() {
    super();
    this.dependencies = ['StageValidationSkill'];
  }
  
  async execute(context) {
    const { fromStage, toStage, state } = context;
    
    // 验证阶段转换
    const validationResult = context.StageValidationSkill;
    if (!validationResult.valid) {
      throw new Error('Stage transition validation failed');
    }
    
    // 执行阶段转换
    const newState = this.transition(state, fromStage, toStage);
    
    return {
      success: true,
      data: newState,
      metadata: {
        executionTime: Date.now() - context.startTime,
        fromStage,
        toStage
      }
    };
  }
  
  transition(state, from, to) {
    // 实现阶段转换逻辑
    return { ...state, currentStage: to };
  }
}
```

---

## 参考文档

- [AGENT_SYSTEM.md](./AGENT_SYSTEM.md) - Agent 系统设计
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构文档
- [API_REFERENCE.md](./API_REFERENCE.md) - API 参考文档



