"""工具函数模块"""
from typing import Dict, List, Any, Optional
import json
from pathlib import Path


def load_json(file_path: str) -> Dict[str, Any]:
    """加载JSON文件"""
    path = Path(file_path)
    if not path.exists():
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(data: Dict[str, Any], file_path: str) -> None:
    """保存JSON文件"""
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def format_icd_code(icd: str) -> str:
    """格式化ICD编码"""
    # 移除空格和特殊字符，保留点和数字
    return ''.join(c for c in icd if c.isdigit() or c == '.')


def calculate_confidence(probabilities: List[float]) -> float:
    """计算置信度（取最大值或平均值）"""
    if not probabilities:
        return 0.0
    return max(probabilities)


def merge_predictions(
    predictions: List[Dict[str, Any]], 
    weights: Optional[List[float]] = None
) -> List[Dict[str, Any]]:
    """融合多个模型的预测结果"""
    if not predictions:
        return []
    
    if weights is None:
        weights = [1.0 / len(predictions)] * len(predictions)
    
    # 合并相同ICD编码的预测
    merged = {}
    for pred, weight in zip(predictions, weights):
        for item in pred.get('results', []):
            icd = item.get('icd_code')
            prob = item.get('probability', 0.0)
            
            if icd not in merged:
                merged[icd] = {
                    'icd_code': icd,
                    'icd_name': item.get('icd_name', ''),
                    'probability': 0.0,
                    'count': 0
                }
            
            merged[icd]['probability'] += prob * weight
            merged[icd]['count'] += 1
    
    # 转换为列表并排序
    result = list(merged.values())
    result.sort(key=lambda x: x['probability'], reverse=True)
    
    return result

