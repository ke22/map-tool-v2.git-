# Shared Context 目录

> 此目录用于跨工作阶段共享上下文信息，记录项目配置、已知问题、技术决策等

## 📁 文件说明

### `port-configuration.md`
端口配置说明文档，记录项目中所有服务的端口分配和使用情况。

**内容：**
- 端口分配总览（v1: 8000, v2: 8001）
- Map Tool v1 端口配置说明
- Map Tool v2 端口配置说明（规划中）
- 端口检查命令
- 同时运行两个项目的说明
- 注意事项和最佳实践

**相关链接：**
- 参见 [port-configuration.md](./port-configuration.md)

### `known-issues.md`
记录技术债、发现的问题和待办事项。

**内容：**
- 技术债（高/中/低优先级）
- 发现和观察
- 待办事项

**相关链接：**
- 参见 [known-issues.md](./known-issues.md)

## 🔄 维护指南

### 何时更新

- **端口配置变更**: 更新 `port-configuration.md`
- **发现问题**: 记录到 `known-issues.md`
- **技术决策**: 更新相关文档或创建新文档

### 文档格式

- 使用 Markdown 格式
- 包含清晰的标题和目录结构
- 添加更新时间戳
- 提供相关链接

## 📚 相关文档

- 项目根目录的 `CLAUDE.md` - 项目开发规范
- 项目根目录的 `README.md` - 项目说明
- `docs/` 目录 - 详细技术文档