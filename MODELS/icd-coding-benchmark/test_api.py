"""测试 MODELS/app.py API - 调用真实 API"""
import json
from fastapi.testclient import TestClient
from app import app

# 创建测试客户端
client = TestClient(app)


def test_small_models_normal():
    payload = {
        "text": "Patient is a 65-year-old male with a history of progressive shortness of breath and pedal edema. Physical exam revealed rales in lower lungs. Chest X-ray shows pulmonary congestion. Diagnosed with congestive heart failure and essential hypertension. Started on furosemide and lisinopril.",
        "models": [
            {"name": "PLM-ICD"}
        ],
        "top_k": 10,
        "threshold": 0.5
    }
    
    # 调用 API
    response = client.post("/small_models", json=payload)
    
    # 输出结果
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
    


if __name__ == "__main__":
    test_small_models_normal()
