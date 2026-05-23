"""
状态转移历史Repository
使用PostgreSQL存储病历状态转移记录
"""
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from app.shared.storage.repositories.base import BaseRepository
from app.core.database import get_db_cursor
from app.core.logger import logger


class TransitionHistoryRepository(BaseRepository[Dict]):
    """状态转移历史数据访问层"""

    def __init__(self):
        self.table_name = "transition_history"

    def _ensure_table_exists(self) -> bool:
        """确保表存在"""
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'transition_history'
                    )
                """)
                exists = cursor.fetchone()
                if not exists or not exists[0]:
                    self._create_table()
                return True
        except Exception as e:
            logger.error(f"检查transition_history表失败: {e}")
            return False

    def _create_table(self) -> None:
        """创建状态转移历史表"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS transition_history (
                    id SERIAL PRIMARY KEY,
                    case_id VARCHAR(64) NOT NULL,
                    from_status VARCHAR(30),
                    to_status VARCHAR(30),
                    user_role VARCHAR(20),
                    user_id INT,
                    reason TEXT,
                    extra JSONB,
                    timestamp TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_transition_history_case_id ON transition_history(case_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_transition_history_timestamp ON transition_history(timestamp)")

    def list_all(self) -> List[Dict]:
        """获取所有转移历史"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM transition_history
                ORDER BY timestamp DESC
                LIMIT 1000
            """)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_by_id(self, entity_id: str) -> Optional[Dict]:
        """根据case_id获取转移历史"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM transition_history WHERE case_id = %s", (entity_id,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows] if rows else None

    def save(self, entity: Dict) -> Dict:
        """保存转移历史记录"""
        self._ensure_table_exists()
        case_id = entity.get('case_id')
        if not case_id:
            raise ValueError("转移历史必须有case_id")

        timestamp = entity.get('timestamp')
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))

        extra = json.dumps(entity.get('extra')) if entity.get('extra') else None

        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO transition_history (case_id, from_status, to_status, user_role, user_id, reason, extra, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                case_id,
                entity.get('from_status'),
                entity.get('to_status'),
                entity.get('user_role'),
                entity.get('user_id'),
                entity.get('reason'),
                extra,
                timestamp or datetime.now()
            ))
            row = cursor.fetchone()
            return dict(row)

    def delete(self, entity_id: str) -> bool:
        """删除转移历史（一般不删除）"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("DELETE FROM transition_history WHERE case_id = %s", (entity_id,))
            return cursor.rowcount > 0

    def get_case_history(self, case_id: str) -> List[Dict]:
        """获取单病历的完整转移历史"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM transition_history
                WHERE case_id = %s
                ORDER BY timestamp ASC
            """, (case_id,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_recent_transitions(self, limit: int = 100) -> List[Dict]:
        """获取最近的转移记录"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM transition_history
                ORDER BY timestamp DESC
                LIMIT %s
            """, (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]


# 全局实例
transition_history_repo = TransitionHistoryRepository()