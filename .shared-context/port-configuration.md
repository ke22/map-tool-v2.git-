# 端口配置说明

> 本文档记录项目中所有服务的端口分配和使用情况

## 📋 端口分配总览

| 项目 | 端口 | 配置文件位置 | 说明 |
|------|------|-------------|------|
| Map Tool v1 (当前) | 8000 | `server-combined.js`<br>`start-preview.sh`<br>`playwright.config.ts` | 主开发端口 |
| Map Tool v2 (新) | 8001 或 8080 | `server-combined.js` (v2)<br>`.env` (v2)<br>`package.json` | 新项目端口（建议使用 8001） |

## 🔧 Map Tool v1 端口配置

### 配置文件位置
- `server-combined.js` - Node.js 服务器配置
- `start-preview.sh` - 启动脚本
- `playwright.config.ts` - 测试配置

### 默认端口
- **开发服务器**: 8000
- **访问地址**: `http://localhost:8000/index-enhanced.html`

## 🚀 Map Tool v2 端口配置

### 推荐配置（端口 8001）

#### 1. 环境变量配置（`.env`）

```env
PORT=8001
GEMINI_API_KEY=your-api-key-here
MAPBOX_TOKEN=your-token-here
```

#### 2. Node.js 服务器配置（`server-combined.js`，如果复用）

```javascript
const PORT = process.env.PORT || 8001; // 默认 8001
```

#### 3. 启动脚本（`start-server.sh`）

```bash
#!/bin/bash
PORT=8001 node server-combined.js
```

#### 4. package.json 配置

当前 `package.json` 中的端口配置：
```json
{
  "scripts": {
    "start": "python3 -m http.server 8000 || python -m SimpleHTTPServer 8000",
    "serve": "npx http-server -p 8000 -c-1",
    "dev": "npx live-server --port=8000 --open=/index.html"
  }
}
```

**建议更新为：**
```json
{
  "scripts": {
    "start": "python3 -m http.server 8001 || python -m SimpleHTTPServer 8001",
    "serve": "npx http-server -p 8001 -c-1",
    "dev": "npx live-server --port=8001 --open=/index.html"
  }
}
```

#### 5. Playwright 测试配置（`playwright.config.ts`，如果存在）

```typescript
use: {
  baseURL: 'http://localhost:8001',
  // ...
}
```

### 访问地址
- **主页面**: `http://localhost:8001/index.html`
- **API 代理**: `http://localhost:8001/api/gemini/generateContent` (如果使用 server-combined.js)

## 🔄 同时运行两个项目

### 终端 1：启动 v1 (端口 8000)

```bash
cd /Users/yulincho/Documents/01_Github/map
PORT=8000 node server-combined.js
```

访问：`http://localhost:8000/index-enhanced.html`

### 终端 2：启动 v2 (端口 8001)

```bash
cd /Users/yulincho/.cursor/worktrees/map/map-tool-v2
PORT=8001 node server-combined.js
# 或者使用 Python HTTP 服务器
npm start  # 需要先更新 package.json 中的端口为 8001
```

访问：`http://localhost:8001/index.html`

## ⚠️ 注意事项

### 端口占用检查

使用以下命令检查端口是否被占用：

```bash
# 检查端口 8000
lsof -ti:8000

# 检查端口 8001
lsof -ti:8001

# 如果端口被占用，可以停止进程
lsof -ti:8000 | xargs kill -9
lsof -ti:8001 | xargs kill -9
```

### 环境变量管理

- 两个项目使用各自的 `.env` 文件，避免冲突
- Map Tool v1: `/Users/yulincho/Documents/01_Github/map/.env`
- Map Tool v2: `/Users/yulincho/.cursor/worktrees/map/map-tool-v2/.env`

### 服务器类型选择

**Map Tool v2 当前支持的服务器选项：**

1. **Python HTTP Server** (推荐用于开发)
   ```bash
   npm start  # 使用 package.json 配置
   # 或直接运行
   python3 -m http.server 8001
   ```

2. **Node.js server-combined.js** (如果存在，支持 API 代理)
   ```bash
   PORT=8001 node server-combined.js
   ```

3. **http-server** (静态文件服务器)
   ```bash
   npm run serve  # 需要先更新 package.json
   ```

4. **live-server** (支持热重载)
   ```bash
   npm run dev  # 需要先更新 package.json
   ```

### 当前状态（2025-01-05）

- ✅ Map Tool v2 当前使用端口 8000（Python HTTP Server）
- ⚠️ 建议切换到端口 8001 以避免与 v1 冲突
- 📝 package.json 中的端口配置需要更新为 8001

## 📝 更新日志

- **2025-01-05**: 创建端口配置文档，记录 v1 和 v2 的端口分配

## 🔗 相关文档

- [README.md](./README.md) - Shared Context 目录说明
- [known-issues.md](./known-issues.md) - 已知问题和待办事项
- `package.json` - 项目依赖和脚本配置



