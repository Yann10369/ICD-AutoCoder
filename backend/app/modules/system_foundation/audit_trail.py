"""
溯源日志服务 - 合规要求 + RLHF训练数据来源
使用PostgreSQL持久化存储
"""
from enum import Enum
from datetime import datetime, timedelta
from typing import List, Dict, Optional

from app.shared.storage.repositories.audit_log_repo import audit_log_repo
from app.core.logger import logger


class AuditActionType(Enum):
    """操作类型枚举"""
    AI_SUGGEST_ACCEPT = "ai_suggest_accept"   # 采纳AI推荐
    AI_SUGGEST_REJECT = "ai_suggest_reject"   # 拒绝AI推荐
    CODE_ADD_MANUAL = "code_add_manual"       # 手动添加编码
    CODE_REMOVE = "code_remove"                # 删除编码
    CODE_REORDER = "code_reorder"              # 调整编码顺序
    STATUS_CHANGE = "status_change"            # 状态变更
    QA_APPROVE = "qa_approve"                  # 质控通过
    QA_REJECT = "qa_reject"                    # 质控打回
    VERSION_SWITCH = "version_switch"          # 字典版本切换


class AuditTrailService:
    """溯源日志服务"""

    # 日志保留天数
    RETENTION_DAYS = 90

    def log_action(
        self,
        case_id: str,
        user_id: int,
        action_type: str,
        action_details: Dict,
        reason: str = None,
        ip_address: str = None,
        user_agent: str = None
    ) -> str:
        """记录操作日志"""
        log_entry = {
            "case_id": case_id,
            "user_id": user_id,
            "action_type": action_type,
            "action_details": action_details,
            "reason": reason,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.now()
        }

        try:
            # 写入数据库
            saved_entry = audit_log_repo.save(log_entry)
            log_id = saved_entry.get('log_id', '')

            # 2. 写入RLHF训练队列（高价值操作）
            if action_type in ["ai_suggest_reject", "code_add_manual", "qa_reject"]:
                self._enqueue_rlhf_sample(saved_entry)

            return log_id
        except Exception as e:
            logger.error(f"记录操作日志失败: {e}")
            # 降级处理：返回临时log_id
            return f"log_{datetime.now().strftime('%Y%m%d%H%M%S')}_fallback"

    def get_case_audit_trail(self, case_id: str, limit: int = 100) -> List[Dict]:
        """获取单病历完整操作轨迹"""
        try:
            return audit_log_repo.get_case_audit_trail(case_id, limit)
        except Exception as e:
            logger.error(f"获取审计轨迹失败: {e}")
            return []

    def calculate_coder_performance(self, coder_id: int, days: int = 30) -> Dict:
        """计算编码员工作指标（RLHF模型个人化训练用）"""
        try:
            return audit_log_repo.get_coder_performance(coder_id, days)
        except Exception as e:
            logger.error(f"计算编码员绩效失败: {e}")
            return {
                "coder_id": coder_id,
                "period_days": days,
                "ai_adoption_rate": 0,
                "ai_suggestion_accepted": 0,
                "ai_suggestion_rejected": 0,
                "manual_code_added": 0,
                "rlhf_grade": "D"
            }

    def _enqueue_rlhf_sample(self, log_entry: Dict):
        """将高价值操作送入RLHF训练队列

        注意：实际实现应该发送到Kafka/Redis队列
        这里先打印到日志，后续可以接入实际队列系统
        """
        rlhf_sample = {
            "sample_id": log_entry.get('log_id'),
            "case_id": log_entry.get('case_id'),
            "action_type": log_entry.get('action_type'),
            "ai_suggestion": log_entry.get('action_details', {}).get('ai_suggestion'),
            "human_decision": log_entry.get('action_details', {}).get('human_decision'),
            "reason": log_entry.get('reason'),
            "timestamp": log_entry.get('timestamp')
        }
        logger.info(f"[RLHF Queue] Enqueued sample: {rlhf_sample['sample_id']}")
        # TODO: 实际发送到Kafka或Redis队列

    def _calculate_rlhf_grade(self, adoption_rate: float, manual_count: int) -> str:
        """计算编码员RLHF训练等级"""
        if 0.3 <= adoption_rate <= 0.8 and manual_count >= 5:
            return "A"
        elif adoption_rate > 0.9:
            return "B"
        elif adoption_rate < 0.2:
            return "C"
        return "D"

    def cleanup_old_logs(self, retention_days: int = None) -> Dict[str, int]:
        """清理过期日志并归档

        Args:
            retention_days: 保留天数，默认90天

        Returns:
            清理统计 {'archived': count, 'deleted': count}
        """
        try:
            return audit_log_repo.cleanup_old_logs(retention_days or self.RETENTION_DAYS)
        except Exception as e:
            logger.error(f"清理过期日志失败: {e}")
            return {'archived': 0, 'deleted': 0}

    def get_all_action_types(self) -> List[Dict]:
        """获取所有操作类型（用于前端下拉框）"""
        action_labels = {
            "ai_suggest_accept": "采纳AI推荐",
            "ai_suggest_reject": "拒绝AI推荐",
            "code_add_manual": "手动添加编码",
            "code_remove": "删除编码",
            "code_reorder": "调整编码顺序",
            "status_change": "状态变更",
            "qa_approve": "质控通过",
            "qa_reject": "质控打回",
            "version_switch": "字典版本切换"
        }
        return [
            {"value": k, "label": v}
            for k, v in action_labels.items()
        ]


# 全局实例
audit_trail_service = AuditTrailService()