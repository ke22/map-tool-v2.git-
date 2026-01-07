# 已知问题和待办事项

> 本文档记录项目中发现的问题、技术债和待办事项

> **相关文档**: 端口配置信息请参见 [port-configuration.md](./port-configuration.md)

## 📋 技术债

### 高优先级

- 暂无

### 中优先级

- **端口配置**: Map Tool v2 当前使用端口 8000，建议切换到端口 8001 以避免与 v1 冲突
  - 参见 [port-configuration.md](./port-configuration.md) 了解详细配置说明
  - 需要更新 `package.json` 中的端口配置

### 低优先级

- 暂无

## 🔍 发现和观察

### 端口配置

- Map Tool v1 和 v2 都需要同时运行，建议使用不同端口
- v1: 端口 8000 (已确定)
- v2: 端口 8001 (推荐配置)

### 服务器配置

- Map Tool v2 当前支持多种服务器选项：
  - Python HTTP Server (默认，用于开发)
  - Node.js server-combined.js (如果存在，支持 API 代理)
  - http-server (静态文件服务器)
  - live-server (支持热重载)

## 📝 待办事项

- [ ] 更新 `package.json` 中的端口配置为 8001
- [ ] 创建或更新 `.env` 文件，设置 `PORT=8001`
- [ ] 如果需要，创建 `server-combined.js` 并配置端口
- [ ] 更新 Playwright 测试配置（如果存在），设置 `baseURL: 'http://localhost:8001'`

## 📅 更新日志

- **2025-01-05**: 创建已知问题文档，记录端口配置相关事项



