# Models 服务架构

## 架构设计

每个模型都运行在**独立的 Docker 容器**中，拥有自己独立的环境依赖配置。Gateway 只作为请求转发网关，保持镜像最小化。

### 目录结构

```
MODELS/
├── Dockerfile              # Gateway 网关（最小化镜像）
├── requirements.txt        # Gateway 仅依赖: fastapi + uvicorn + requests
├── app.py                  # Gateway 代码 - 转发请求到各个模型服务
├── docker-compose.yml      # 所有模型服务编排
├── README.md               # 本文档
│
└── PLM-ICD/                # PLM-ICD 模型（当前唯一启用模型）
    ├── requirements.txt    # PLM-ICD 特有依赖 (torch, transformers, ...)
    ├── service/Dockerfile  # PLM-ICD 独立 Dockerfile
    ├── service/app.py      # PLM-ICD FastAPI 服务入口
    ├── param/              # 模型参数文件（通过 volume 挂载）
    └── src/                # 模型源码

# 添加新模型时，复制 PLM-ICD 目录结构，修改对应配置即可
```

### 网络架构

```
前端/后端 → models-gateway:8005 → HTTP → plm-icd:8001
                              → HTTP → [其他模型]:[端口]
```

### 添加新模型步骤

1. **创建目录结构**
   ```bash
   mkdir -p YOUR_MODEL_NAME/service
   ```

2. **复制参考配置**
   - 从 `PLM-ICD/` 复制 `requirements.txt` 到 `YOUR_MODEL_NAME/` 后修改依赖
   - 从 `PLM-ICD/service/` 复制 `Dockerfile` 和 `app.py` 到 `YOUR_MODEL_NAME/service/` 后修改

3. **配置依赖**
   - 编辑 `YOUR_MODEL_NAME/requirements.txt`，添加模型所需的依赖

4. **配置 Dockerfile**
   - 编辑 `YOUR_MODEL_NAME/service/Dockerfile`，修改暴露端口和启动命令

5. **编写服务代码**
   - 修改 `YOUR_MODEL_NAME/service/app.py`，实现你的模型预测
   - 必须提供:
     - `GET /models/{model_name}/health` - 健康检查
     - `POST /models/{model_name}/predict` - 预测接口

6. **更新 docker-compose.yml**
   在 `MODELS/docker-compose.yml` 和根目录 `docker-compose.yml` 添加新服务配置

### 镜像大小说明

| 镜像 | 大小 | 原因 |
|------|------|------|
| models-gateway | ~150MB | 只含 Python + 少量依赖（fastapi/requests only）|
| plm-icd | ~1.5GB | 含 torch + transformers + ML 依赖 |

每个模型按需安装依赖，不会互相影响，也不会把不需要的依赖打包到 gateway。

## 使用方法

```bash
# 在项目根目录启动所有服务（包含模型服务）
docker-compose --profile models up -d

# 只启动主应用，不启动模型服务
docker-compose up -d

# 或者在 MODELS 目录单独启动模型服务
cd MODELS
docker-compose up -d
```
