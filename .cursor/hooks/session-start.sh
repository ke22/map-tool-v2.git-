#!/bin/bash
# Claude Code Session Start Hook - Enhanced Version
# 每次新工作阶段自动加载项目背景，包含 GADM 數據檢查和服務器狀態檢查

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Loading project context..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查并加载关键文档
if [ -f "CLAUDE.md" ]; then
    echo "✅ Loaded CLAUDE.md (项目开发规范)"
else
    echo "⚠️  CLAUDE.md not found - please create it!"
fi

if [ -f "docs/SPECIFICATION.md" ]; then
    echo "✅ Loaded SPECIFICATION.md (技术规范)"
fi

if [ -f "docs/DEVELOPMENT_GUIDE.md" ]; then
    echo "✅ Loaded DEVELOPMENT_GUIDE.md (开发指南)"
fi

# 检查 shared-context
if [ -d ".shared-context" ]; then
    echo "✅ Found .shared-context/ directory"
    if [ -f ".shared-context/known-issues.md" ]; then
        echo "   → Check .shared-context/known-issues.md for known issues"
    fi
    if [ -f ".shared-context/port-configuration.md" ]; then
        echo "   → Check .shared-context/port-configuration.md for port info"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Current Development Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 显示最近的 Git 提交（如果可用）
if command -v git &> /dev/null && [ -d ".git" ]; then
    echo "📝 Recent commits:"
    git log --oneline -5 2>/dev/null | sed 's/^/   /' || echo "   (No commits yet)"
    echo ""
    
    # 顯示當前分支
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
    if [ -n "$CURRENT_BRANCH" ]; then
        echo "🌿 Current branch: $CURRENT_BRANCH"
        echo ""
    fi
fi

# 检查关键文件状态
echo "🔧 Project Structure:"
if [ -d "js/workflow" ]; then
    echo "   ✅ Workflow core: js/workflow/"
fi
if [ -d "js/agents" ]; then
    echo "   ✅ Agent system: js/agents/"
fi
if [ -d "js/modules" ]; then
    echo "   ✅ Reusable modules: js/modules/"
