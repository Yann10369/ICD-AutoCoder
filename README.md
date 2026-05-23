# ICD-AutoCoder 项目目录结构

```
ICD-AutoCoder/
├── .claude/                      # Claude 配置和记忆
│   ├── memory/                   # 项目记忆文件
│   ├── skills/                   # Claude skills
│   └── settings.local.json
├── .github/                      # GitHub 配置
├── .vscode/                      # VS Code 配置
├── MODELS/                       # 模型服务目录
│   ├── Dockerfile                # 模型网关Dockerfile
│   ├── docker-compose.yml
│   ├── app.py                    # 模型网关入口
│   ├── __init__.py
│   ├── README.md
│   ├── icd-coding-benchmark/     # Benchmark模型
│   └── ner_service/             # NER服务
├── backend/                      # FastAPI 后端
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── init-db.sql
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 入口
│   │   ├── api/                 # API 路由层
│   │   ├── core/                # 核心配置
│   │   ├── data/                # JSON数据文件
│   │   └── tests/               # 测试文件
│   ├── data/
│   │   └── users.json
│   └── wheels/                  # Python包缓存（构建后删除）
├── frontend/                     # React 前端
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── public/
│   ├── dist/                    # 构建产物
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api/                 # API客户端
│       ├── components/          # React组件
│       ├── hooks/               # 自定义Hooks
│       ├── pages/              # 页面组件
│       └── utils/              # 工具函数
├── docs/                         # 项目文档
├── app/                          # 独立应用
│   └── data/
│       └── icd_hierarchy.json
├── data/                         # 数据目录
├── docker-compose.yml            # Docker Compose 配置
└── README.md
```

## 核心端口映射

| 服务 | 端口 | 说明 |
|------|------|------|
| backend | 8000 | FastAPI 后端 |
| frontend | 8080 | Nginx 前端 |
| postgres | 15432 | PostgreSQL |
| models-gateway | 8005 | 模型网关 |
| plm-icd | 8001 | PLM-ICD模型 |
| ner | 8002 | NER模型 |
| benchmark | 8003 | Benchmark模型 |

## API 端点

| 模块 | 路由前缀 |
|------|----------|
| predict | /api/predict |
| explain | /api/explain |
| graph | /api/graph |
| models | /api/models |
| model_configs | /api/model-configs |
| workflow | /api/workflow |
