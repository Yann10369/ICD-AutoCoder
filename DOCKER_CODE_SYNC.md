# Docker 代码同步指南

## 当前配置说明

- **后端 (backend)**: 已配置 volume 挂载 (`./backend:/app`)，代码修改会自动同步
- **前端 (frontend)**: 未配置 volume 挂载，需要重新构建镜像

## 方法 1: 重新构建前端镜像（推荐）

修改前端代码后，执行以下命令：

```bash
# 只重新构建前端
docker-compose build frontend

# 停止并删除旧容器，然后重新创建
docker-compose up -d --force-recreate frontend

# 或者一条命令完成：重新构建并重启
docker-compose up -d --build frontend
```

## 方法 2: 重新构建所有服务

```bash
# 重新构建所有服务
docker-compose build

# 重启所有服务
docker-compose up -d
```

## 方法 3: 后端代码同步（自动）

由于后端已配置 volume 挂载，代码修改会自动同步到容器中。

如果修改了 Python 依赖（requirements.txt），需要：

```bash
# 重新构建后端镜像
docker-compose build backend

# 重启后端服务
docker-compose restart backend
```

如果只是修改了代码（未修改依赖），通常只需要重启服务：

```bash
# 重启后端服务（代码已通过 volume 自动同步）
docker-compose restart backend
```

## 方法 4: 快速重启（仅代码修改）

如果只修改了代码，可以快速重启：

```bash
# 重启前端（需要重新构建）
docker-compose build frontend && docker-compose up -d frontend

# 重启后端（代码已同步，直接重启即可）
docker-compose restart backend
```

## 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看前端日志
docker-compose logs -f frontend

# 查看后端日志
docker-compose logs -f backend
```

## 完整工作流程示例

```bash
# 1. 修改代码后，重新构建前端
docker-compose build frontend

# 2. 重启前端服务
docker-compose up -d frontend

# 3. 查看日志确认启动成功
docker-compose logs -f frontend

# 4. 后端代码修改后（如果只是代码，不需要重新构建）
docker-compose restart backend
```

## 注意事项

1. **前端修改**：由于前端需要构建（npm run build），每次修改后都需要重新构建镜像
2. **后端修改**：代码会自动同步，但修改了依赖需要重新构建
3. **性能优化**：如果频繁修改前端代码，建议配置开发模式（使用 Vite 开发服务器）

