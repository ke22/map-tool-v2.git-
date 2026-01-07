#!/bin/bash
# 啟動 Node.js 服務器（支持靜態文件和 AI API 代理）
# 用於解決 CORS 問題（file:// 協議無法加載本地文件）
# 並提供 Gemini API 代理功能

PORT=${1:-8001}

# 設置端口環境變量
export PORT=${PORT}

echo "🚀 Starting Node.js server on port ${PORT}..."
echo "📝 Open http://localhost:${PORT} in your browser"
echo ""

# 檢查 Node.js 是否可用
if command -v node &> /dev/null; then
    # 檢查 server-combined.js 是否存在
    if [ -f "server-combined.js" ]; then
        node server-combined.js
    else
        echo "❌ server-combined.js not found!"
        echo "   Please make sure you're in the project root directory."
        exit 1
    fi
else
    echo "❌ Node.js not found. Please install Node.js."
    echo ""
    echo "Alternative options:"
    echo "  - npm start (requires Node.js)"
    echo "  - npm run serve (uses http-server)"
    echo "  - npm run dev (uses live-server)"
    exit 1
fi

