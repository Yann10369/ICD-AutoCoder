# Docker 代码更新说明

## 当前配置

根据 `docker-compose.yml` 配置：

### 后端（Backend）
- ✅ **有 Volume 挂载**：`./backend:/app`
- ✅ 代码修改后可以直接在容器中生效
- ⚠️ 需要重启容器或使用热重载

### 前端（Frontend）
- ❌ **无 Volume 挂载**（因为需要构建）
- ⚠️ 代码修改后需要重新构建镜像

---

## 更新方式

### 方式1：后端代码修改（推荐）

**步骤：**

```bash
# 1. 修改代码后，重启后端容器
docker-compose restart backend

# 或者重启所有服务
docker-compose restart
```

**或者使用热重载（开发环境）：**

修改 `docker-compose.yml`，在 CMD 中添加 `--reload`：

```yaml
# backend/Dockerfile (开发环境)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

然后重启容器：

```bash
docker-compose restart backend
```

之后代码修改会自动重载，无需手动重启。

---

### 方式2：前端代码修改

**步骤：**

```bash
# 1. 停止并删除旧容器
docker-compose down frontend

# 2. 重新构建前端镜像（不缓存）
docker-compose build --no-cache frontend

# 3. 启动前端服务
docker-compose up -d frontend

# 或者一步完成：重建并启动
docker-compose up -d --build frontend
```

---

### 方式3：同时更新前后端

```bash
# 停止所有容器
docker-compose down

# 重新构建所有镜像（前端需要重新构建）
docker-compose build --no-cache

# 启动所有服务
docker-compose up -d

# 或者一步完成
docker-compose up -d --build
```

---

## 快速更新命令

### 仅更新后端代码
```bash
docker-compose restart backend
```

### 仅更新前端代码
```bash
docker-compose up -d --build frontend
```

### 更新所有服务
```bash
docker-compose up -d --build
```

### 完全重建（清理所有缓存）
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 开发环境优化（可选）

### 后端热重载

修改 `backend/Dockerfile`：

```dockerfile
# 开发环境使用 --reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**优点：**
- 代码修改后自动重载
- 无需手动重启容器

### 前端开发模式（开发环境）

修改 `docker-compose.yml`，添加前端开发卷：

```yaml
frontend:
  # ... 其他配置
  volumes:
    - ./frontend/src:/app/src  # 挂载源码目录
    - ./frontend/public:/app/public  # 挂载公共资源
  command: npm run dev  # 使用开发模式
```

**注意：** 开发模式需要修改 `frontend/Dockerfile` 使用 Node 镜像而不是 nginx。

---

## 常用 Docker 命令

### 查看运行状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs

# 查看后端日志
docker-compose logs backend

# 查看前端日志
docker-compose logs frontend

# 实时查看日志（follow）
docker-compose logs -f backend
```

### 进入容器
```bash
# 进入后端容器
docker-compose exec backend bash

# 进入前端容器
docker-compose exec frontend sh
```

### 停止所有服务
```bash
docker-compose down
```

### 停止并删除卷（清理数据）
```bash
docker-compose down -v
```

---

## 推荐工作流程

### 日常开发（后端）
1. 修改代码
2. `docker-compose restart backend`
3. 查看日志确认更新成功

### 日常开发（前端）
1. 修改代码
2. `docker-compose up -d --build frontend`
3. 刷新浏览器查看效果

### 生产环境部署
1. 修改代码
2. `docker-compose down`
3. `docker-compose build --no-cache`
4. `docker-compose up -d`
5. 查看日志确认启动成功

---

## 注意事项

1. **前端修改必须重新构建**：因为前端代码需要编译成静态文件
2. **后端代码可以直接生效**：因为使用了 volume 挂载
3. **生产环境建议禁用 --reload**：会影响性能
4. **清理缓存**：如果遇到奇怪问题，使用 `--no-cache` 完全重建

---

## 快速参考

```bash
# 🔄 后端代码更新
docker-compose restart backend

# 🔄 前端代码更新
docker-compose up -d --build frontend

# 🔄 更新所有服务
docker-compose up -d --build

# 📋 查看日志
docker-compose logs -f

# 🛑 停止服务
docker-compose down

# 🚀 启动服务
docker-compose up -d
```

