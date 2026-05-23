"""
质控记录Repository
使用PostgreSQL存储质控记录和编码结果对比数据
"""
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from app.shared.storage.repositories.base import BaseRepository
from app.core.database import get_db_cursor
from app.core.logger import logger


class QaRecordRepository(BaseRepository[Dict]):
    """质控记录数据访问层"""

    def __init__(self):
        self.table_name = "qa_records"

    def _ensure_table_exists(self) -> bool:
        """确保表存在"""
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'qa_records'
                    )
                """)
                exists = cursor.fetchone()
                if not exists or not exists[0]:
                    self._create_table()
                return True
        except Exception as e:
            logger.error(f"检查qa_records表失败: {e}")
            return False

    def _create_table(self) -> None:
        """创建质控记录表"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS qa_records (
                    id SERIAL PRIMARY KEY,
                    case_id VARCHAR(64) NOT NULL,
                    action VARCHAR(30),
                    qa_officer_id INT,
                    coder_id INT,
                    timestamp TIMESTAMP,
                    comment TEXT,
                    force_reason TEXT,
                    correction_suggestions JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_qa_records_case_id ON qa_records(case_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_qa_records_timestamp ON qa_records(timestamp)")


class CodingResultRepository(BaseRepository[Dict]):
    """编码结果对比数据访问层"""

    def __init__(self):
        self.table_name = "coding_results"

    def _ensure_table_exists(self) -> bool:
        """确保表存在"""
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'coding_results'
                    )
                """)
                exists = cursor.fetchone()
                if not exists or not exists[0]:
                    self._create_table()
                return True
        except Exception as e:
            logger.error(f"检查coding_results表失败: {e}")
            return False

    def _create_table(self) -> None:
        """创建编码结果表"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS coding_results (
                    id SERIAL PRIMARY KEY,
                    case_id VARCHAR(64) UNIQUE NOT NULL,
                    ai_suggested JSONB,
                    coder_selected JSONB,
                    coding_duration_minutes INT,
                    submitted_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_coding_results_case_id ON coding_results(case_id)")

    def list_all(self) -> List[Dict]:
        """获取所有编码结果"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM coding_results ORDER BY submitted_at DESC")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_by_id(self, entity_id: str) -> Optional[Dict]:
        """根据case_id获取编码结果"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM coding_results WHERE case_id = %s", (entity_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def save(self, entity: Dict) -> Dict:
        """保存编码结果"""
        self._ensure_table_exists()
        case_id = entity.get('case_id')
        if not case_id:
            raise ValueError("编码结果必须有case_id")

        ai_suggested = json.dumps(entity.get('ai_suggested')) if entity.get('ai_suggested') else None
        coder_selected = json.dumps(entity.get('coder_selected')) if entity.get('coder_selected') else None
        submitted_at = entity.get('submitted_at')
        if isinstance(submitted_at, str):
            submitted_at = datetime.fromisoformat(submitted_at.replace('Z', '+00:00'))

        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO coding_results (case_id, ai_suggested, coder_selected, coding_duration_minutes, submitted_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (case_id) DO UPDATE SET
                    ai_suggested = EXCLUDED.ai_suggested,
                    coder_selected = EXCLUDED.coder_selected,
                    coding_duration_minutes = EXCLUDED.coding_duration_minutes,
                    submitted_at = EXCLUDED.submitted_at
                RETURNING *
            """, (case_id, ai_suggested, coder_selected, entity.get('coding_duration_minutes'), submitted_at))
            row = cursor.fetchone()
            return dict(row)

    def delete(self, entity_id: str) -> bool:
        """删除编码结果"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("DELETE FROM coding_results WHERE case_id = %s", (entity_id,))
            return cursor.rowcount > 0

    def get_comparison_view(self, case_id: str) -> Optional[Dict[str, Any]]:
        """获取AI推荐 vs 编码员选择的对比视图"""
        result = self.get_by_id(case_id)
        if not result:
            return None

        ai_codes = result.get('ai_suggested', []) or []
        coder_codes = result.get('coder_selected', []) or []

        ai_code_set = set(c.get('code') for c in ai_codes if c.get('code'))
        coder_code_set = set(c.get('code') for c in coder_codes if c.get('code'))

        return {
            'case_id': case_id,
            'ai_suggested': ai_codes,
            'coder_selected': coder_codes,
            'ai_only': list(ai_code_set - coder_code_set),
            'coder_only': list(coder_code_set - ai_code_set),
            'intersection': list(ai_code_set & coder_code_set),
            'ai_acceptance_rate': round(len(ai_code_set & coder_code_set) / len(ai_code_set), 2) if ai_codes else 0
        }

    def get_qa_statistics(self, qa_officer_id: int = None, days: int = 30) -> Dict[str, Any]:
        """获取质控统计数据"""
        self._ensure_table_exists()
        cutoff_time = datetime.now() - timedelta(days=days)

        with get_db_cursor() as cursor:
            if qa_officer_id:
                cursor.execute("""
                    SELECT action, COUNT(*) as count
                    FROM qa_records
                    WHERE qa_officer_id = %s AND timestamp >= %s
                    GROUP BY action
                """, (qa_officer_id, cutoff_time))
            else:
                cursor.execute("""
                    SELECT action, COUNT(*) as count
                    FROM qa_records
                    WHERE timestamp >= %s
                    GROUP BY action
                """, (cutoff_time,))
            rows = cursor.fetchall()
            stats = {row['action']: row['count'] for row in rows}

            total = sum(stats.values())
            approved = stats.get('approve', 0) + stats.get('force_approve', 0)
            rejected = stats.get('reject', 0)

            return {
                'period_days': days,
                'total_submitted': stats.get('submit', 0),
                'total_approved': approved,
                'total_rejected': rejected,
                'total_force_approved': stats.get('force_approve', 0),
                'approval_rate': round(approved / total, 2) if total > 0 else 0,
                'rejection_rate': round(rejected / total, 2) if total > 0 else 0
            }


# 全局实例
qa_record_repo = QaRecordRepository()
coding_result_repo = CodingResultRepository()