#!/bin/bash
# Claude Code Session Start Hook
# 每次新工作阶段自动加载项目背景

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

if [ -f "SPECIFICATION.md" ]; then
    echo "✅ Loaded SPECIFICATION.md (技术规范)"
fi

if [ -f "SETUP_GUIDE.md" ]; then
    echo "✅ Loaded SETUP_GUIDE.md (设置指南)"
fi

# 检查 shared-context
if [ -d ".shared-context" ]; then
    echo "✅ Found .shared-context/ directory"
    if [ -f ".shared-context/known-issues.md" ]; then
        echo "   → Check .shared-context/known-issues.md for known issues"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Current Development Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Active Development Areas:"
echo "  • Workflow-based Map Tool v2 (新项目)"
echo "  • 分阶段工作流设计（国家区域 → 行政区 → 导出）"
echo "  • Agent系统集成（GeoExtractor, Workflow, Export）"
echo "  • 模块化架构迁移"
echo ""

# 显示最近的 Git 提交（如果可用）
if command -v git &> /dev/null && [ -d ".git" ]; then
    echo "📝 Recent commits:"
    git log --oneline -5 2>/dev/null | sed 's/^/   /' || echo "   (No commits yet)"
    echo ""
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
    TEST_COUNT=$(find tests -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
    echo "   ✅ Tests: $TEST_COUNT test files"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Quick Start Commands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Start dev server:    npm start"
echo "  Run tests:           npx playwright test"
echo "  View test report:    npx playwright show-report"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查环境变量
if [ -f ".env" ]; then
    echo "✅ .env file found (Gemini API key configured)"
else
    echo "⚠️  .env file not found - AI features may not work"
    echo ""
    echo "   📋 Quick setup:"
    echo "   1. Get API key: https://aistudio.google.com/app/apikey"
    echo "   2. Copy .env.example to .env and configure"
    echo ""
fi

echo ""
echo "💡 Tip: Check .shared-context/known-issues.md for known issues and TODOs"
echo ""
