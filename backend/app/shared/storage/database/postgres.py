"""PostgreSQL 连接管理"""
from typing import Optional
from app.core.config import settings
from app.core.logger import logger

# 可选导入 psycopg2
try:
    import psycopg2
    from psycopg2.extensions import connection
except ImportError:
    psycopg2 = None
    connection = None


class PostgresClient:
    """PostgreSQL 客户端封装"""

    _instance: Optional["PostgresClient"] = None
    _connection: Optional[connection] = None

    def __new__(cls, *args, **kwargs):
        """单例模式"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or settings.DATABASE_URL
        self._connection = None

    def _connect(self):
        """建立连接"""
        if psycopg2 is None:
            raise ImportError("psycopg2 is not installed. Please install psycopg2-binary to use PostgreSQL.")
        try:
            self._connection = psycopg2.connect(self.database_url)
            logger.info("PostgreSQL 连接成功")
        except Exception as e:
            logger.error(f"PostgreSQL 连接失败: {str(e)}")
            raise

    def get_connection(self) -> connection:
        """获取连接"""
        if self._connection is None or self._connection.closed:
            self._connect()
        return self._connection

    def close(self):
        """关闭连接"""
        if self._connection and not self._connection.closed:
            self._connection.close()
            logger.info("PostgreSQL 连接已关闭")

    def execute(self, query: str, params: tuple = None):
        """执行查询"""
        conn = self.get_connection()
        with conn.cursor() as cur:
            cur.execute(query, params)
            conn.commit()

    def query(self, query: str, params: tuple = None) -> list:
        """执行查询并返回结果"""
        conn = self.get_connection()
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()

    def query_one(self, query: str, params: tuple = None) -> Optional[tuple]:
        """执行查询返回单行"""
        conn = self.get_connection()
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchone()


# 全局实例 - 延迟初始化，实际连接在首次使用时建立
postgres_client = PostgresClient()
