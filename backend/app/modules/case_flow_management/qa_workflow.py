"""
质控审核工作流引擎
支持：提交质控、质控通过、质控打回、AI推荐 vs 编码员选择对比视图
使用PostgreSQL持久化存储
"""
from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime
import logging

from .case_status_machine import CaseStatusMachine
from app.shared.storage.repositories.qa_record_repo import qa_record_repo, coding_result_repo
from app.shared.storage.repositories.transition_history_repo import transition_history_repo
from app.core.logger import logger

logger = logging.getLogger(__name__)


class QaDecision(Enum):
    """质控决策枚举"""
    APPROVE = "approve"           # ✅ 质控通过
    REJECT = "reject"             # 🔄 打回重编
    FORCE_APPROVE = "force_approve"  # ⚠️ 强行通过


class QaWorkflowEngine:
    """质控审核工作流引擎"""

    def __init__(self):
        pass  # 不再使用内存存储

    def submit_for_qa(self, case_id: str, coder_id: int, coding_result: Dict = None) -> Dict:
        """提交质控"""
        # 1. 状态机转移
        from .worklist import worklist_manager
        case = worklist_manager.get_case(case_id)
        if not case:
            return {"success": False, "error": "病历不存在"}

        sm = CaseStatusMachine(case_id, case["status"], "coder", coder_id)
        result = sm.transition_to("pending_qa", "编码完成，提交质控")

        if not result["success"]:
            return result

        # 2. 保存编码结果（用于对比视图）
        if coding_result:
            coding_result['submitted_at'] = datetime.now().isoformat()
            try:
                coding_result_repo.save({
                    'case_id': case_id,
                    'ai_suggested': coding_result.get('ai_suggested'),
                    'coder_selected': coding_result.get('coder_selected'),
                    'coding_duration_minutes': coding_result.get('coding_duration_minutes'),
                    'submitted_at': coding_result.get('submitted_at')
                })
            except Exception as e:
                logger.error(f"保存编码结果失败: {e}")

        # 3. 记录质控提交记录
        try:
            qa_record_repo.save({
                'case_id': case_id,
                'action': 'submit',
                'coder_id': coder_id,
                'timestamp': datetime.now(),
                'comment': '编码完成提交质控'
            })
        except Exception as e:
            logger.error(f"保存质控记录失败: {e}")

        # 4. 保存状态转移历史
        try:
            transition_history_repo.save({
                'case_id': case_id,
                'from_status': 'coding_in_progress',
                'to_status': 'pending_qa',
                'user_role': 'coder',
                'user_id': coder_id,
                'reason': '编码完成提交质控',
                'timestamp': datetime.now()
            })
        except Exception as e:
            logger.error(f"保存状态转移历史失败: {e}")

        logger.info(f"病历 {case_id} 已提交质控，编码员: {coder_id}")
        return {
            "success": True,
            "new_status": "pending_qa",
            "message": "已提交质控，待质控人员审核"
        }

    def perform_qa(
        self,
        case_id: str,
        qa_officer_id: int,
        decision: str,  # approve/reject/force_approve
        qa_comment: str,
        force_reason: str = None,
        correction_suggestions: List[Dict] = None
    ) -> Dict:
        """执行质控操作"""
        # 1. 参数校验
        if decision == "force_approve" and not force_reason:
            return {"success": False, "error": "强行通过必须填写原因"}

        # 2. 检查病历状态
        from .worklist import worklist_manager
        case = worklist_manager.get_case(case_id)
        if not case:
            return {"success": False, "error": "病历不存在"}

        # 3. 状态转移
        sm = CaseStatusMachine(case_id, case["status"], "qa_officer", qa_officer_id)

        if decision in ["approve", "force_approve"]:
            target_status = "archived"
            reason = qa_comment if decision == "approve" else f"强行通过: {force_reason}"
        elif decision == "reject":
            target_status = "qa_rejected"
            reason = qa_comment
        else:
            return {"success": False, "error": "无效的质控决策类型"}

        result = sm.transition_to(target_status, reason)

        if not result["success"]:
            return result

        # 4. 记录质控操作记录
        try:
            qa_record_repo.save({
                'case_id': case_id,
                'action': decision,
                'qa_officer_id': qa_officer_id,
                'timestamp': datetime.now(),
                'comment': qa_comment,
                'force_reason': force_reason,
                'correction_suggestions': correction_suggestions or []
            })
        except Exception as e:
            logger.error(f"保存质控记录失败: {e}")

        # 5. 保存状态转移历史
        try:
            transition_history_repo.save({
                'case_id': case_id,
                'from_status': case['status'],
                'to_status': target_status,
                'user_role': 'qa_officer',
                'user_id': qa_officer_id,
                'reason': reason,
                'timestamp': datetime.now()
            })
        except Exception as e:
            logger.error(f"保存状态转移历史失败: {e}")

        logger.info(
            f"病历 {case_id} 质控{decision}, 质控员: {qa_officer_id}, "
            f"意见: {qa_comment[:50]}..."
        )

        return {
            "success": True,
            "new_status": target_status,
            "decision": decision,
            "message": f"质控{decision}操作已完成"
        }

    def get_qa_comparison_view(self, case_id: str) -> Dict:
        """获取质控对比视图"""
        # 从数据库获取编码结果
        coding_result = coding_result_repo.get_by_id(case_id)

        if not coding_result:
            # 如果没有编码结果，返回默认对比视图
            from .worklist import worklist_manager
            case = worklist_manager.get_case(case_id)
            if not case:
                return {"success": False, "error": "病历不存在"}

            return {
                "success": True,
                "case_id": case_id,
                "case_info": case,
                "comparison": {
                    "ai_suggested_count": 0,
                    "coder_selected_count": 0,
                    "ai_only": [],
                    "coder_only": [],
                    "intersection": []
                },
                "ai_suggested_codes": [],
                "coder_selected_codes": [],
                "qa_score": 0,
                "coding_duration_minutes": 0,
                "submitted_at": None,
                "has_result": False
            }

        # AI推荐编码
        ai_codes = coding_result.get('ai_suggested', []) or []
        ai_code_set = set(c.get('code') for c in ai_codes if c.get('code'))

        # 编码员选择的编码
        coder_codes = coding_result.get('coder_selected', []) or []
        coder_code_set = set(c.get('code') for c in coder_codes if c.get('code'))

        # 差异计算
        ai_only = list(ai_code_set - coder_code_set)   # AI推荐但编码员忽略
        coder_only = list(coder_code_set - ai_code_set)  # 编码员手动添加
        intersection = list(ai_code_set & coder_code_set) # 双方一致

        return {
            "success": True,
            "case_id": case_id,
            "case_info": coding_result,
            "comparison": {
                "ai_suggested_count": len(ai_codes),
                "coder_selected_count": len(coder_codes),
                "ai_only": ai_only,
                "coder_only": coder_only,
                "intersection": intersection,
                "ai_acceptance_rate": round(len(intersection) / len(ai_code_set), 2) if ai_codes else 0
            },
            "ai_suggested_codes": ai_codes,
            "coder_selected_codes": coder_codes,
            "qa_score": self._calculate_qa_score(ai_codes, coder_codes, ai_only, coder_only),
            "coding_duration_minutes": coding_result.get('coding_duration_minutes', 0),
            "submitted_at": coding_result.get('submitted_at'),
            "has_result": True
        }

    def get_qa_pending_list(self, qa_officer_id: int = None, limit: int = 50) -> List[Dict]:
        """获取待质控列表"""
        from .worklist import worklist_manager
        return worklist_manager.get_pending_qa_cases(qa_officer_id)

    def get_qa_record_history(self, case_id: str) -> List[Dict]:
        """获取病历的质控历史记录"""
        try:
            records = qa_record_repo.get_by_id(case_id)
            if records:
                return [records] if isinstance(records, dict) else records
            return []
        except Exception as e:
            logger.error(f"获取质控历史失败: {e}")
            return []

    def get_qa_statistics(self, qa_officer_id: int = None, days: int = 30) -> Dict:
        """获取质控统计数据"""
        try:
            return coding_result_repo.get_qa_statistics(qa_officer_id, days)
        except Exception as e:
            logger.error(f"获取质控统计失败: {e}")
            return {
                "period_days": days,
                "total_submitted": 0,
                "total_approved": 0,
                "total_rejected": 0,
                "total_force_approved": 0,
                "approval_rate": 0,
                "rejection_rate": 0
            }

    def _calculate_qa_score(
        self,
        ai_codes: List[Dict],
        coder_codes: List[Dict],
        ai_only: List[str],
        coder_only: List[str]
    ) -> int:
        """
        计算质控得分（满分100）

        评分规则（改进版）：
        - 初始分：100分
        - 忽略准确AI推荐：-10分/每条（AI推荐但编码员未采纳）
        - 手动添加编码（来自AI推荐已被intersection计算，不重复加分）
        - 纯手动添加：根据置信度和来源给予评分
        - 如果高置信度AI推荐被拒绝，额外扣分

        注意事项：
        - 不再假设手动添加都是正确的
        - 手动添加需要结合编码员历史表现和来源标记综合评分
        """
        score = 100

        # 1. 忽略准确AI推荐扣分（AI推荐但编码员未采纳）
        score -= len(ai_only) * 10

        # 2. 高置信度AI推荐被拒绝（90%以上）额外扣分
        for ai_code in ai_codes:
            if ai_code.get('confidence', 0) >= 0.9 and ai_code.get('code') in ai_only:
                score -= 5  # 高置信度被拒绝额外扣5分

        # 3. 手动添加编码评分（基于来源标记和来源）
        for code_dict in coder_codes:
            source = code_dict.get('source', '')

            if source == 'qa_validated':
                # QA验证通过的编码，加分
                score += 10
            elif source == 'ai_suggested':
                # 来自AI推荐的编码（已在intersection中），不重复加分
                pass
            elif source == 'drg_suggestion':
                # 来自DRG建议的编码，有一定依据，加分但低于QA验证
                score += 7
            elif source == 'manual_added':
                # 纯手动添加，需要谨慎评分
                confidence = code_dict.get('confidence', 0)
                if confidence >= 0.9:
                    score += 8  # 高置信度手动添加
                elif confidence >= 0.7:
                    score += 5  # 中置信度手动添加
                else:
                    score += 2  # 低置信度手动添加

        return max(0, min(100, score))

    def save_coding_result(self, case_id: str, coding_result: Dict) -> Dict:
        """保存编码结果（用于对比视图）"""
        try:
            coding_result['case_id'] = case_id
            coding_result['submitted_at'] = datetime.now().isoformat()
            coding_result_repo.save(coding_result)
            return {"success": True}
        except Exception as e:
            logger.error(f"保存编码结果失败: {e}")
            return {"success": False, "error": str(e)}


# 全局质控工作流引擎实例
qa_engine = QaWorkflowEngine()