"""
编码工作台模块 (coding_workbench)

包含：
- coding_pool.py: 三分区编码池管理器
- coding_validator.py: 编码规则校验引擎
- special_coding.py: 特殊编码检测（M码/外部原因/星剑号）
- drg_linkage.py: DRG深度联动
- routes.py: API路由
"""
from .coding_pool import CodingPoolManager, CodeItem
from .coding_validator import CodingValidator, ValidationResult, ValidationLevel

__all__ = [
    "CodingPoolManager",
    "CodeItem",
    "CodingValidator",
    "ValidationResult",
    "ValidationLevel",
]
