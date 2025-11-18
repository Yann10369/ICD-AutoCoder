# 模型服务说明

## 概述

三个小模型（CAML、DCAN、Fusion）现在通过API接口调用，不再本地加载模型文件。

## 模型API服务配置

### 默认配置

在 `config.py` 中配置：

```python
MODEL_API_BASE_URL: str = "http://localhost:8001"  # 模型服务基础URL
MODEL_API_URLS: Dict[str, str] = {}  # 各模型的API URL
```

### 默认API端点格式

- CAML: `http://localhost:8001/models/caml/predict`
- DCAN: `http://localhost:8001/models/dcan/predict`
- Fusion: `http://localhost:8001/models/fusion/predict`
- TransICD: `http://localhost:8001/models/transicd/predict`

### 自定义API URL

在 `.env` 文件中或配置中设置：

```env
MODEL_API_URLS={"CAML": "http://localhost:8002/predict", "DCAN": "http://localhost:8003/predict"}
```

## 模型API接口规范

### 预测接口

**请求**:
```http
POST /models/{model_name}/predict
Content-Type: application/json

{
  "text": "预处理后的文本",
  "top_k": 10
}
```

**响应**:
```json
{
  "results": [
    {
      "icd_code": "410.71",
      "icd_name": "Subendocardial infarction",
      "probability": 0.85
    },
    ...
  ],
  "total": 10
}
```

### 健康检查接口

**请求**:
```http
GET /models/{model_name}/health
```

**响应**:
```json
{
  "status": "healthy",
  "model": "CAML"
}
```

## 降级策略

如果API调用失败，系统会自动降级到模拟模式，返回模拟数据，确保系统可用性。

## 文件说明

- `models/` - 三个小模型的API服务应该部署在这里（独立服务）
- 当前后端不再包含模型权重文件
- 所有模型调用都通过HTTP API进行