fi
if [ -d "tests" ]; then
    TEST_COUNT=$(find tests -name "*.spec.js" -o -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
    echo "   ✅ Tests: $TEST_COUNT test files"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗺️  GADM Data Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 檢查 GADM 數據目錄
if [ -d "data/gadm" ]; then
    echo "✅ GADM data directory found: data/gadm/"
    
    # 檢查基礎 GADM 文件
    GADM_FILES=(
        "data/gadm/gadm_level0.geojson"
        "data/gadm/gadm_level1.geojson"
        "data/gadm/gadm_level2.geojson"
    )
    
    for file in "${GADM_FILES[@]}"; do
        if [ -f "$file" ]; then
            FILE_SIZE=$(du -h "$file" 2>/dev/null | cut -f1)
            echo "   ✅ $(basename $file) ($FILE_SIZE)"
        else
            echo "   ⚠️  $(basename $file) not found"
        fi
    done
    
    # 檢查優化後的數據
    if [ -d "data/gadm/optimized" ]; then
        echo ""
        echo "   📦 Optimized data:"
        OPTIMIZED_COUNT=$(find data/gadm/optimized -name "*.geojson" 2>/dev/null | wc -l | tr -d ' ')
        echo "      • Total optimized files: $OPTIMIZED_COUNT"
        
        if [ -d "data/gadm/optimized/by_country" ]; then
            COUNTRY_FILES=$(find data/gadm/optimized/by_country -name "*.geojson" 2>/dev/null | wc -l | tr -d ' ')
            echo "      • Country-split files: $COUNTRY_FILES"
        fi
    fi
else
    echo "⚠️  GADM data directory not found: data/gadm/"
    echo "   📋 Setup instructions:"
    echo "      1. Download GADM data from https://gadm.org/"
    echo "      2. Place files in data/gadm/ directory"
    echo "      3. Run optimization scripts if needed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Server Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 讀取端口配置（從 .env 或默認值）
PORT=8001
if [ -f ".env" ]; then
    ENV_PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
    if [ -n "$ENV_PORT" ]; then
        PORT=$ENV_PORT
    fi
fi

# 檢查服務器是否在運行
SERVER_URL="http://localhost:$PORT"
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$SERVER_URL" 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        echo "✅ Server is running on port $PORT"
        echo "   → URL: $SERVER_URL"
        
        # 檢查 API 端點
        if [ -f "server-combined.js" ]; then
            API_ENDPOINT="$SERVER_URL/api/gadm"
            API_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$API_ENDPOINT" 2>/dev/null)
            if [ "$API_CODE" = "200" ] || [ "$API_CODE" = "400" ]; then
                echo "   ✅ API endpoint accessible: /api/gadm"
            else
                echo "   ⚠️  API endpoint may not be ready: /api/gadm"
            fi
        fi
    else
        echo "⚠️  Server is not running on port $PORT"
        echo "   📋 To start server:"
        echo "      npm start"
        echo "      # or"
        echo "      node server-combined.js"
    fi
elif command -v nc &> /dev/null || command -v netcat &> /dev/null; then
    # 使用 netcat 檢查端口
    if nc -z localhost $PORT 2>/dev/null || netcat -z localhost $PORT 2>/dev/null; then
        echo "✅ Port $PORT is in use (server may be running)"
        echo "   → URL: $SERVER_URL"
    else
        echo "⚠️  Port $PORT is not in use"
        echo "   📋 To start server:"
        echo "      npm start"
        echo "      # or"
        echo "      node server-combined.js"
    fi
else
    echo "ℹ️  Cannot check server status (curl/nc not available)"
    echo "   Expected port: $PORT"
    echo "   To start: npm start or node server-combined.js"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Environment Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 檢查環境變量文件
if [ -f ".env" ]; then
    echo "✅ .env file found"
    
    # 檢查關鍵環境變量（不顯示值）
    if grep -q "^MAPBOX_TOKEN=" .env 2>/dev/null; then
        echo "   ✅ MAPBOX_TOKEN configured"
    else
        echo "   ⚠️  MAPBOX_TOKEN not found in .env"
    fi
    
    if grep -q "^GEMINI_API_KEY=" .env 2>/dev/null; then
        echo "   ✅ GEMINI_API_KEY configured"
    else
        echo "   ⚠️  GEMINI_API_KEY not found in .env"
        echo "      → Get API key: https://aistudio.google.com/app/apikey"
    fi
    
    if grep -q "^PORT=" .env 2>/dev/null; then
        ENV_PORT=$(grep "^PORT=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
        echo "   ✅ PORT=$ENV_PORT"
    else
        echo "   ℹ️  PORT not set (using default: 8001)"
    fi
else
    echo "⚠️  .env file not found - AI features may not work"
    echo ""
    echo "   📋 Quick setup:"
    echo "      1. Copy .env.example to .env (if exists)"
    echo "      2. Get Gemini API key: https://aistudio.google.com/app/apikey"
    echo "      3. Get Mapbox token: https://account.mapbox.com/"
    echo "      4. Configure .env file:"
    echo "         GEMINI_API_KEY=your-api-key"
    echo "         MAPBOX_TOKEN=your-token"
    echo "         PORT=8001"
fi

# 檢查配置文件
if [ -f "config.js" ]; then
    echo ""
    echo "✅ config.js found"
fi

# 檢查 Node.js 版本
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version 2>/dev/null)
    echo ""
    echo "✅ Node.js version: $NODE_VERSION"
    NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v//' | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo "   ⚠️  Node.js 18+ recommended"
    fi
fi

# 檢查 npm 依賴
if [ -f "package.json" ]; then
    if [ -d "node_modules" ]; then
        echo "✅ node_modules found (dependencies installed)"
    else
        echo ""
        echo "⚠️  node_modules not found"
        echo "   📋 To install dependencies:"
        echo "      npm install"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Quick Start Commands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Start dev server:    npm start"
echo "  Start server:        node server-combined.js"
echo "  Run tests:           npm test"
echo "  Run tests (UI):      npx playwright test --ui"
echo "  View test report:    npx playwright show-report"
echo "  Lint code:           npm run lint"
echo "  Format code:         npm run format"
echo ""

# 顯示活躍開發區域
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Active Development Areas"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  • Workflow-based Map Tool v2"
echo "  • 分阶段工作流设计（国家区域 → 行政区 → 导出）"
echo "  • Agent系统集成（GeoExtractor, Workflow, Export）"
echo "  • 模块化架构迁移"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tips:"
echo "   • Check .shared-context/known-issues.md for known issues"
echo "   • Check .shared-context/port-configuration.md for port info"
echo "   • Review CLAUDE.md for development guidelines"
echo ""
