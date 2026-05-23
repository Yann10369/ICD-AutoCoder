"""图谱查询节点"""
from typing import Dict
from .base_node import BaseNode
from app.modules.model_configs.model_config_service import model_config_service
from app.shared.storage.database.age_graph import age_graph_client


class GraphQueryNode(BaseNode):
    """图谱查询节点"""

    def execute(self, node_data: Dict, context: Dict) -> Dict:
        graph_config_id = node_data.get('graphConfigId')
        cypher_template = node_data.get('cypher', '')

        if not graph_config_id:
            return {
                'success': False,
                'error': '未选择图谱配置',
                'data': None,
            }

        if not cypher_template.strip():
            return {
                'success': False,
                'error': 'Cypher 查询模板为空',
                'data': None,
            }

        # 获取图谱配置
        graph_config = model_config_service.get_config(graph_config_id)
        if not graph_config:
            return {
                'success': False,
                'error': f'图谱配置 {graph_config_id} 不存在',
                'data': None,
            }

        # 获取上游预测结果
        prev_outputs = context.get('outputs', {})
        # TODO: 这里需要从上下文获取预测结果，提取实体用于图谱查询
        # 目前占位，直接执行查询

        try:
            # 执行Cypher查询
            result = age_graph_client.execute_cypher(cypher_template)
            return {
                'success': True,
                'data': {
                    'graphConfigId': graph_config_id,
                    'graphName': graph_config.name,
                    'cypher': cypher_template,
                    'result': result,
                },
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'查询执行失败: {str(e)}',
                'data': None,
            }
