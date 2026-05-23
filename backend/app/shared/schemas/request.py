"""统一请求模型"""
from typing import Optional, Dict
from pydantic import BaseModel


class PredictRequest(BaseModel):
    """预测请求"""
    caseText: str
    language: Optional[str] = "zh"
    preprocessOptions: Optional[Dict[str, bool]] = None
    model: Optional[str] = "hybrid"
    params: Optional[Dict[str, float]] = None
