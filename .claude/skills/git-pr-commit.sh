#!/bin/bash
# Git PR Commit Script
# 用法: ./git-pr-commit.sh "提交信息"

set -e

COMMIT_MSG="$1"

if [ -z "$COMMIT_MSG" ]; then
    echo "错误: 请提供提交信息"
    echo "用法: ./git-pr-commit.sh \"你的提交信息\""
    exit 1
fi

echo "=== Git 状态 ==="
git status --short

echo ""
echo "=== 变更统计 ==="
git diff --stat

echo ""
echo "=== 即将提交 ==="
echo "$COMMIT_MSG"

read -p "确认提交? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "已取消"
    exit 0
fi

# 暂存所有变更
git add -A

# 提交
git commit -m "$COMMIT_MSG"

echo ""
echo "=== 提交成功 ==="
git log --oneline -3

echo ""
echo "=== 生成 PR 描述 ==="
echo ""
echo "## 修改概述"
echo "$COMMIT_MSG"
echo ""
echo "## 涉及模块"
echo "- [ ] 分类逻辑"
echo "- [ ] 数据接口"
echo "- [ ] UI"
echo "- [ ] 其他"
echo ""
echo "## 自测结果"
echo "- [ ] 本地验证通过"
echo "- [ ] 需要远程环境测试"
echo ""
echo "## 注意事项"
echo "<!-- 如有关注点请在此填写... -->"
echo ""
echo "## 关联 Issue"
echo "<!-- 关联的 Issue 编号，如：closes #123 -->"