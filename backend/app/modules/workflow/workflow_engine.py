"""工作流执行引擎"""
from typing import List, Dict, Any, Optional
from app.modules.workflow.nodes.base_node import BaseNode
from app.modules.workflow.nodes.start_node import StartNode
from app.modules.workflow.nodes.end_node import EndNode
from app.modules.workflow.nodes.small_model_node import SmallModelNode
from app.modules.workflow.nodes.graph_query_node import GraphQueryNode


class WorkflowEngine:
    """工作流执行引擎"""

    def __init__(self):
        self.node_handlers = {
            'startNode': StartNode(),
            'endNode': EndNode(),
            'smallModelNode': SmallModelNode(),
            'graphQueryNode': GraphQueryNode(),
        }

    def find_start_node(self, nodes: List[Dict]) -> Optional[Dict]:
        """找到开始节点"""
        for node in nodes:
            if node.get('type') == 'startNode':
                return node
        return None

    def get_node_outputs(self, node_id: str, edges: List[Dict]) -> List[Dict]:
        """获取节点的所有输出边"""
        outputs = []
        for edge in edges:
            if edge.get('source') == node_id:
                outputs.append(edge)
        return outputs

    def get_node_by_id(self, node_id: str, nodes: List[Dict]) -> Optional[Dict]:
        """根据ID获取节点"""
        for node in nodes:
            if node.get('id') == node_id:
                return node
        return None

    def execute(self, workflow: Dict, input_data: Dict) -> Dict:
        """执行工作流"""
        nodes = workflow.get('nodes', [])
        edges = workflow.get('edges', [])

        # 找到开始节点
        current_node = self.find_start_node(nodes)
        if not current_node:
            return {
                'success': False,
                'error': '没有找到开始节点',
                'result': None,
            }

        # 执行上下文
        context = {
            'input': input_data,
            'outputs': {},
        }

        visited = set()

        while current_node:
            if current_node['id'] in visited:
                # 避免循环
                break
            visited.add(current_node['id'])

            # 执行当前节点
            node_type = current_node.get('type')
            handler = self.node_handlers.get(node_type)

            if not handler:
                return {
                    'success': False,
                    'error': f'不支持的节点类型: {node_type}',
                    'result': context,
                }

            result = handler.execute(current_node['data'], context)
            context['outputs'][current_node['id']] = result

            if not result.get('success', True):
                return {
                    'success': False,
                    'error': result.get('error', f'节点 {current_node["id"]} 执行失败'),
                    'result': context,
                }

            # 如果是结束节点，返回结果
            if node_type == 'endNode':
                return {
                    'success': True,
                    'result': context.get('outputs', {}),
                    'steps': len(visited),
                }

            # 找到下一个节点
            outputs = self.get_node_outputs(current_node['id'], edges)
            if not outputs:
                break

            # 目前只支持单输出，取第一个
            next_edge = outputs[0]
            next_node = self.get_node_by_id(next_edge.get('target'), nodes)
            current_node = next_node

        # 如果没有碰到结束节点，返回最后结果
        return {
            'success': True,
            'result': context.get('outputs', {}),
            'steps': len(visited),
            'completed': False,
        }
