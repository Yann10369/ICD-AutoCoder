"""
数据库连接模块
提供PostgreSQL数据库连接和基础操作
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
from contextlib import contextmanager
from typing import Optional, List, Dict, Any
import logging

from .config import settings

logger = logging.getLogger(__name__)

# 数据库连接池
_connection_pool: Optional[pool.ThreadedConnectionPool] = None


def init_db_pool(min_connections: int = 1, max_connections: int = 10):
    """初始化数据库连接池"""
    global _connection_pool

    if _connection_pool is not None:
        return _connection_pool

    try:
        # 从环境变量或配置获取数据库连接信息
        # Docker环境中: host=postgres, port=5432
        # 本地环境: host=localhost, port=15432
        db_url = settings.DATABASE_URL
        if db_url and db_url.startswith("postgresql://"):
            import urllib.parse
            parsed = urllib.parse.urlparse(db_url)
            db_params = {
                "host": parsed.hostname or "localhost",
                "port": parsed.port or 5432,
                "database": parsed.path.lstrip("/") or "icd_graph",
                "user": parsed.username or "icd_user",
                "password": parsed.password or "icd_password"
            }
        else:
            # 默认连接配置（本地开发环境）
            db_params = {
                "host": "localhost",  # 本地开发用localhost
                "port": 15432,
                "database": "icd_graph",
                "user": "icd_user",
                "password": "icd_password"
            }

        _connection_pool = pool.ThreadedConnectionPool(
            min_connections,
            max_connections,
            **db_params
        )
        logger.info(f"数据库连接池初始化成功: {db_params['host']}:{db_params['port']}")
        return _connection_pool
    except Exception as e:
        logger.error(f"数据库连接池初始化失败: {e}")
        return None


def get_pool() -> Optional[pool.ThreadedConnectionPool]:
    """获取数据库连接池"""
    global _connection_pool
    if _connection_pool is None:
        init_db_pool()
    return _connection_pool


@contextmanager
def get_db_connection():
    """获取数据库连接的上下文管理器"""
    pool = get_pool()
    if pool is None:
        raise Exception("数据库连接池未初始化")

    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        pool.putconn(conn)


@contextmanager
def get_db_cursor(cursor_factory=RealDictCursor):
    """获取数据库cursor的上下文管理器"""
    with get_db_connection() as conn:
        cursor = conn.cursor(cursor_factory=cursor_factory)
        try:
            yield cursor
        finally:
            cursor.close()


def execute_query(query: str, params: tuple = None) -> List[Dict[str, Any]]:
    """执行查询并返回结果列表"""
    with get_db_cursor() as cursor:
        cursor.execute(query, params)
        results = cursor.fetchall()
        if results is None:
            logger.warning(f"查询返回空结果: {query[:100]}...")
            return []
        return results


def execute_one(query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
    """执行查询并返回单条结果"""
    with get_db_cursor() as cursor:
        cursor.execute(query, params)
        result = cursor.fetchone()
        if result is None:
            logger.debug(f"查询无结果: {query[:100]}...")
        return result


def execute_update(query: str, params: tuple = None) -> int:
    """执行更新/插入/删除操作，返回影响的行数"""
    with get_db_cursor() as cursor:
        cursor.execute(query, params)
        return cursor.rowcount


def close_pool():
    """关闭数据库连接池"""
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("数据库连接池已关闭")


# 便捷函数：检查数据库是否可用
def check_db_connection() -> bool:
    """检查数据库连接是否正常"""
    try:
        result = execute_one("SELECT 1 as check")
        return result is not None
    except Exception as e:
        logger.error(f"数据库连接检查失败: {e}")
        return False