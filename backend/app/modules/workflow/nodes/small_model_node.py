"""小模型预测节点"""
from typing import Dict, Any
from .base_node import BaseNode
from app.modules.model_configs.model_config_service import model_config_service
from app.modules.models.model_manager import model_manager
from app.core.logger import logger


class SmallModelNode(BaseNode):
    """小模型预测节点"""

    def execute(self, node_data: Dict, context: Dict) -> Dict:
        model_id = node_data.get('modelId')
        top_k = node_data.get('topK', 5)
        threshold = node_data.get('threshold', 0.5)
        generate_explanation_flag = node_data.get('generateExplanation', False)

        if not model_id:
            return {
                'success': False,
                'error': '未选择小模型',
                'data': None,
            }

        # 获取模型配置
        model_config = model_config_service.get_config(model_id)
        if not model_config:
            return {
                'success': False,
                'error': f'模型 {model_id} 不存在',
                'data': None,
            }

        # 检查模型是否启用
        if model_config.enabled is False:
            return {
                'success': False,
                'error': f'模型 {model_config.name} 已禁用',
                'data': None,
            }

        # 获取输入文本
        input_data = context.get('input', {})
        case_text = input_data.get('caseText', '')

        if not case_text.strip():
            return {
                'success': False,
                'error': '输入病例文本为空',
                'data': None,
            }

        try:
            # 调用模型管理器进行预测
            logger.info(f"工作流节点调用小模型预测: {model_config.name}, top_k={top_k}")

            prediction_result = model_manager.predict(
                preprocessed_text={
                    'original_text': case_text,
                    'preprocessed_text': case_text
                },
                model_type=model_config.name,
                top_k=top_k,
                generate_explanation=generate_explanation_flag
            )

            return {
                'success': True,
                'data': {
                    'modelId': model_id,
                    'modelName': model_config.name,
                    'caseText': case_text,
                    'topK': top_k,
                    'threshold': threshold,
                    'predictions': prediction_result.get('icdPredictions', []),
                    'explanation': prediction_result.get('explanation', ''),
                    'modelUsed': prediction_result.get('model', ''),
                    'total': prediction_result.get('total', 0)
                },
            }
        except Exception as e:
            logger.error(f"小模型预测节点执行失败: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f'预测执行失败: {str(e)}',
                'data': None,
            }
