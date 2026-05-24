---
name: git-pr-commit
description: 将本地代码修改提交到 Git 并生成规范的 Pull Request 描述。当用户要求"提交代码"、"创建PR"、"git commit and PR"或类似的git工作流请求时使用此技能。
argument-hint: [可选的提交信息]
user-invocable: true
allowed-tools:
  - Read
  - Bash(git status:*)
  - Bash(git diff:*)
  - Bash(git add:*)
  - Bash(git commit:*)
  - Bash(git push:*)
version: "1.0"
---

# Git PR Commit Skill

将本地代码修改提交到 Git 并生成规范的 Pull Request 描述。

## 触发方式

在 Claude Code 中输入：
```
/git-pr-commit
```

## 核心逻辑

AI 从**历史对话**中提取修改内容，而非分析 git diff：

1. **扫描 git 状态** - 确认变更了哪些文件
2. **从历史对话提取** - 总结 AI 在对话中做的修改
3. **生成提交信息** - 基于实际修改行为
4. **生成 PR 描述** - 符合 `.github/pull_request_template.md`

## 执行流程

### 步骤 1：扫描变更
```bash
git status --short
git diff --stat
```
确认有哪些文件被修改。

### 步骤 2：从历史对话提取修改内容

AI 分析对话历史，提取类似这样的信息：

```
根据对话历史，AI 做了以下修改：

1. 修改了 backend/app/services/predict.py
   - 修复了E11.9编码的边界情况判断
   - 添加了新的验证逻辑

2. 修改了 frontend/src/components/CaseInput.jsx
   - 更新了UI组件的错误提示显示
   - 同步调整了输入验证逻辑

3. 修改了 backend/requirements.txt
   - 升级了 pydantic 版本
```

### 步骤 3：生成提交信息

基于提取的修改内容生成：

```
Commit Message: 修复E11.9编码边界情况及同步更新前端验证UI
```

### 步骤 4：生成 PR 描述

```markdown
## 修改概述
修复ICD预测服务中E11.9编码的边界情况判断逻辑，同时同步更新了前端输入验证UI的 error提示显示。

## 涉及模块
- [x] 分类逻辑 (backend/app/services/predict.py)
- [ ] 数据接口
- [x] UI (frontend/src/components/CaseInput.jsx)

## 自测结果
- [ ] 本地验证通过
- [ ] 需要远程环境测试

## 注意事项
- 修改了后端预测逻辑，E11.9边界情况判断
- 前端UI同步调整了错误提示显示
- 如有依赖变更请在下方说明

## 关联 Issue
<!-- 关联的 Issue 编号 -->
```

### 步骤 5：交互确认

```
=== 即将提交 ===

变更文件:
  M backend/app/services/predict.py
  M frontend/src/components/CaseInput.jsx
  M backend/requirements.txt

Commit Message:
  修复E11.9编码边界情况及同步更新前端验证UI

确认提交? (y/n):
```

## 涉及模块检测规则

| 文件路径模式 | 涉及模块 |
|-------------|----------|
| `backend/app/services/` | 分类逻辑 |
| `backend/app/api/` | 分类逻辑 |
| `backend/app/repositories/` | 数据接口 |
| `backend/app/schemas/` | 数据接口 |
| `frontend/src/pages/` | UI |
| `frontend/src/components/` | UI |
| `requirements.txt` | 依赖更新 |

## 注意事项检测

如果检测到以下变更，自动提醒：
- `requirements.txt` → 依赖更新需说明版本变化
- `docker-compose.yml` → 配置变更需说明
- 数据库迁移文件 → 需确认迁移脚本
- `.env` / `.env.example` → 配置变更需说明