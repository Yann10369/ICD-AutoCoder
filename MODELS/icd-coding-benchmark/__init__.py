"""
MODELS模块 - 统一的ICD编码预测模型接口
"""
from .model_predictor import ModelPredictor, create_predictor

__all__ = ['ModelPredictor', 'create_predictor']

