"""
审计日志Repository
使用PostgreSQL存储审计日志，支持日志归档和清理
"""
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from app.shared.storage.repositories.base import BaseRepository
from app.core.database import get_db_cursor
from app.core.logger import logger


class AuditLogRepository(BaseRepository[Dict]):
    """审计日志数据访问层"""

    # 日志保留天数配置
    RETENTION_DAYS = 90

    def __init__(self):
        self.table_name = "audit_logs"

    def _ensure_table_exists(self) -> bool:
        """确保表存在"""
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'audit_logs'
                    )
                """)
                exists = cursor.fetchone()
                if not exists or not exists[0]:
                    self._create_table()
                return True
        except Exception as e:
            logger.error(f"检查audit_logs表失败: {e}")
            return False

    def _create_table(self) -> None:
        """创建审计日志表"""
        with get_db_cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id SERIAL PRIMARY KEY,
                    log_id VARCHAR(64) UNIQUE NOT NULL,
                    case_id VARCHAR(64),
                    user_id INT,
                    action_type VARCHAR(30),
                    action_details JSONB,
                    reason TEXT,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    timestamp TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type)")

            # 创建归档表（用于历史日志）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs_archive (
                    id SERIAL PRIMARY KEY,
                    log_id VARCHAR(64) NOT NULL,
                    case_id VARCHAR(64),
                    user_id INT,
                    action_type VARCHAR(30),
                    action_details JSONB,
                    reason TEXT,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    timestamp TIMESTAMP,
                    created_at TIMESTAMP,
                    archived_at TIMESTAMP DEFAULT NOW()
                )
            """)

    def list_all(self) -> List[Dict]:
        """获取所有审计日志（不推荐用于大量数据）"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM audit_logs
                ORDER BY timestamp DESC
                LIMIT 1000
            """)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_by_id(self, entity_id: str) -> Optional[Dict]:
        """根据log_id获取审计日志"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM audit_logs WHERE log_id = %s", (entity_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def save(self, entity: Dict) -> Dict:
        """保存审计日志"""
        self._ensure_table_exists()
        log_id = entity.get('log_id')
        if not log_id:
            # 生成log_id
            log_id = f"log_{datetime.now().strftime('%Y%m%d%H%M%S')}_{self._generate_log_counter()}"
            entity['log_id'] = log_id

        action_details = json.dumps(entity.get('action_details')) if entity.get('action_details') else None
        timestamp = entity.get('timestamp')
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))

        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO audit_logs (log_id, case_id, user_id, action_type, action_details, reason, ip_address, user_agent, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (log_id) DO UPDATE SET
                    action_details = EXCLUDED.action_details,
                    reason = EXCLUDED.reason
                RETURNING *
            """, (
                log_id,
                entity.get('case_id'),
                entity.get('user_id'),
                entity.get('action_type'),
                action_details,
                entity.get('reason'),
                entity.get('ip_address'),
                entity.get('user_agent'),
                timestamp or datetime.now()
            ))
            row = cursor.fetchone()
            return dict(row)

    def delete(self, entity_id: str) -> bool:
        """删除审计日志（一般不直接删除，而是归档后删除）"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("DELETE FROM audit_logs WHERE log_id = %s", (entity_id,))
            return cursor.rowcount > 0

    def get_case_audit_trail(self, case_id: str, limit: int = 100) -> List[Dict]:
        """获取单病历完整操作轨迹"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM audit_logs
                WHERE case_id = %s
                ORDER BY timestamp DESC
                LIMIT %s
            """, (case_id, limit))
            rows = cursor.fetchall()
            return [self._format_log_for_display(dict(row)) for row in rows]

    def get_logs_by_action_type(self, action_type: str, limit: int = 100) -> List[Dict]:
        """根据操作类型查询日志"""
        self._ensure_table_exists()
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM audit_logs
                WHERE action_type = %s
                ORDER BY timestamp DESC
                LIMIT %s
            """, (action_type, limit))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def cleanup_old_logs(self, retention_days: int = None) -> Dict[str, int]:
        """清理过期日志并归档

        Args:
            retention_days: 保留天数，默认使用 RETENTION_DAYS (90天)

        Returns:
            清理统计 {'archived': count, 'deleted': count}
        """
        self._ensure_table_exists()
        retention_days = retention_days or self.RETENTION_DAYS
        cutoff_time = datetime.now() - timedelta(days=retention_days)

        with get_db_cursor() as cursor:
            # 先归档到归档表
            cursor.execute("""
                INSERT INTO audit_logs_archive
                (log_id, case_id, user_id, action_type, action_details, reason, ip_address, user_agent, timestamp, created_at)
                SELECT log_id, case_id, user_id, action_type, action_details, reason, ip_address, user_agent, timestamp, created_at
                FROM audit_logs
                WHERE timestamp < %s
            """, (cutoff_time,))
            archived_count = cursor.rowcount

            # 删除原表中的过期数据
            cursor.execute("DELETE FROM audit_logs WHERE timestamp < %s", (cutoff_time,))
            deleted_count = cursor.rowcount

            logger.info(f"审计日志清理完成: 归档 {archived_count} 条, 删除 {deleted_count} 条")
            return {'archived': archived_count, 'deleted': deleted_count}

    def get_coder_performance(self, coder_id: int, days: int = 30) -> Dict[str, Any]:
        """计算编码员工作指标"""
        self._ensure_table_exists()
        cutoff_time = datetime.now() - timedelta(days=days)

        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT action_type, COUNT(*) as count
                FROM audit_logs
                WHERE user_id = %s AND timestamp >= %s
                GROUP BY action_type
            """, (coder_id, cutoff_time))
            rows = cursor.fetchall()
            stats = {row['action_type']: row['count'] for row in rows}

            ai_accept = stats.get('ai_suggest_accept', 0)
            ai_reject = stats.get('ai_suggest_reject', 0)
            manual_add = stats.get('code_add_manual', 0)

            total_actions = ai_accept + ai_reject
            ai_adoption_rate = ai_accept / total_actions if total_actions > 0 else 0

            return {
                'coder_id': coder_id,
                'period_days': days,
                'ai_adoption_rate': round(ai_adoption_rate, 2),
                'ai_suggestion_accepted': ai_accept,
                'ai_suggestion_rejected': ai_reject,
                'manual_code_added': manual_add,
                'rlhf_grade': self._calculate_rlhf_grade(ai_adoption_rate, manual_add)
            }

    def _generate_log_counter(self) -> int:
        """生成日志计数器（用于log_id）"""
        with get_db_cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM audit_logs")
            count = cursor.fetchone()
            return (count[0] + 1) if count else 1

    def _format_log_for_display(self, log: Dict) -> Dict:
        """格式化日志用于显示"""
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
        return {
            **log,
            'action_label': action_labels.get(log.get('action_type', ''), log.get('action_type', ''))
        }

    def _calculate_rlhf_grade(self, adoption_rate: float, manual_count: int) -> str:
        """计算编码员RLHF训练等级"""
        if 0.3 <= adoption_rate <= 0.8 and manual_count >= 5:
            return "A"
        elif adoption_rate > 0.9:
            return "B"
        elif adoption_rate < 0.2:
            return "C"
        return "D"


# 全局实例
audit_log_repo = AuditLogRepository()