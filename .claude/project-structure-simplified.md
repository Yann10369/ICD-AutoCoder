# ICD-AutoCoder 简化后的项目目录结构

```
ICD-AutoCoder/
├── .claude/                      # Claude 配置和记忆
│   ├── memory/
│   │   ├── project/
│   │   │   └── project-structure.md
│   │   └── MEMORY.md
│   └── settings.local.json
├── .cursor/                      # Cursor 编辑器配置
├── .git/                         # Git 版本控制
├── .venv/                        # Python 虚拟环境
├── .vscode/                      # VS Code 配置
├── MODELS/                       # 模型权重存放目录
├── backend/                      # FastAPI 后端
│   ├── app/
│   │   ├── __init__.py           # 保留（Python包标识）
│   │   ├── main.py               # FastAPI 入口
│   │   ├── api/                  # API 路由层
│   │   │   ├── explain.py        # 解释接口
│   │   │   ├── graph.py          # 知识图谱接口
│   │   │   ├── model_configs.py  # 模型配置CRUD接口
│   │   │   ├── models.py         # 模型列表接口
│   │   │   ├── performance.py    # 性能指标接口
│   │   │   ├── predict.py        # 预测推理接口
│   │   │   └── workflow.py       # 工作流接口
│   │   ├── core/                 # 核心基础设施（保留）
│   │   │   ├── config.py         # 配置管理
│   │   │   ├── exceptions.py     # 异常定义
│   │   │   ├── logger.py         # 日志配置
│   │   │   └── utils.py          # 通用工具
│   │   ├── schemas/              # Pydantic 模式定义（保留）
│   │   │   ├── __init__.py
│   │   │   ├── graph.py
│   │   │   ├── model_config.py
│   │   │   ├── predict.py
│   │   │   ├── request.py
│   │   │   └── response.py
│   │   ├── services/             # 业务逻辑服务层（保留）
│   │   │   ├── ai.py             # 大模型AI服务
│   │   │   ├── graph_manager.py  # 知识图谱管理器
│   │   │   ├── model_config_service.py  # 模型配置服务
│   │   │   ├── model_manager.py  # 小模型管理器
│   │   │   ├── preprocessing.py  # 文本预处理
│   │   │   └── workflow/         # 工作流引擎（保留）
│   │   │       ├── __init__.py
│   │   │       ├── workflow_engine.py
│   │   │       ├── workflow_storage.py
│   │   │       └── nodes/
│   │   │           ├── __init__.py
│   │   │           ├── base_node.py
│   │   │           ├── end_node.py
│   │   │           ├── graph_query_node.py
│   │   │           ├── small_model_node.py
│   │   │           └── start_node.py
│   │   └── storage/              # ⭐ 存储层（合并后）
│   │       ├── __init__.py       # 包含单例实例和依赖注入函数
│   │       ├── repositories/     # 数据访问仓库（原 repositories 层）
│   │       │   ├── base.py       # 仓库基类
│   │       │   ├── icd_hierarchy_repo.py   # ICD层级仓库
│   │       │   ├── model_config_repo.py    # 模型配置仓库
│   │       │   └── prediction_repo.py     # 预测结果仓库
│   │       ├── database/         # 数据库连接（原 database 层）
│   │       │   ├── postgres.py   # PostgreSQL客户端
│   │       │   └── age_graph.py  # Apache AGE 图数据库
│   │       ├── case_storage.py   # 病例存储（原 data）
│   │       ├── graph_database.py # 图数据库管理（原 data）
│   │       └── model_repository.py  # 模型注册表（原 data）
│   ├── data/                     # JSON 数据文件（保留在原位置）
│   │   ├── icd_hierarchy.json
│   │   ├── model_configs.json
│   │   ├── predictions.json
│   │   ├── umls_mappings.json
│   │   └── workflows.json
│   ├── Dockerfile
│   ├── init-db.sql
│   └── requirements.txt
├── frontend/                     # React 前端（完整保留结构）
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── api/                  # API 客户端
│   │   │   ├── client.js
│   │   │   ├── modelConfigs.js
│   │   │   └── workflow.js
│   │   ├── components/           # React 组件
│   │   │   ├── layout/
│   │   │   ├── ui/
│   │   │   ├── workflow/
│   │   │   ├── CaseInput.jsx
│   │   │   ├── ExplanationPanel.jsx
│   │   │   ├── GraphViewer.jsx
│   │   │   ├── ModelConfigPage.jsx
│   │   │   ├── ModelSelector.jsx
│   │   │   ├── PerformanceChart.jsx
│   │   │   └── PredictionTable.jsx
│   │   ├── hooks/                # 自定义 Hooks
│   │   │   └── useDraggableSplitter.js
│   │   ├── pages/                # 页面组件
│   │   │   ├── HomePage.jsx
│   │   │   ├── ModelConfigPage.jsx
│   │   │   ├── WorkflowEditorPage.jsx
│   │   │   └── WorkflowPage.jsx
│   │   ├── utils/                # 工具函数
│   │   │   └── formatters.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── package-lock.json
├── logs/                         # 日志目录
├── Docker\配置构建.md            # Docker 配置构建说明
├── The-need-ICD.md               # 项目需求文档（保留）
├── summer.md                     # 项目核心文档（保留）
├── docker-compose.yml            # Docker Compose 配置
└── README.md                     # 项目说明
```

## 🎯 架构分层说明

| 层 | 职责 | 说明 |
|---|------|------|
| **api** | REST 接口路由 | 接收请求，调用服务，返回响应 |
| **core** | 基础设施 | 配置、日志、异常、工具 |
| **schemas** | 数据模式定义 | Pydantic 模型，请求响应验证 |
| **services** | 业务逻辑 | 模型推理、工作流、图谱管理、AI服务 |
| **storage** | 数据持久化 | 数据库连接、仓库、存储访问（合并了原 data/repositories/database/dependencies） |

## 对比简化前后

| 指标 | 简化前 | 简化后 |
|------|--------|--------|
| 数据访问分层 | 4 层重叠 | 1 层统一 |
| 总架构层数 | 6 层 | 4 层 |
| 需要理解的概念 | 更多 | 更少 |
| 导入路径 | 更长 | 更短 |
| 开发复杂度 | 较高 | 降低 |

## 关键导入路径对照表

| 原来 | 现在 |
|------|------|
| `from app.dependencies.services import ...` | `from app.storage import ...` |
| `from app.repositories.X import ...` | `from app.storage.repositories.X import ...` |
| `from app.database.X import ...` | `from app.storage.database.X import ...` |
| `from app.data.X import ...` | `from app.storage.X import ...` |
