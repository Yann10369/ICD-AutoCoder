# 前端Dockerfile - 使用本地已构建的dist文件夹
FROM nginx:alpine

# 安装curl用于健康检查
RUN apk add --no-cache curl

# 复制本地已构建的dist文件夹
COPY dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]