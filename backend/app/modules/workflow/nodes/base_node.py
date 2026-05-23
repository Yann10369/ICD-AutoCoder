"""节点基类"""
from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseNode(ABC):
    """工作流节点基类"""

    @abstractmethod
    def execute(self, node_data: Dict, context: Dict) -> Dict:
        """执行节点

        Args:
            node_data: 节点配置数据
            context: 执行上下文，包含 input 和 outputs

        Returns:
            {
                'success': bool, 是否成功
                'error': str, 错误信息（如果失败）
                'data': Any, 输出数据
            }
        """
        pass
