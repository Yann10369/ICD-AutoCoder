"""测试AI API连接"""
import os
import sys
sys.path.insert(0, 'D:/ICD-AutoCoder/backend')

from app.services.ai import generate_explanation
from app.core.config import settings

print(f"API Key: {settings.ALI_API_KEY[:8]}...")
print(f"Base URL: {settings.ALI_BASE_URL}")
print(f"Proxy: {os.environ.get('http_proxy')}")

# 测试生成解释
test_text = "患者因心力衰竭入院，表现为呼吸困难、水肿。"
test_predictions = [
    {"code": "428.0", "description": "Congestive heart failure", "probability": 0.88},
    {"code": "401.9", "description": "Unspecified essential hypertension", "probability": 0.65}
]

print("\n开始测试AI解释生成...")
result = generate_explanation(test_text, test_predictions)

print("\n结果:")
print(f"Model used: {result.get('model_used')}")
if 'error' in result:
    print(f"Error: {result.get('error')}")
print(f"\nExplanation:\n{result.get('explanation')}")
