"""
工作队列管理器
负责管理待编码、编码中、待质控等状态的病历队列
使用PostgreSQL持久化存储
"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import logging
from dataclasses import dataclass, asdict

from app.shared.storage.repositories.worklist_repo import worklist_repo
from app.core.logger import logger


class WorklistPriority(Enum):
    """优先级枚举"""
    EMERGENCY = "emergency"   # 🔥 急诊，4小时内
    HIGH = "high"            # 🔴 高优，24小时内
    MEDIUM = "medium"        # 🟡 中优，48小时内
    LOW = "low"              # 🟢 低优，72小时内


@dataclass
class CaseItem:
    """病历项数据结构"""
    case_id: str
    patient_name: str
    patient_id: str
    department: str
    discharge_date: datetime
    admission_diagnosis: str = ""
    priority: str = WorklistPriority.MEDIUM.value
    status: str = "pending_coding"
    assigned_coder_id: Optional[int] = None
    assigned_coder_name: Optional[str] = None
    coding_start_time: Optional[datetime] = None
    coding_duration_seconds: int = 0
    created_at: Optional[datetime] = None

    @property
    def sla_hours(self) -> int:
        """SLA时效（小时）"""
        SLA_HOURS = {
            "emergency": 4,
            "high": 24,
            "medium": 48,
            "low": 72
        }
        return SLA_HOURS.get(self.priority, 72)

    @property
    def sla_deadline(self) -> datetime:
        """SLA截止时间"""
        return self.discharge_date + timedelta(hours=self.sla_hours)

    @property
    def sla_remaining_seconds(self) -> int:
        """SLA剩余秒数"""
        remaining = (self.sla_deadline - datetime.now()).total_seconds()
        return max(0, int(remaining))

    @property
    def is_overdue(self) -> bool:
        """是否超期"""
        return self.sla_remaining_seconds <= 0

    def to_dict(self) -> Dict:
        return {
            "case_id": self.case_id,
            "patient_name": self.patient_name,
            "patient_id": self.patient_id,
            "department": self.department,
            "discharge_date": self.discharge_date.isoformat() if isinstance(self.discharge_date, datetime) else self.discharge_date,
            "admission_diagnosis": self.admission_diagnosis,
            "priority": self.priority,
            "status": self.status,
            "assigned_coder_id": self.assigned_coder_id,
            "assigned_coder_name": self.assigned_coder_name,
            "coding_start_time": self.coding_start_time.isoformat() if isinstance(self.coding_start_time, datetime) else self.coding_start_time,
            "coding_duration_seconds": self.coding_duration_seconds,
            "sla_remaining_seconds": self.sla_remaining_seconds,
            "is_overdue": self.is_overdue,
            "priority_label": self.priority.upper() if self.priority else "MEDIUM"
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'CaseItem':
        """从字典创建CaseItem"""
        discharge_date = data.get('discharge_date')
        if isinstance(discharge_date, str):
            discharge_date = datetime.fromisoformat(discharge_date.replace('Z', '+00:00'))
        elif discharge_date is None:
            discharge_date = datetime.now()

        coding_start_time = data.get('coding_start_time')
        if isinstance(coding_start_time, str):
            coding_start_time = datetime.fromisoformat(coding_start_time.replace('Z', '+00:00'))

        return cls(
            case_id=data.get('case_id', ''),
            patient_name=data.get('patient_name', ''),
            patient_id=data.get('patient_id', ''),
            department=data.get('department', ''),
            discharge_date=discharge_date,
            admission_diagnosis=data.get('admission_diagnosis', ''),
            priority=data.get('priority', 'medium'),
            status=data.get('status', 'pending_coding'),
            assigned_coder_id=data.get('assigned_coder_id'),
            assigned_coder_name=data.get('assigned_coder_name'),
            coding_start_time=coding_start_time,
            coding_duration_seconds=data.get('coding_duration_seconds', 0),
            created_at=data.get('created_at')
        )


class WorklistManager:
    """工作队列管理器"""

    def __init__(self):
        # 使用数据库持久化，不再使用内存存储
        pass

    def get_worklist(
        self,
        user_id: int,
        user_role: str,
        status_filter: str = "all",
        priority_filter: str = "all",
        department_filter: str = "all",
        assigned_only: bool = False,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "priority"
    ) -> Dict:
        """获取工作队列"""
        try:
            # 获取所有工作队列数据
            all_cases = worklist_repo.list_all()

            # 转换为CaseItem
            case_items = []
            for case_data in all_cases:
                try:
                    case_item = CaseItem.from_dict(case_data)
                    case_items.append(case_item)
                except Exception as e:
                    logger.warning(f"转换病例数据失败: {e}")
                    continue

            # 状态筛选
            if status_filter != "all":
                case_items = [c for c in case_items if c.status == status_filter]

            # 优先级筛选
            if priority_filter != "all":
                case_items = [c for c in case_items if c.priority == priority_filter]

            # 科室筛选
            if department_filter != "all":
                case_items = [c for c in case_items if c.department == department_filter]

            # 只看分配给我的
            if assigned_only:
                case_items = [c for c in case_items if c.assigned_coder_id == user_id]

            # 排序：优先级优先 → 出院时间 → 状态
            priority_order = {"emergency": 0, "high": 1, "medium": 2, "low": 3}
            case_items.sort(key=lambda x: (
                priority_order.get(x.priority, 99),
                x.discharge_date,
                x.status
            ))

            # 分页
            total = len(case_items)
            start = (page - 1) * page_size
            end = start + page_size
            paged_items = case_items[start:end]

            return {
                "items": [item.to_dict() for item in paged_items],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": (total + page_size - 1) // page_size
                },
                "summary": self._get_summary_stats(case_items, user_id, user_role)
            }
        except Exception as e:
            logger.error(f"获取工作队列失败: {e}")
            return {
                "items": [],
                "pagination": {"page": page, "page_size": page_size, "total": 0, "total_pages": 0},
                "summary": self._get_summary_stats([], user_id, user_role)
            }

    def assign_case(self, case_id: str, coder_id: int, assignee_id: int, coder_name: str = None) -> Dict:
        """分配病历给编码员"""
        case_data = worklist_repo.get_by_id(case_id)
        if not case_data:
            return {"success": False, "error": "病历不存在"}

        case_data['assigned_coder_id'] = coder_id
        case_data['assigned_coder_name'] = coder_name or f"编码员{coder_id}"
        case_data['status'] = 'pending_coding'

        try:
            worklist_repo.save(case_data)
            logger.info(f"病历 {case_id} 已分配给编码员 {coder_id}")
            return {"success": True}
        except Exception as e:
            logger.error(f"分配病历失败: {e}")
            return {"success": False, "error": str(e)}

    def claim_case(self, case_id: str, coder_id: int, coder_name: str = None, force: bool = False) -> Dict:
        """编码员抢单/认领病历

        Args:
            case_id: 病历ID
            coder_id: 编码员ID
            coder_name: 编码员名称
            force: 是否强制分配（仅管理员可用）
        """
        case_data = worklist_repo.get_by_id(case_id)
        if not case_data:
            return {"success": False, "error": "病历不存在"}

        current_assigned = case_data.get('assigned_coder_id')
        current_status = case_data.get('status', '')

        # 业务规则：
        # 1. 如果病例已有编码员且不是当前编码员
        # 2. 非管理员不能强制覆盖，只能领取空病例
        if current_assigned and current_assigned != coder_id and not force:
            # 如果状态是 coding_in_progress 且是其他编码员的，不允许领取
            if current_status == 'coding_in_progress':
                return {"success": False, "error": "该病历正在被其他编码员编码中，无法领取"}

            # 如果状态是 pending_coding（已分配但未开始），也禁止抢单
            if current_status == 'pending_coding':
                return {"success": False, "error": "该病历已分配给其他编码员，无法抢单"}

        case_data['assigned_coder_id'] = coder_id
        case_data['assigned_coder_name'] = coder_name or f"编码员{coder_id}"
        case_data['status'] = 'coding_in_progress'
        case_data['coding_start_time'] = datetime.now()

        try:
            worklist_repo.save(case_data)
            logger.info(f"编码员 {coder_id} 认领了病历 {case_id}")
            return {"success": True, "case": case_data}
        except Exception as e:
            logger.error(f"认领病历失败: {e}")
            return {"success": False, "error": str(e)}

    def release_case(self, case_id: str, coder_id: int) -> Dict:
        """编码员释放病历"""
        case_data = worklist_repo.get_by_id(case_id)
        if not case_data:
            return {"success": False, "error": "病历不存在"}

        # 检查是否是该编码员领取的
        if case_data.get('assigned_coder_id') != coder_id:
            return {"success": False, "error": "您没有领取此病历"}

        case_data['assigned_coder_id'] = None
        case_data['assigned_coder_name'] = None
        case_data['status'] = 'pending_coding'
        case_data['coding_start_time'] = None

        try:
            worklist_repo.save(case_data)
            logger.info(f"编码员 {coder_id} 释放了病历 {case_id}")
            return {"success": True}
        except Exception as e:
            logger.error(f"释放病历失败: {e}")
            return {"success": False, "error": str(e)}

    def start_coding(self, case_id: str, coder_id: int) -> Dict:
        """开始编码"""
        from .case_status_machine import CaseStatusMachine

        case_data = worklist_repo.get_by_id(case_id)
        if not case_data:
            return {"success": False, "error": "病历不存在"}

        current_status = case_data.get('status', 'pending_coding')
        sm = CaseStatusMachine(case_id, current_status, "coder", coder_id)
        result = sm.transition_to("coding_in_progress")

        if result["success"]:
            case_data['status'] = 'coding_in_progress'
            case_data['coding_start_time'] = datetime.now()
            case_data['assigned_coder_id'] = coder_id
            try:
                worklist_repo.save(case_data)
            except Exception as e:
                logger.error(f"更新病历状态失败: {e}")

        return result

    def get_case(self, case_id: str) -> Optional[Dict]:
        """获取单条病历信息"""
        case_data = worklist_repo.get_by_id(case_id)
        if not case_data:
            return None
        return case_data

    def _get_summary_stats(self, cases: List[CaseItem], user_id: int, user_role: str) -> Dict:
        """获取队列统计摘要"""
        my_assigned = [c for c in cases if c.assigned_coder_id == user_id]

        return {
            "total_count": len(cases),
            "pending_coding": len([c for c in cases if c.status == "pending_coding"]),
            "coding_in_progress": len([c for c in cases if c.status == "coding_in_progress"]),
            "pending_qa": len([c for c in cases if c.status == "pending_qa"]),
            "qa_rejected": len([c for c in cases if c.status == "qa_rejected"]),
            "archived": len([c for c in cases if c.status == "archived"]),
            "overdue_count": len([c for c in cases if c.is_overdue and c.status != "archived"]),
            "my_assigned_count": len(my_assigned),
            "priority_breakdown": {
                "emergency": len([c for c in cases if c.priority == "emergency" and c.status != "archived"]),
                "high": len([c for c in cases if c.priority == "high" and c.status != "archived"]),
                "medium": len([c for c in cases if c.priority == "medium" and c.status != "archived"]),
                "low": len([c for c in cases if c.priority == "low" and c.status != "archived"]),
            }
        }

    def get_department_list(self) -> List[str]:
        """获取科室列表（用于筛选）"""
        try:
            all_cases = worklist_repo.list_all()
            departments = set(c.get('department', '') for c in all_cases if c.get('department'))
            return sorted(list(departments))
        except Exception as e:
            logger.error(f"获取科室列表失败: {e}")
            return []

    def create_case(self, case_data: Dict) -> Dict:
        """创建新病历（EMR同步时调用）"""
        case_id = case_data.get("case_id")
        if not case_id:
            return {"success": False, "error": "病历ID不能为空"}

        existing = worklist_repo.get_by_id(case_id)
        if existing:
            return {"success": False, "error": "病历ID已存在"}

        try:
            worklist_repo.save(case_data)
            logger.info(f"创建新病历: {case_id}")
            return {"success": True, "case": case_data}
        except Exception as e:
            logger.error(f"创建病历失败: {e}")
            return {"success": False, "error": str(e)}

    def get_pending_qa_cases(self, user_id: int = None) -> List[Dict]:
        """获取待质控的病历列表"""
        try:
            cases = worklist_repo.find_by_status("pending_qa")
            return cases
        except Exception as e:
            logger.error(f"获取待质控列表失败: {e}")
            return []

    def get_qa_history(self, case_id: str) -> List[Dict]:
        """获取病历的质控历史记录"""
        return []

    def get_qa_statistics(self) -> Dict:
        """获取质控统计数据"""
        try:
            return worklist_repo.get_statistics()
        except Exception as e:
            logger.error(f"获取质控统计失败: {e}")
            return {
                "total_qa_pending": 0,
                "total_qa_completed": 0,
                "total_qa_rejected": 0,
                "avg_coding_time_seconds": 0
            }


# 全局单例
worklist_manager = WorklistManager()