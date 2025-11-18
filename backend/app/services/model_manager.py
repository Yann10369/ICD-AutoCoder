"""模型管理模块（简化版，仅用于测试）"""
from typing import Dict, List, Optional, Any
from app.core.config import settings
from app.core.logger import logger


class ModelManager:
    """模型管理器（测试模式）"""
    
    def __init__(self):
        self.current_model = settings.DEFAULT_MODEL
    
    def get_available_models(self) -> List[str]:
        """获取可用模型列表（测试模式返回固定列表）"""
        return ["CAML", "DCAN", "Fusion", "TransICD"]
    
    def set_current_model(self, model_name: str) -> bool:
        """切换当前模型"""
        available_models = self.get_available_models()
        if model_name in available_models:
            self.current_model = model_name
            logger.info(f"切换到模型: {model_name}")
            return True
        return False
    
    def predict(
        self, 
        preprocessed_text: Dict[str, Any],
        model_name: Optional[str] = None,
        top_k: int = None
    ) -> Dict[str, Any]:
        """使用测试数据进行预测"""
        from app.tests.mock_predict import mock_predictor
        logger.info(f"ModelManager: 使用测试预测模式")
        
        original_text = preprocessed_text.get('original_text', '') or preprocessed_text.get('preprocessed_text', '')
        top_k = top_k or settings.TOP_K
        threshold = settings.PREDICTION_THRESHOLD
        
        mock_result = mock_predictor.predict(
            original_text, 
            model=model_name or self.current_model, 
            top_k=top_k, 
            threshold=threshold
        )
        
        results = []
        for pred in mock_result.get('icdPredictions', []):
            results.append({
                'icd_code': pred.get('code', ''),
                'icd_name': pred.get('description', ''),
                'probability': pred.get('probability', 0.0)
            })
        
        return {
            'model': model_name or self.current_model,
            'text': preprocessed_text.get('preprocessed_text', ''),
            'results': results,
            'total': len(results),
            'mock_mode': True
        }
    
    def collaborative_reasoning(
        self,
        preprocessed_text: Dict[str, Any],
        model_names: Optional[List[str]] = None,
        use_graph_filter: bool = True,
        use_llm_verification: bool = True,
        llm_verifier: Optional[Any] = None,
        fusion_method: str = "weighted_average",
        low_confidence_threshold: float = 0.6
    ) -> Dict[str, Any]:
        """协同推理（测试模式）"""
        from app.tests.mock_predict import mock_predictor
        logger.info(f"ModelManager: 使用测试预测模式进行协同推理")
        
        original_text = preprocessed_text.get('original_text', '') or preprocessed_text.get('preprocessed_text', '')
        top_k = settings.TOP_K
        threshold = settings.PREDICTION_THRESHOLD
        
        model_names = model_names or [self.current_model]
        mock_result = mock_predictor.predict(
            original_text, 
            model=model_names[0] if model_names else self.current_model, 
            top_k=top_k, 
            threshold=threshold
        )
        
        results = []
        for pred in mock_result.get('icdPredictions', []):
            results.append({
                'icd_code': pred.get('code', ''),
                'icd_name': pred.get('description', ''),
                'probability': pred.get('probability', 0.0)
            })
        
        avg_confidence = mock_result.get('avgConfidence', 0.0)
        
        return {
            'models_used': model_names,
            'text': preprocessed_text.get('preprocessed_text', ''),
            'results': results,
            'total': len(results),
            'graph_filtered': use_graph_filter,
            'llm_verified': False,
            'fusion_method': fusion_method,
            'avg_confidence': avg_confidence,
            'llm_candidates_generated': False,
            'mock_mode': True
        }


model_manager = ModelManager()
