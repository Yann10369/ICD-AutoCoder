"""
病历状态机引擎
基于FSM有限状态机，管理病历从待编码到已归档的全生命周期
"""
from typing import Dict, List, Optional
from enum import Enum
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class CaseStatus(Enum):
    """病历状态枚举"""
    PENDING_CODING = "pending_coding"      # 待编码
    CODING_IN_PROGRESS = "coding_in_progress"  # 编码中
    PENDING_QA = "pending_qa"              # 待质控
    QA_REJECTED = "qa_rejected"            # 质控打回
    ARCHIVED = "archived"                   # 已归档

    @classmethod
    def has_value(cls, value):
        return value in cls._value2member_map_


class CaseStatusMachine:
    """
    病历状态机引擎 - 基于FSM有限状态机

    状态流转图:
        pending_coding → coding_in_progress → pending_qa → archived
                                        ↓           ↑
                                  qa_rejected ------┘
    """

    # 状态转移矩阵：当前状态 → 允许的下一状态
    TRANSITION_MATRIX = {
        CaseStatus.PENDING_CODING: [
            CaseStatus.CODING_IN_PROGRESS
        ],
        CaseStatus.CODING_IN_PROGRESS: [
            CaseStatus.PENDING_CODING,    # 放弃编辑，退回队列
            CaseStatus.PENDING_QA          # 提交质控
        ],
        CaseStatus.PENDING_QA: [
            CaseStatus.CODING_IN_PROGRESS, # 编码员修改
            CaseStatus.QA_REJECTED,        # 质控打回
            CaseStatus.ARCHIVED             # 质控通过归档
        ],
        CaseStatus.QA_REJECTED: [
            CaseStatus.CODING_IN_PROGRESS, # 重新编码
            CaseStatus.PENDING_QA           # 重新提交
        ],
        CaseStatus.ARCHIVED: []            # 终止状态
    }

    # 状态转移需要的角色权限
    TRANSITION_PERMISSIONS = {
        ("pending_coding", "coding_in_progress"): ["coder", "admin"],
        ("coding_in_progress", "pending_qa"): ["coder", "admin"],
        ("coding_in_progress", "pending_coding"): ["coder", "admin"],
        ("pending_qa", "coding_in_progress"): ["coder", "qa_officer", "admin"],
        ("pending_qa", "qa_rejected"): ["qa_officer", "admin"],
        ("pending_qa", "archived"): ["qa_officer", "admin"],
        ("qa_rejected", "coding_in_progress"): ["coder", "admin"],
        ("qa_rejected", "pending_qa"): ["coder", "admin"],
    }

    # 状态显示名称（中文）
    STATUS_DISPLAY_NAMES = {
        CaseStatus.PENDING_CODING: "待编码",
        CaseStatus.CODING_IN_PROGRESS: "编码中",
        CaseStatus.PENDING_QA: "待质控",
        CaseStatus.QA_REJECTED: "质控打回",
        CaseStatus.ARCHIVED: "已归档"
    }

    # 状态颜色
    STATUS_COLORS = {
        CaseStatus.PENDING_CODING: "#faad14",        # 橙色
        CaseStatus.CODING_IN_PROGRESS: "#1890ff",   # 蓝色
        CaseStatus.PENDING_QA: "#722ed1",            # 紫色
        CaseStatus.QA_REJECTED: "#f5222d",           # 红色
        CaseStatus.ARCHIVED: "#52c41a"               # 绿色
    }

    def __init__(self, case_id: str, current_status: str, user_role: str, user_id: int = None):
        """
        初始化状态机

        Args:
            case_id: 病历ID
            current_status: 当前状态值
            user_role: 当前用户角色 coder/qa_officer/admin
            user_id: 当前用户ID
        """
        self.case_id = case_id
        self.user_role = user_role
        self.user_id = user_id

        # 验证当前状态有效性
        if not CaseStatus.has_value(current_status):
            logger.warning(f"病历 {case_id} 未知状态: {current_status}，默认设为 pending_coding")
            self.current_status = CaseStatus.PENDING_CODING
        else:
            self.current_status = CaseStatus(current_status)

        self.transition_history: List[Dict] = []

    def can_transition_to(self, target_status: str) -> bool:
        """检查是否可以转移到目标状态"""
        try:
            target = CaseStatus(target_status)
        except ValueError:
            logger.error(f"无效的目标状态: {target_status}")
            return False

        # 1. 检查状态转移是否允许
        if target not in self.TRANSITION_MATRIX[self.current_status]:
            logger.warning(
                f"状态转移不允许: {self.current_status.value} → {target_status}"
            )
            return False

        # 2. 检查角色权限
        transition_key = (self.current_status.value, target_status)
        allowed_roles = self.TRANSITION_PERMISSIONS.get(transition_key, [])

        if self.user_role not in allowed_roles:
            logger.warning(
                f"角色 {self.user_role} 无权执行转移: {self.current_status.value} → {target_status}"
            )
            return False

        return True

    def transition_to(self, target_status: str, reason: str = None, **kwargs) -> Dict:
        """
        执行状态转移

        Args:
            target_status: 目标状态
            reason: 转移原因（如质控打回原因）
            **kwargs: 额外参数

        Returns:
            {success: bool, new_status: str, ...}
        """
        try:
            target = CaseStatus(target_status)
        except ValueError:
            return {
                "success": False,
                "error": f"无效的目标状态: {target_status}",
                "allowed_next": [s.value for s in self.TRANSITION_MATRIX[self.current_status]]
            }

        # 检查是否允许转移
        if not self.can_transition_to(target_status):
            return {
                "success": False,
                "error": f"不允许从 {self.current_status.value} 转移到 {target_status}",
                "allowed_next": [s.value for s in self.TRANSITION_MATRIX[self.current_status]]
            }

        # 记录转移历史
        transition_record = {
            "from": self.current_status.value,
            "to": target_status,
            "timestamp": datetime.now(),
            "user_role": self.user_role,
            "user_id": self.user_id,
            "reason": reason,
            "extra": kwargs
        }
        self.transition_history.append(transition_record)

        # 执行状态变更
        old_status = self.current_status.value
        self.current_status = target

        logger.info(
            f"病历 {self.case_id} 状态变更: {old_status} → {target_status}"
            f" (用户: {self.user_id}, 角色: {self.user_role}, 原因: {reason})"
        )

        # 触发进入新状态的钩子函数
        self._on_enter_state(target_status, old_status, reason, **kwargs)

        return {
            "success": True,
            "new_status": target_status,
            "old_status": old_status,
            "display_name": self.get_display_name()
        }

    def get_allowed_actions(self) -> List[Dict]:
        """获取当前用户可以执行的操作列表"""
        actions = []

        for next_status in self.TRANSITION_MATRIX[self.current_status]:
            transition_key = (self.current_status.value, next_status.value)
            allowed_roles = self.TRANSITION_PERMISSIONS.get(transition_key, [])

            if self.user_role in allowed_roles:
                actions.append({
                    "status": next_status.value,
                    "action_label": self._get_action_label(next_status),
                    "button_type": self._get_button_type(next_status),
                    "button_style": {
                        "color": self.STATUS_COLORS[next_status]
                    }
                })

        return actions

    def get_display_name(self) -> str:
        """获取当前状态的中文显示名称"""
        return self.STATUS_DISPLAY_NAMES.get(self.current_status, self.current_status.value)

    def get_status_color(self) -> str:
        """获取当前状态的颜色"""
        return self.STATUS_COLORS.get(self.current_status, "#000000")

    def get_transition_history(self) -> List[Dict]:
        """获取状态转移历史"""
        return self.transition_history

    def can_edit_codes(self) -> bool:
        """当前状态是否允许编辑编码"""
        editable_states = [
            CaseStatus.CODING_IN_PROGRESS,
            CaseStatus.QA_REJECTED
        ]
        return self.current_status in editable_states

    def can_submit_qa(self) -> bool:
        """是否可以提交质控"""
        return self.current_status == CaseStatus.CODING_IN_PROGRESS

    def can_qa_approve(self) -> bool:
        """是否可以执行质控通过"""
        return self.current_status == CaseStatus.PENDING_QA and self.user_role in ["qa_officer", "admin"]

    def can_qa_reject(self) -> bool:
        """是否可以执行质控打回"""
        return self.current_status == CaseStatus.PENDING_QA and self.user_role in ["qa_officer", "admin"]

    # ========== 状态钩子函数 ==========

    def _on_enter_state(self, new_status: str, old_status: str, reason: str = None, **kwargs):
        """
        进入新状态的钩子函数 - 触发副作用
        （实际项目中在这里实现：发送通知、更新统计、记录审计日志等）
        """
        if new_status == "pending_qa":
            self._on_enter_pending_qa(**kwargs)
        elif new_status == "qa_rejected":
            self._on_enter_qa_rejected(reason, **kwargs)
        elif new_status == "archived":
            self._on_enter_archived(**kwargs)
        elif new_status == "coding_in_progress":
            self._on_enter_coding_in_progress(**kwargs)

    def _on_enter_pending_qa(self, **kwargs):
        """进入待质控状态"""
        logger.info(f"病历 {self.case_id} 已提交质控，待质控人员处理")
        # TODO: 发送通知给质控人员
        # TODO: 锁定编码池（只读）

    def _on_enter_qa_rejected(self, reason: str, **kwargs):
        """进入质控打回状态"""
        logger.info(f"病历 {self.case_id} 质控打回，原因: {reason}")
        # TODO: 发送通知给编码员
        # TODO: 解锁编码池（可编辑）
        # TODO: 记录质控意见

    def _on_enter_archived(self, **kwargs):
        """进入已归档状态"""
        logger.info(f"病历 {self.case_id} 已通过质控并归档")
        # TODO: 触发DRG分组计算
        # TODO: 同步到EMR系统（如果已集成）
        # TODO: 更新编码员工作量统计

    def _on_enter_coding_in_progress(self, **kwargs):
        """进入编码中状态"""
        logger.info(f"病历 {self.case_id} 开始编码")
        # TODO: 记录开始编码时间（用于计算编码耗时）
        # TODO: 锁定病历，防止其他人同时编辑

    # ========== 辅助方法 ==========

    def _get_action_label(self, status: CaseStatus) -> str:
        """获取操作按钮文字"""
        labels = {
            CaseStatus.CODING_IN_PROGRESS: "开始编码",
            CaseStatus.PENDING_CODING: "取消编辑",
            CaseStatus.PENDING_QA: "提交质控",
            CaseStatus.QA_REJECTED: "质控打回",
            CaseStatus.ARCHIVED: "质控通过"
        }
        return labels.get(status, status.value)

    def _get_button_type(self, status: CaseStatus) -> str:
        """获取按钮类型"""
        button_types = {
            CaseStatus.PENDING_QA: "primary",      # 主要按钮
            CaseStatus.QA_REJECTED: "danger",      # 危险按钮
            CaseStatus.ARCHIVED: "success",        # 成功按钮
            CaseStatus.CODING_IN_PROGRESS: "default"
        }
        return button_types.get(status, "default")

    # ========== 便捷静态方法 ==========

    @staticmethod
    def get_all_status_info() -> List[Dict]:
        """获取所有状态的信息（用于前端筛选下拉框）"""
        return [
            {
                "value": status.value,
                "label": CaseStatusMachine.STATUS_DISPLAY_NAMES[status],
                "color": CaseStatusMachine.STATUS_COLORS[status]
            }
            for status in CaseStatus
        ]

    @staticmethod
    def get_status_display_name(status_value: str) -> str:
        """根据状态值获取中文显示名"""
        try:
            status = CaseStatus(status_value)
            return CaseStatusMachine.STATUS_DISPLAY_NAMES.get(status, status_value)
        except ValueError:
            return status_value
