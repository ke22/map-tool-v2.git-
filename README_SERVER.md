# 啟動 HTTP 服務器

## 問題說明

由於瀏覽器的 CORS 安全策略，直接使用 `file://` 協議打開 HTML 文件時，無法加載本地文件（如 GADM 數據文件）。

## 解決方案

必須通過 HTTP 服務器運行應用。

## 方法 1: 使用 npm scripts（推薦）

```bash
npm start
# 或
npm run serve
# 或
npm run dev
```

然後在瀏覽器中訪問：`http://localhost:8000`

## 方法 2: 使用 Python

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

然後在瀏覽器中訪問：`http://localhost:8000`

## 方法 3: 使用啟動腳本

```bash
./start-server.sh
# 或指定端口
./start-server.sh 8080
```

## 方法 4: 使用其他 HTTP 服務器

```bash
# http-server
npx http-server -p 8000

# serve
npx serve -p 8000

# live-server (支持自動刷新)
npx live-server --port=8000
```

## 注意事項

- 確保 GADM 數據文件位於 `data/gadm/` 目錄中
- 如果使用其他端口，請確保端口未被占用
- 開發時建議使用 `live-server`，支持自動刷新



