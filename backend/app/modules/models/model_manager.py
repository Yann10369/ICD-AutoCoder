"""模型管理模块"""
from typing import Dict, List, Optional, Any
from zoneinfo import available_timezones
import requests
from app.core.config import settings
from app.core.logger import logger
from app.modules.model_configs.model_config_service import model_config_service


class ModelManager:
    """模型管理器"""
    
    def get_available_small_models(self) -> List[str]:
        """从 model_configs.json 获取可用的小模型列表"""
        configs = model_config_service.list_configs()
        # 筛选出 category="small" 且 status="valid" 的模型
        small_models = [
            cfg.name for cfg in configs 
            if cfg.category == "small" and cfg.status == "valid" and cfg.name
        ]
        return small_models if small_models else ["PLM-ICD"]  # 默认返回 PLM-ICD
    
    def gateway(
        self,
        model_names: List[str],
        text: str,
        top_k: int = 10,
        threshold: float = 0.5
    ) -> Dict[str, Any]:
        """
        通过 MODELS/app.py 调用多个小模型
        
        Args:
            model_names: 模型名称列表
            text: 输入文本
            top_k: 返回前k个结果
            threshold: 概率阈值
            
        Returns:
            API返回的原始结果
        """
        # 调用 MODELS/app.py 的 /small_models API
        api_url = f"{settings.MODELS_API_URL.rstrip('/')}/small_models"
        
        # 默认失败返回值
        default_failure_result = {
            'results': [],
            'total': 0
        }
        
        if not model_names:
            logger.warning("模型列表为空")
            return default_failure_result
        
        try:
            # 调用中继站API，传入模型列表
            response = requests.post(
                api_url,
                json={
                    "text": text,
                    "models": [{"name": name} for name in model_names],
                    "top_k": top_k,
                    "threshold": threshold
                },
                timeout=60
            )
            response.raise_for_status()
            api_result = response.json()
            
            # 直接返回API的原始结果
            return api_result
            
        except requests.exceptions.Timeout:
            logger.error(f"调用Small_Model超时 ({model_names})，返回默认空结果")
            return default_failure_result
        except requests.exceptions.ConnectionError:
            logger.error(f"无法连接到Small_Model ({model_names})，返回默认空结果")
            return default_failure_result
        except requests.exceptions.HTTPError as e:
            logger.error(f"Small_Model返回HTTP错误 ({model_names}): {e.response.status_code if e.response else 'Unknown'}，返回默认空结果")
            return default_failure_result
        except requests.exceptions.RequestException as e:
            logger.error(f"调用Small_Model失败 ({model_names}): {str(e)}，返回默认空结果")
            return default_failure_result
        except (ValueError, KeyError, TypeError) as e:
            logger.error(f"解析Small_Model返回结果失败 ({model_names}): {str(e)}，返回默认空结果")
            return default_failure_result
        except Exception as e:
            logger.error(f"调用Small_Model时发生未知错误 ({model_names}): {str(e)}，返回默认空结果")
            return default_failure_result
    
    def large_model(
        self,
        model_name: str,
        text: str,
        predictions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        调用LLM服务生成解释（使用ai模块）
        
        Args:
            model_name: 使用的小模型名称（用于日志记录）
            text: 原始文本
            predictions: 小模型预测结果
            
        Returns:
            解释结果（只包含explanation，不修改predictions）
        """
        try:
            # 使用ai模块的generate_explanation函数（只生成解释，不修改预测结果）
            from app.modules.explain.ai import generate_explanation
            
            logger.info(f"开始调用generate_explanation，predictions数量: {len(predictions)}")
            explanation_result = generate_explanation(
                text=text,
                predictions=predictions,
                api_key=settings.ALI_API_KEY,
                base_url=settings.ALI_BASE_URL
            )
            logger.info(f"generate_explanation返回结果: {list(explanation_result.keys())}, explanation长度: {len(explanation_result.get('explanation', ''))}")
            return explanation_result
        except Exception as e:
            logger.error(f"调用LLM解释服务失败: {str(e)}", exc_info=True)
            return {
                "explanation": f"解释生成失败: {str(e)}",
                "model_used": "error",
                "error": str(e)
            }
    
    def predict(
        self, 
        preprocessed_text: Dict[str, Any],
        model_type: str,
        top_k: int = None,
        generate_explanation: bool = True
    ) -> Dict[str, Any]:
        """
        使用模型进行预测（支持小模型API调用和解释生成）
        
        Args:
            preprocessed_text: 预处理后的文本字典
            model_type: 模型类型
            top_k: 返回前k个结果
            generate_explanation: 是否生成解释
            
        Returns:
            预测结果（包含解释）
        """

        available_models = self.get_available_small_models()
        top_k = top_k or settings.TOP_K
        threshold = settings.PREDICTION_THRESHOLD
        
        original_text = preprocessed_text.get('preprocessed_text', '') or preprocessed_text.get('original_text', '')

        # 默认混动模式：优先小模型，失败则fallback到LLM
        logger.info(f"混动模式：尝试调用小模型API，模型列表: {available_models}")
        api_result = self.gateway(
            model_names=available_models,
            text=original_text,
            top_k=top_k,
            threshold=threshold
        )

        # 小模型调用失败时fallback到LLM
        use_llm_fallback = False
        has_small_results = any(
            model_result.get('results', [])
            for model_result in api_result.get('results', [])
        )
        if not has_small_results:
            logger.info("小模型API返回空结果，fallback到LLM预测")
            use_llm_fallback = True

        # LLM预测分支：直接调用大模型生成ICD编码
        if use_llm_fallback:
            from app.modules.explain.ai import generate_prediction
            logger.info("调用LLM直接预测ICD编码")
            llm_result = generate_prediction(text=original_text, top_k=top_k)
            # 转换LLM结果格式（把icdPredictions转为gateway格式
            api_result = {
                'results': [{
                    'model_name': 'llm',
                    'results': llm_result.get('icdPredictions', [])
                }],
                'total': 1,
                'model_results': {}
            }
        
        # 处理API返回结果：API返回格式为 {total: int, results: [{model_name: str, results: [...]}]}
        # 需要将所有模型的结果合并
        # 注意：小模型网关返回 'icd_code'，LLM fallback返回 'code'
        predictions = []
        if api_result and 'results' in api_result:
            for model_result in api_result.get('results', []):
                for item in model_result.get('results', []):
                    predictions.append({
                        'code': item.get('icd_code') or item.get('code', ''),
                        'description': item.get('description', ''),
                        'probability': item.get('probability', 0.0)
                    })
        
        # 使用模型列表的字符串表示
        model_name_str = ', '.join(available_models) if available_models else "unknown"
        
        result = {
            'model': model_name_str,
            'models': available_models,  # 保留模型列表
            'text': original_text,
            'icdPredictions': predictions,
            'total': len(predictions)
        }
        
        # 生成解释（只生成解释，不修改预测结果）
        if generate_explanation:
            logger.info(f"开始调用AI模型生成解释，当前预测结果数量: {len(predictions)}")
            # 使用第一个模型名称作为标识（用于日志）
            explanation_result = self.large_model(
                model_name=model_type,
                text=original_text,
                predictions=predictions
            )
            # 解释生成只返回explanation，不修改predictions
            explanation = explanation_result.get('explanation', '')
            if explanation:
                result['explanation'] = explanation
                logger.info(f"AI模型返回解释，长度: {len(explanation)}")
            else:
                logger.warning("AI模型未返回解释")
                result['explanation'] = ''
        
        logger.info(f"最终返回结果: icdPredictions数量={len(result.get('icdPredictions', []))}, 是否有explanation={'explanation' in result}")
        return result
    


model_manager = ModelManager()
