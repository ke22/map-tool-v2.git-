# AGENT_SPEC.md - Agent 技术规格

> Workflow-based Map Tool v2 Agent 详细技术规格

## 目录

- [GeoExtractorAgent](#geoextractoragent)
- [GeoResolverAgent](#georesolveragent)
- [WorkflowAgent](#workflowagent)
- [ExportAgent](#exportagent)
- [ValidationAgent](#validationagent)

---

## GeoExtractorAgent

### 功能概述

从文本中自动提取地理位置信息，支持多种语言和上下文理解。

### 技术规格

#### 输入

```typescript
interface ExtractLocationsRequest {
  text: string;
  context: 'country' | 'administration';
  language?: 'zh-CN' | 'en-US' | 'auto';
  options?: {
    maxResults?: number;
    minConfidence?: number;
  };
}
```

#### 输出

```typescript
interface ExtractLocationsResponse {
  locations: Array<{
    name: string;
    confidence: number; // 0-1
    gadmId?: string;
    level: number; // 0=country, 1=admin1, 2=admin2
    bbox: [number, number, number, number];
    aliases?: string[];
  }>;
  metadata: {
    processingTime: number;
    model: string;
    language: string;
  };
}
```

### 功能特性

#### 多语言支持规划

- **当前支持**: 中文（zh-CN）、英文（en-US）
- **未来扩展**: 更多语言支持
- **自动检测**: 自动检测文本语言

#### 上下文理解增强

- 理解文本中的地理上下文
- 识别地理实体之间的关系
- 区分不同级别的地理实体（国家/行政区）

#### 实体链接到 GADM ID

- 将提取的地理实体链接到 GADM ID
- 支持别名匹配
- 模糊匹配和纠错

#### 置信度阈值定义

- **高置信度**: >= 0.8（直接使用）
- **中置信度**: 0.5 - 0.8（显示给用户确认）
- **低置信度**: < 0.5（过滤或标记）

### 实现细节

#### API 集成

- 使用 Gemini API（通过代理服务器）
- 请求格式: `/api/gemini/generateContent`
- 超时设置: 30 秒

#### 缓存策略

- 相同文本缓存结果（24 小时）
- 使用文本哈希作为缓存键
- 支持缓存失效

---

## GeoResolverAgent

### 功能概述

解析地名、坐标，转换为 GADM ID 和地理数据。

### 技术规格

#### 输入

```typescript
interface ResolveLocationRequest {
  query: string; // 地名或坐标 "latitude,longitude"
  level?: number; // 0=country, 1=admin1, 2=admin2
}
```

#### 输出

```typescript
interface ResolveLocationResponse {
  locations: Array<{
    name: string;
    gadmId: string;
    level: number;
    bbox: [number, number, number, number];
    geometry?: GeoJSON;
  }>;
}
```

### 功能特性

- **地名解析**: 将地名转换为 GADM ID
- **坐标转换**: 将坐标转换为地理位置
- **ID 映射**: GADM ID 到地理数据的映射
- **模糊搜索**: 支持部分匹配和纠错

### 实现细节

- 使用 GADM 数据索引
- 本地查询（无需外部 API）
- 支持快速搜索（< 1 秒）

---

## WorkflowAgent

### 功能概述

管理工作流状态，提供阶段切换建议和工作流验证。

### 技术规格

#### 输入

```typescript
interface WorkflowSuggestRequest {
  currentState: WorkflowState;
  userActions: UserAction[];
}
```

#### 输出

```typescript
interface WorkflowSuggestResponse {
  suggestions: Array<{
    action: 'switchStage' | 'completeStage' | 'skipStage';
    stage?: string;
    confidence: number;
    reason: string;
  }>;
}
```

### 功能特性

#### 阶段切换判断规则

- 分析当前阶段完成度
- 检测用户行为模式
- 预测下一步操作

#### 用户行为模式识别

- 分析用户操作历史
- 识别常见工作流模式
- 学习用户偏好

#### 异常检测机制

- 检测异常工作流状态
- 识别潜在错误
- 提供修复建议

#### 建议置信度计算

- 基于多个因素计算置信度
- 高置信度建议自动执行（可选）
- 中低置信度建议显示给用户

### 实现细节

- 基于规则的引擎（v1）
- 未来可能使用机器学习（v2+）

---

## ExportAgent

### 功能概述

优化导出过程，提供布局建议和质量优化。

### 技术规格

#### 输入

```typescript
interface ExportOptimizeRequest {
  mapState: WorkflowState;
  exportOptions: ExportOptions;
  viewport: Viewport;
}
```

#### 输出

```typescript
interface ExportOptimizeResponse {
  suggestions: Array<{
    type: 'layout' | 'quality' | 'view';
    recommendation: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  optimizedOptions?: ExportOptions;
}
```

### 功能特性

#### 布局分析算法

- 分析地图元素分布
- 检测重叠和空白区域
- 建议最佳视图范围

#### 视觉平衡计算

- 计算地图视觉平衡度
- 建议调整方案
- 优化元素位置

#### 用户偏好学习

- 记录用户导出设置
- 学习用户偏好
- 提供个性化建议

#### A/B 测试机制

- 测试不同的导出选项
- 收集用户反馈
- 优化默认设置

### 实现细节

- 图像分析算法
- 用户行为分析
- 机器学习模型（未来）

---

## ValidationAgent

### 功能概述

验证工作流状态和数据完整性。

### 技术规格

#### 输入

```typescript
interface ValidateRequest {
  state: WorkflowState;
  stage?: string;
  strict?: boolean;
}
```

#### 输出

```typescript
interface ValidateResponse {
  valid: boolean;
  errors: Array<{
    code: string;
    message: string;
    severity: 'error' | 'warning';
    stage?: string;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    stage?: string;
  }>;
}
```

### 功能特性

- **状态验证**: 验证工作流状态完整性
- **数据验证**: 验证区域数据完整性
- **一致性检查**: 检查数据一致性
- **导出准备检查**: 验证导出准备状态

### 验证规则

1. **阶段状态验证**
   - 状态值必须在有效范围内
   - 状态转换必须合法

2. **数据完整性验证**
   - Area 对象必须包含必需字段
   - Geometry 引用必须有效
   - 标注数据必须完整

3. **导出准备验证**
   - 至少有一个阶段有数据
   - 视图设置有效
   - 导出选项有效

### 实现细节

- 规则引擎
- 验证规则可配置
- 支持严格模式和宽松模式

---

## Agent 性能指标

### 性能目标

| Agent | 平均响应时间 | 最大响应时间 | 成功率目标 |
|-------|------------|------------|----------|
| GeoExtractorAgent | < 3 秒 | < 5 秒 | > 90% |
| GeoResolverAgent | < 500ms | < 1 秒 | > 95% |
| WorkflowAgent | < 100ms | < 500ms | > 99% |
| ExportAgent | < 1 秒 | < 2 秒 | > 95% |
| ValidationAgent | < 50ms | < 200ms | > 99% |

### 监控指标

- 执行时间分布
- 成功率/失败率
- 错误类型分布
- 用户反馈评分

---

## 参考文档

- [AGENT_SYSTEM.md](./AGENT_SYSTEM.md) - Agent 系统设计
- [SPECIFICATION.md](./SPECIFICATION.md) - 技术规格文档
- [API_REFERENCE.md](./API_REFERENCE.md) - API 参考文档




