# Models Aggregation Gateway
# 仅作为请求转发网关 - 保持镜像最小化
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Copy wheels file to container
COPY wheels /wheels

# Copy requirements - gateway only needs minimal dependencies
COPY requirements.txt .

# Install Python dependencies from local wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt

# Copy application code
COPY app.py .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]