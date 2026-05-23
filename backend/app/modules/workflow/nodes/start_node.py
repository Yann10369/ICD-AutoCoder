"""开始节点"""
from .base_node import BaseNode


class StartNode(BaseNode):
    """开始节点 - 流程入口"""

    def execute(self, node_data, context):
        # 直接将输入传递下去
        return {
            'success': True,
            'data': context.get('input', {}),
        }
