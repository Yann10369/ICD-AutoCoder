"""
工作队列表Repository
使用PostgreSQL存储病历工作队列数据
"""
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from app.shared.storage.repositories.base import BaseRepository
from app.core.database import get_db_cursor
from app.core.logger import logger


class WorklistRepository(BaseRepository[Dict]):
    """工作队列表数据访问层"""

    def __init__(self):
        self.table_name = "worklist_cases"

    def _ensure_table_exists(self) -> bool:
        """确保表存在"""
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'worklist_cases'
                    )
                """)
                exists = cursor.fetchone()
                if not exists or not exists[0]:
                    self._create_table()
                return True
        except Exception as e:
            logger.error(f"检查工作队列表失败: {e}")
            return False

    def _create_table(self) -> None:
        """创建工作队列表"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS worklist_cases (
                    id SERIAL PRIMARY KEY,
                    case_id VARCHAR(64) UNIQUE NOT NULL,
                    patient_name VARCHAR(100),
                    patient_id VARCHAR(64),
                    department VARCHAR(100),
                    discharge_date TIMESTAMP,
                    admission_diagnosis TEXT,
                    priority VARCHAR(20) DEFAULT 'medium',
                    status VARCHAR(30) DEFAULT 'pending_coding',
                    assigned_coder_id INT,
                    assigned_coder_name VARCHAR(100),
                    coding_start_time TIMESTAMP,
                    coding_duration_seconds INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            # 创建索引
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_worklist_status ON worklist_cases(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_worklist_priority ON worklist_cases(priority)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_worklist_assigned_coder ON worklist_cases(assigned_coder_id)")

    def list_all(self) -> List[Dict]:
        """获取所有工作队列项目"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, case_id, patient_name, patient_id, department,
                       discharge_date, admission_diagnosis, priority, status,
                       assigned_coder_id, assigned_coder_name, coding_start_time,
                       coding_duration_seconds, created_at
                FROM worklist_cases
                ORDER BY
                    CASE priority
                        WHEN 'emergency' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                        ELSE 5
                    END,
                    discharge_date ASC
            """)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_by_id(self, entity_id: str) -> Optional[Dict]:
        """根据case_id获取工作队列项目"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, case_id, patient_name, patient_id, department,
                       discharge_date, admission_diagnosis, priority, status,
                       assigned_coder_id, assigned_coder_name, coding_start_time,
                       coding_duration_seconds, created_at
                FROM worklist_cases
                WHERE case_id = %s
            """, (entity_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def save(self, entity: Dict) -> Dict:
        """保存工作队列项目（插入或更新）"""
        self._ensure_table_exists()
        case_id = entity.get('case_id')
        if not case_id:
            raise ValueError("工作队列项目必须有case_id")

        # 解析discharge_date
        discharge_date = entity.get('discharge_date')
        if isinstance(discharge_date, str):
            discharge_date = datetime.fromisoformat(discharge_date.replace('Z', '+00:00'))
        elif discharge_date is None:
            discharge_date = datetime.now()

        coding_start_time = entity.get('coding_start_time')
        if isinstance(coding_start_time, str):
            coding_start_time = datetime.fromisoformat(coding_start_time.replace('Z', '+00:00'))

        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO worklist_cases (
                    case_id, patient_name, patient_id, department,
                    discharge_date, admission_diagnosis, priority, status,
                    assigned_coder_id, assigned_coder_name, coding_start_time, coding_duration_seconds
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (case_id) DO UPDATE SET
                    patient_name = EXCLUDED.patient_name,
                    patient_id = EXCLUDED.patient_id,
                    department = EXCLUDED.department,
                    discharge_date = EXCLUDED.discharge_date,
                    admission_diagnosis = EXCLUDED.admission_diagnosis,
                    priority = EXCLUDED.priority,
                    status = EXCLUDED.status,
                    assigned_coder_id = EXCLUDED.assigned_coder_id,
                    assigned_coder_name = EXCLUDED.assigned_coder_name,
                    coding_start_time = EXCLUDED.coding_start_time,
                    coding_duration_seconds = EXCLUDED.coding_duration_seconds
                RETURNING *
            """, (
                case_id,
                entity.get('patient_name'),
                entity.get('patient_id'),
                entity.get('department'),
                discharge_date,
                entity.get('admission_diagnosis', ''),
                entity.get('priority', 'medium'),
                entity.get('status', 'pending_coding'),
                entity.get('assigned_coder_id'),
                entity.get('assigned_coder_name'),
                coding_start_time,
                entity.get('coding_duration_seconds', 0)
            ))
            row = cursor.fetchone()
            return dict(row)

    def delete(self, entity_id: str) -> bool:
        """删除工作队列项目"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("DELETE FROM worklist_cases WHERE case_id = %s", (entity_id,))
            return cursor.rowcount > 0

    def find_by_status(self, status: str, limit: int = 50) -> List[Dict]:
        """根据状态查询工作队列"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM worklist_cases
                WHERE status = %s
                ORDER BY
                    CASE priority
                        WHEN 'emergency' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                        ELSE 5
                    END,
                    discharge_date ASC
                LIMIT %s
            """, (status, limit))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def find_by_assigned_coder(self, coder_id: int) -> List[Dict]:
        """根据编码员ID查询分配的病例"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM worklist_cases
                WHERE assigned_coder_id = %s
                ORDER BY
                    CASE status
                        WHEN 'coding_in_progress' THEN 1
                        WHEN 'pending_qa' THEN 2
                        WHEN 'qa_rejected' THEN 3
                        ELSE 4
                    END,
                    discharge_date ASC
            """, (coder_id,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def update_status(self, case_id: str, new_status: str) -> bool:
        """更新病例状态"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                UPDATE worklist_cases
                SET status = %s
                WHERE case_id = %s
            """, (new_status, case_id))
            return cursor.rowcount > 0

    def get_statistics(self) -> Dict[str, Any]:
        """获取工作队列统计"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    status,
                    COUNT(*) as count,
                    COUNT(CASE WHEN priority = 'emergency' THEN 1 END) as emergency_count
                FROM worklist_cases
                GROUP BY status
            """)
            rows = cursor.fetchall()
            stats = {row['status']: row for row in rows}

            cursor.execute("SELECT COUNT(*) as total FROM worklist_cases")
            total = cursor.fetchone()

            return {
                'total': total[0] if total else 0,
                'by_status': stats,
                'pending_coding': stats.get('pending_coding', {}).get('count', 0),
                'coding_in_progress': stats.get('coding_in_progress', {}).get('count', 0),
                'pending_qa': stats.get('pending_qa', {}).get('count', 0),
                'archived': stats.get('archived', {}).get('count', 0),
                'qa_rejected': stats.get('qa_rejected', {}).get('count', 0)
            }


# 全局实例
worklist_repo = WorklistRepository()