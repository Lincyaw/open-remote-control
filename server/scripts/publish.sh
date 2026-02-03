#!/bin/bash

# Renote Server 发布脚本
# 用法: ./scripts/publish.sh [patch|minor|major]

set -e

cd "$(dirname "$0")/.."

echo "=== Renote Server 发布流程 ==="

# 检查是否登录 npm
if ! npm whoami &> /dev/null; then
    echo "❌ 未登录 npm，请先执行: npm login"
    exit 1
fi

echo "✓ npm 已登录: $(npm whoami)"

# 检查工作目录是否干净
if [[ -n $(git status --porcelain) ]]; then
    echo "⚠️  警告: 工作目录有未提交的更改"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 版本升级 (默认 patch)
VERSION_TYPE=${1:-patch}
echo "📦 版本升级类型: $VERSION_TYPE"

# 运行测试
echo "🧪 运行测试..."
npm test || {
    echo "❌ 测试失败，中止发布"
    exit 1
}

# 构建
echo "🔨 构建项目..."
npm run build

# 升级版本号
echo "📝 升级版本号..."
NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
echo "新版本: $NEW_VERSION"

# 发布
echo "🚀 发布到 npm..."
npm publish

echo ""
echo "✅ 发布成功!"
echo "   包名: renote-server"
echo "   版本: $NEW_VERSION"
echo ""
echo "安装命令: npm install -g renote-server"
