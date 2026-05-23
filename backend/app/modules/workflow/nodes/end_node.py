"""结束节点"""
from .base_node import BaseNode


class EndNode(BaseNode):
    """结束节点 - 流程出口"""

    def execute(self, node_data, context):
        # 返回最终结果，取上一个节点的输出
        # 这里直接返回上下文结果
        return {
            'success': True,
            'data': context.get('outputs', {}),
        }
