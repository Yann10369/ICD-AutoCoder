# 测试模块说明

本模块提供模拟预测功能，用于**模型未接入时的测试**，主要目的是**测试前端显示功能**。

## 使用场景

1. ✅ **前端显示功能测试** - 测试前端界面是否能正确显示预测结果
2. ✅ **界面开发调试** - 前端开发时无需等待真实模型
3. ✅ **API接口联调** - 前后端接口对接测试
4. ✅ **功能演示** - 模型未接入时的功能演示

## 配置说明

### 默认配置（模型未接入测试模式）

在 `backend/app/core/config.py` 中：

```python
USE_MOCK_MODE: bool = True  # 默认True，使用模拟预测器
USE_MODEL_API: bool = False  # 默认False，不使用真实模型API
```

### 启用方式

**方式1：默认启用（推荐）**
- 无需任何配置，默认使用模拟预测器
- 所有 `/predict` 请求都会返回测试数据

**方式2：通过环境变量**
在 `.env` 文件中：
```env
USE_MOCK_MODE=true
USE_MODEL_API=false
```

**方式3：通过测试API**
直接使用 `/test/predict` 接口，始终返回测试数据

## API接口

### 主预测接口（使用测试数据）

**Endpoint:** `POST /predict`

**Request:**
```json
{
  "caseText": "患者因胸痛入院，诊断为急性心肌梗死",
  "model": "CAML",
  "params": {
    "topK": 10,
    "threshold": 0.5
  }
}
```

**Response:**
```json
{
  "entities": {
    "diseases": ["myocardial infarction", "heart failure"],
    "symptoms": ["chest pain", "shortness of breath"],
    "procedures": ["echocardiogram", "ecg"]
  },
  "icdPredictions": [
    {
      "code": "410.71",
      "description": "Subendocardial infarction",
      "probability": 0.89
    },
    {
      "code": "410.7",
      "description": "Subendocardial infarction, initial episode",
      "probability": 0.85
    }
  ],
  "avgConfidence": 0.85,
  "processingTime": 150,
  "keywordHeatmap": [...],
  "featureImportance": [...],
  "decisionPath": [...],
  "isMock": true,
  "mockMode": true
}
```

### 测试API接口

**Endpoint:** `POST /test/predict`

功能与 `/predict` 相同，但始终返回测试数据，不受配置影响。

## 测试数据说明

### ICD预测结果

包含10个ICD编码预测，概率范围 0.35-0.89：
- `410.71` - Subendocardial infarction (0.89)
- `410.7` - Subendocardial infarction, initial episode (0.85)
- `410` - Acute myocardial infarction (0.80)
- `428.0` - Congestive heart failure (0.55)
- 等等...

### 实体识别结果

包含：
- **疾病** (diseases): 3个
- **症状** (symptoms): 3个
- **操作** (procedures): 3个
- **药物** (medications): 3个

### 可解释性数据

- **关键词热度** (keywordHeatmap): 10个关键词
- **特征重要性** (featureImportance): 10个特征
- **决策路径** (decisionPath): 6个步骤

## 切换模式

### 继续使用测试模式（默认）
```python
USE_MOCK_MODE = True
USE_MODEL_API = False
```

### 切换到真实模型模式
```python
USE_MOCK_MODE = False
USE_MODEL_API = True
# 需要配置 MODEL_API_BASE_URL
```

## 注意事项

1. ✅ **测试模式是默认模式**，适合前端显示功能测试
2. ✅ **返回的数据格式与真实API一致**，可以直接用于前端测试
3. ✅ **所有字段都已填充**，包含前端需要的所有数据
4. ✅ **响应包含 `isMock: true` 标识**，便于区分测试数据
5. ⚠️ **测试数据是固定的**，不会根据输入文本变化

## 前端显示测试

使用测试模式时，前端可以测试：

1. ✅ **预测结果表格** - 显示ICD编码和概率
2. ✅ **实体识别** - 显示识别的疾病、症状等
3. ✅ **知识图谱** - 显示ICD层级关系
4. ✅ **可解释性分析** - 显示关键词热度和特征重要性
5. ✅ **决策路径** - 显示预测过程的各个步骤

所有测试数据都已准备好，可以直接用于前端界面开发和测试。

## 日志说明

当使用测试模式时，后端日志会显示：
```
使用模拟预测模式（模型未接入测试模式）
测试数据将用于前端显示功能验证
模拟预测完成，返回 X 个ICD预测结果
```

这有助于确认系统正在使用测试数据。
