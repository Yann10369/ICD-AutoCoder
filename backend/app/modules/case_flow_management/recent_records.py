"""
最近处理记录服务
从数据库获取病例的处理历史记录
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from app.core.database import execute_query, execute_one

logger = logging.getLogger(__name__)


class RecentRecordsService:
    """最近处理记录服务"""

    def __init__(self):
        pass

    def get_recent_cases(self, limit: int = 10, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        获取最近处理的病例记录

        Args:
            limit: 返回记录数量限制
            user_id: 可选，筛选特定用户的记录

        Returns:
            最近处理的病例列表
        """
        try:
            # 查询最近有更新的病例（按更新时间排序）
            query = """
                SELECT
                    c.case_id,
                    c.patient_name,
                    c.age,
                    c.gender,
                    c.department,
                    c.status,
                    c.code_count,
                    c.updated_at,
                    u.display_name as coder_name,
                    c.current_coder_id
                FROM cases c
                LEFT JOIN users u ON c.current_coder_id = u.id
                WHERE c.status NOT IN ('archived')
            """

            params = []
            if user_id:
                query += " AND c.current_coder_id = %s"
                params.append(user_id)

            query += """
                ORDER BY c.updated_at DESC
                LIMIT %s
            """
            params.append(limit)

            results = execute_query(query, tuple(params) if params else None)

            # 格式化返回数据
            recent_cases = []
            for row in results:
                item = {
                    "id": row["case_id"],
                    "case_id": row["case_id"],
                    "name": row["patient_name"],
                    "age": row["age"],
                    "gender": row["gender"],
                    "department": row["department"],
                    "status": self._map_status(row["status"]),
                    "code_count": row["code_count"] or 0,
                    "coder_name": row["coder_name"],
                    "time": self._format_time(row["updated_at"]),
                    "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                }
                recent_cases.append(item)

            return recent_cases

        except Exception as e:
            logger.error(f"获取最近处理记录失败: {e}")
            return []

    def get_recent_by_user(self, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """获取特定用户的最近处理记录"""
        return self.get_recent_cases(limit=limit, user_id=user_id)

    def add_audit_record(
        self,
        case_id: str,
        action: str,
        operator_id: int,
        operator_name: str,
        details: Optional[Dict[str, Any]] = None,
        previous_status: Optional[str] = None,
        new_status: Optional[str] = None
    ) -> bool:
        """
        添加操作审计记录

        Args:
            case_id: 病例ID
            action: 操作类型 (created/coding/submitted/qa_approved/qa_rejected/archived)
            operator_id: 操作人ID
            operator_name: 操作人姓名
            details: 操作详情
            previous_status: 操作前状态
            new_status: 操作后状态
        """
        try:
            query = """
                INSERT INTO case_audit_log
                (case_id, action, operator_id, operator_name, details, previous_status, new_status, operated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING id
            """
            result = execute_one(
                query,
                (case_id, action, operator_id, operator_name, details, previous_status, new_status)
            )
            return result is not None
        except Exception as e:
            logger.error(f"添加审计记录失败: {e}")
            return False

    def get_case_history(self, case_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """获取特定病例的操作历史"""
        try:
            query = """
                SELECT
                    cal.id,
                    cal.action,
                    cal.operator_name,
                    cal.details,
                    cal.previous_status,
                    cal.new_status,
                    cal.operated_at,
                    u.display_name as operator_display_name
                FROM case_audit_log cal
                LEFT JOIN users u ON cal.operator_id = u.id
                WHERE cal.case_id = %s
                ORDER BY cal.operated_at DESC
                LIMIT %s
            """
            results = execute_query(query, (case_id, limit))

            history = []
            for row in results:
                history.append({
                    "id": row["id"],
                    "action": row["action"],
                    "action_display": self._get_action_display(row["action"]),
                    "operator_name": row["operator_name"],
                    "operator_display_name": row["operator_display_name"],
                    "details": row["details"],
                    "previous_status": row["previous_status"],
                    "new_status": row["new_status"],
                    "operated_at": row["operated_at"].isoformat() if row["operated_at"] else None,
                    "time_ago": self._format_time(row["operated_at"]) if row["operated_at"] else "",
                })
            return history

        except Exception as e:
            logger.error(f"获取病例历史失败: {e}")
            return []

    def _map_status(self, status: str) -> str:
        """映射状态码到前端期望的状态"""
        status_map = {
            "pending_coding": "pending",
            "coding": "coding",
            "pending_qa": "reviewing",
            "qa_rejected": "qa_rejected",
            "completed": "completed",
            "archived": "archived",
        }
        return status_map.get(status, status)

    def _format_time(self, dt: datetime) -> str:
        """格式化时间戳为友好的显示字符串"""
        if dt is None:
            return ""

        now = datetime.now()
        diff = now - dt

        if diff.total_seconds() < 60:
            return "刚刚"
        elif diff.total_seconds() < 3600:
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes}分钟前"
        elif diff.total_seconds() < 86400:
            hours = int(diff.total_seconds() / 3600)
            return f"{hours}小时前"
        elif diff.days == 1:
            return "昨天"
        elif diff.days < 7:
            return f"{diff.days}天前"
        else:
            return dt.strftime("%m-%d")

    def _get_action_display(self, action: str) -> str:
        """获取操作的中文显示"""
        action_map = {
            "created": "创建病例",
            "coding": "开始编码",
            "submitted": "提交质控",
            "qa_approved": "质控通过",
            "qa_rejected": "质控打回",
            "archived": "归档",
        }
        return action_map.get(action, action)


# 全局实例
recent_records_service = RecentRecordsService()