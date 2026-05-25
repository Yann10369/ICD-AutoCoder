# Use Python 3.11 slim image
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

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies from local wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt

# Copy application code
COPY . .

# Note: Model source code and param files will be mounted via volume

# Expose port
EXPOSE 8001

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]