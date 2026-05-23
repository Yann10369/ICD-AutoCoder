"""Apache AGE 图数据库封装"""
from typing import List, Dict, Any, Optional
from app.core.logger import logger
from .postgres import postgres_client

# 可选导入 psycopg2
try:
    from psycopg2.extensions import connection
except ImportError:
    connection = None


class AgeGraphClient:
    """Apache AGE 图数据库客户端"""

    _instance: Optional["AgeGraphClient"] = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.graph_name = "icd_graph"

    def get_connection(self) -> connection:
        return postgres_client.get_connection()

    def create_graph(self) -> bool:
        """创建图空间（如果不存在）"""
        try:
            # 创建扩展（如果不存在）
            postgres_client.execute("CREATE EXTENSION IF NOT EXISTS age;")
            # 加载扩展
            postgres_client.execute("LOAD 'age';")
            # 设置搜索路径
            postgres_client.execute("SET search_path = ag_catalog, public;")
            # 检查图是否存在
            result = postgres_client.query_one(
                "SELECT 1 FROM ag_catalog.ag_graph WHERE graph_name = %s",
                (self.graph_name,)
            )
            if not result:
                # 创建图
                postgres_client.execute(f"SELECT create_graph(%s);", (self.graph_name,))
                logger.info(f"Apache AGE 图 {self.graph_name} 创建成功")
            else:
                logger.info(f"Apache AGE 图 {self.graph_name} 已存在")
            return True
        except Exception as e:
            logger.error(f"创建 Apache AGE 图失败: {str(e)}")
            return False

    def execute_cypher(self, cypher: str, params: dict = None) -> List[Dict[str, Any]]:
        """执行 Cypher 查询"""
        try:
            conn = self.get_connection()
            # Apache AGE 查询格式
            query = f"SELECT * FROM cypher('{self.graph_name}', $$$$ {cypher} $$$$) AS (v agtype);"
            with conn.cursor() as cur:
                cur.execute(query, params or {})
                rows = cur.fetchall()
                conn.commit()
                # 解析结果
                result = []
                for row in rows:
                    if row[0] is not None:
                        result.append(row[0])
                logger.debug(f"Cypher 查询返回 {len(result)} 行")
                return result
        except Exception as e:
            logger.error(f"Cypher 执行失败: {str(e)}")
            conn = self.get_connection()
            conn.rollback()
            raise

    def create_vertex(self, label: str, properties: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """创建顶点"""
        cypher = f"CREATE (v:{label} {{{', '.join([f'{k}: ${k}' for k in properties.keys()])}}}) RETURN v;"
        result = self.execute_cypher(cypher, properties)
        return result[0] if result else None

    def create_edge(
        self,
        from_id: int,
        to_id: int,
        label: str,
        properties: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        """创建边"""
        props_str = ""
        if properties:
            props_str = " {{{', '.join([f'{k}: ${k}' for k in properties.keys()])}}}"
        cypher = f"""
            MATCH a from={from_id}, b to={to_id}
            CREATE (a)-[r:{label}{props_str}]->(b)
            RETURN r;
        """
        params = properties or {}
        result = self.execute_cypher(cypher, params)
        return result[0] if result else None

    def find_vertex_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        """根据ICD编码查找顶点"""
        cypher = "MATCH (v:ICD) WHERE v.code = $code RETURN v;"
        result = self.execute_cypher(cypher, {"code": code})
        return result[0] if result else None

    def close(self):
        """关闭连接"""
        postgres_client.close()


# 全局实例
age_graph_client = AgeGraphClient()
