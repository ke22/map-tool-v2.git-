# TROUBLESHOOTING.md - 故障排除文档

> Workflow-based Map Tool v2 故障排除指南

## 目录

- [常见问题](#常见问题)
- [错误代码参考](#错误代码参考)
- [调试技巧](#调试技巧)
- [性能问题诊断](#性能问题诊断)

---

## 常见问题

### 地图不显示

**症状**: 地图区域为空白

**可能原因**:
1. Mapbox Token 未配置或无效
2. 网络连接问题
3. 浏览器兼容性问题

**解决方案**:
1. 检查 `config.js` 中的 Mapbox Token
2. 检查浏览器控制台错误
3. 尝试刷新页面
4. 检查网络连接

### AI 分析功能不可用

**症状**: AI 文本分析失败或不工作

**可能原因**:
1. Gemini API Key 未配置
2. API 代理服务器未运行
3. API 调用失败

**解决方案**:
1. 检查 `.env` 文件中的 `GEMINI_API_KEY`
2. 检查 API 代理服务器状态
3. 查看浏览器控制台错误
4. 检查网络连接
5. 使用搜索功能作为替代

### 阶段切换失败

**症状**: 无法切换到下一阶段

**可能原因**:
1. 工作流状态错误
2. 阶段切换逻辑错误
3. 数据验证失败

**解决方案**:
1. 刷新页面重试
2. 检查浏览器控制台错误
3. 检查工作流状态
4. 查看相关日志

### 导出功能失败

**症状**: 地图导出失败或质量差

**可能原因**:
1. html2canvas 兼容性问题
2. Globe 视图导出限制
3. 浏览器内存不足

**解决方案**:
1. 使用 2D 视图导出（如果使用 Globe 视图）
2. 降低导出分辨率
3. 关闭其他标签页释放内存
4. 尝试使用其他浏览器

### 区域搜索无结果

**症状**: 搜索区域时无结果返回

**可能原因**:
1. GADM 数据未加载
2. 搜索关键词不匹配
3. 数据文件缺失

**解决方案**:
1. 检查 `data/` 目录中的数据文件
2. 尝试不同的搜索关键词
3. 使用坐标搜索
4. 检查浏览器控制台错误

---

## 错误代码参考

### Agent 错误代码

| 错误代码 | 描述 | 解决方案 |
|---------|------|---------|
| `AGENT_NOT_FOUND` | Agent 未找到 | 检查 Agent 注册 |
| `AGENT_TIMEOUT` | Agent 超时 | 重试或检查网络 |
| `AGENT_INVALID_REQUEST` | 无效请求 | 检查请求格式 |
| `AGENT_PROCESSING_ERROR` | 处理错误 | 查看详细错误信息 |
| `EXTERNAL_API_ERROR` | 外部 API 错误 | 检查 API 服务状态 |

### 工作流错误代码

| 错误代码 | 描述 | 解决方案 |
|---------|------|---------|
| `STAGE_SWITCH_INVALID` | 无效的阶段切换 | 检查阶段切换规则 |
| `STAGE_DATA_INVALID` | 阶段数据无效 | 验证数据完整性 |
| `STATE_SERIALIZATION_ERROR` | 状态序列化错误 | 检查状态数据结构 |

### 导出错误代码

| 错误代码 | 描述 | 解决方案 |
|---------|------|---------|
| `EXPORT_FAILED` | 导出失败 | 重试或使用其他视图 |
| `EXPORT_TIMEOUT` | 导出超时 | 降低分辨率或重试 |
| `EXPORT_MEMORY_ERROR` | 内存不足 | 关闭其他标签页 |

---

## 调试技巧

### 浏览器开发者工具

#### Console 日志

查看控制台错误和日志：

```javascript
// 启用详细日志
localStorage.setItem('debug', 'true');

// 查看工作流状态
console.log(window.workflowState);

// 查看事件
window.eventBus.on('*', (event, data) => {
  console.log('Event:', event, data);
});
```

#### Network 标签

检查 API 请求：
- 查看请求状态码
- 查看请求/响应内容
- 检查请求时间

#### Performance 标签

性能分析：
- 记录性能分析
- 查看 FPS
- 查看内存使用

#### Sources 标签

调试代码：
- 设置断点
- 查看变量值
- 单步调试

### 日志系统

使用内置日志系统：

```javascript
import { Logger } from './core/Logger';

const logger = new Logger('ModuleName');
logger.debug('Debug message');
logger.info('Info message');
logger.error('Error message', error);
```

### 状态检查

检查工作流状态：

```javascript
// 在浏览器控制台运行
const state = window.stateManager.getState();
console.log(JSON.stringify(state, null, 2));
```

### 事件监听

监听系统事件：

```javascript
// 在浏览器控制台运行
window.eventBus.on('stage:switch', (data) => {
  console.log('Stage switched:', data);
});

window.eventBus.on('agent:response', (data) => {
  console.log('Agent response:', data);
});
```

---

## 性能问题诊断

### 页面加载慢

**诊断步骤**:
1. 使用 Chrome DevTools Network 标签查看加载时间
2. 检查资源大小
3. 检查网络请求数量

**解决方案**:
- 使用 CDN 加速资源加载
- 压缩资源文件
- 使用懒加载

### 地图渲染慢

**诊断步骤**:
1. 使用 Chrome DevTools Performance 标签记录性能
2. 查看 FPS 是否低于 30
3. 检查内存使用

**解决方案**:
- 减少图层数量
- 简化几何数据
- 使用数据驱动样式
- 实现图层合并

### 内存使用高

**诊断步骤**:
1. 使用 Chrome DevTools Memory 标签查看内存
2. 检查内存泄漏
3. 查看对象数量

**解决方案**:
- 清理未使用的数据
- 实现内存管理机制
- 限制缓存大小
- 定期触发垃圾回收

### API 响应慢

**诊断步骤**:
1. 使用 Network 标签查看 API 响应时间
2. 检查 API 服务器状态
3. 查看请求队列

**解决方案**:
- 实现请求缓存
- 使用请求队列
- 优化 API 调用
- 实现超时和重试机制

---

## 获取帮助

### 文档资源

- [用户指南](./USER_GUIDE.md) - 用户使用指南
- [开发指南](./DEVELOPMENT_GUIDE.md) - 开发相关文档
- [API 参考](./API_REFERENCE.md) - API 文档

### 报告问题

如果问题无法解决，请：

1. **收集信息**:
   - 错误消息
   - 浏览器控制台日志
   - 复现步骤
   - 浏览器和操作系统版本

2. **创建 Issue**:
   - 在 GitHub 上创建 Issue
   - 提供详细信息
   - 附加截图或日志

---

## 参考文档

- [SPECIFICATION.md](./SPECIFICATION.md) - 技术规格文档
- [USER_GUIDE.md](./USER_GUIDE.md) - 用户指南
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - 开发指南



