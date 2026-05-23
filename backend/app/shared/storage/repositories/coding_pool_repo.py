"""
编码池持久化Repository
使用PostgreSQL存储编码池数据
"""
import json
from typing import Dict, List, Optional
from datetime import datetime
from app.shared.storage.repositories.base import BaseRepository
from app.core.database import get_db_cursor
from app.core.logger import logger


class CodingPoolRepository(BaseRepository[Dict]):
    """编码池数据访问层"""

    def __init__(self):
        self.table_name = "coding_pools"

    def _ensure_table_exists(self) -> bool:
        """确保表存在（首次使用前检查）"""
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'coding_pools'
                    )
                """)
                exists = cursor.fetchone()
                if not exists or not exists[0]:
                    self._create_table()
                return True
        except Exception as e:
            logger.error(f"检查编码池表失败: {e}")
            return False

    def _create_table(self) -> None:
        """创建编码池表"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS coding_pools (
                    id SERIAL PRIMARY KEY,
                    case_id VARCHAR(64) UNIQUE NOT NULL,
                    principal_dx JSONB,
                    secondary_dx JSONB,
                    procedures JSONB,
                    last_modified TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)

    def list_all(self) -> List[Dict]:
        """获取所有编码池"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, case_id, principal_dx, secondary_dx, procedures,
                       last_modified, created_at
                FROM coding_pools
                ORDER BY last_modified DESC
            """)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_by_id(self, entity_id: str) -> Optional[Dict]:
        """根据case_id获取编码池"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, case_id, principal_dx, secondary_dx, procedures,
                       last_modified, created_at
                FROM coding_pools
                WHERE case_id = %s
            """, (entity_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def save(self, entity: Dict) -> Dict:
        """保存编码池（插入或更新）"""
        self._ensure_table_exists()
        case_id = entity.get('case_id')
        if not case_id:
            raise ValueError("编码池必须有case_id")

        principal_dx = json.dumps(entity.get('principal_dx')) if entity.get('principal_dx') else None
        secondary_dx = json.dumps(entity.get('secondary_dx')) if entity.get('secondary_dx') else None
        procedures = json.dumps(entity.get('procedures')) if entity.get('procedures') else None
        last_modified = entity.get('last_modified') or datetime.now()

        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO coding_pools (case_id, principal_dx, secondary_dx, procedures, last_modified)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (case_id) DO UPDATE SET
                    principal_dx = EXCLUDED.principal_dx,
                    secondary_dx = EXCLUDED.secondary_dx,
                    procedures = EXCLUDED.procedures,
                    last_modified = EXCLUDED.last_modified
                RETURNING id, case_id, principal_dx, secondary_dx, procedures, last_modified, created_at
            """, (case_id, principal_dx, secondary_dx, procedures, last_modified))

            row = cursor.fetchone()
            return dict(row)

    def delete(self, entity_id: str) -> bool:
        """删除编码池"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("DELETE FROM coding_pools WHERE case_id = %s", (entity_id,))
            return cursor.rowcount > 0

    def exists(self, case_id: str) -> bool:
        """检查编码池是否存在"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("SELECT 1 FROM coding_pools WHERE case_id = %s", (case_id,))
            return cursor.fetchone() is not None


# 全局实例
coding_pool_repo = CodingPoolRepository()