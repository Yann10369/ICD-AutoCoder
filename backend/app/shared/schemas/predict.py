"""预测相关Schema"""
from typing import List, Optional, Dict
from pydantic import BaseModel


class ICDPrediction(BaseModel):
    """单个ICD编码预测结果"""
    code: str
    description: str
    probability: float


class PredictResponse(BaseModel):
    """预测响应"""
    icdPredictions: List[ICDPrediction]
    entities: Optional[Dict[str, List[str]]] = None
    executionTimeMs: Optional[float] = None
    modelUsed: Optional[str] = None
