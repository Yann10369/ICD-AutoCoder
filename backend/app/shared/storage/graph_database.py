"""知识图谱数据库模块"""
from typing import Dict, List, Optional, Any
from abc import ABC, abstractmethod
from app.core.config import settings
from app.core.logger import logger


class GraphDatabaseInterface(ABC):
    """图数据库接口"""
    
    @abstractmethod
    def connect(self) -> bool:
        pass
    
    @abstractmethod
    def disconnect(self) -> None:
        pass
    
    @abstractmethod
    def create_node(self, label: str, properties: Dict[str, Any]) -> str:
        pass
    
    @abstractmethod
    def create_relationship(self, from_node_id: str, to_node_id: str, rel_type: str, properties: Optional[Dict[str, Any]] = None) -> bool:
        pass
    
    @abstractmethod
    def query_nodes(self, label: Optional[str] = None, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        pass
    
    @abstractmethod
    def query_path(self, from_node_id: str, to_node_id: str, max_depth: int = 3) -> List[List[Dict[str, Any]]]:
        pass


class Neo4jDatabase(GraphDatabaseInterface):
    """Neo4j图数据库实现"""
    
    def __init__(self, uri: str, user: str, password: str):
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = None
    
    def connect(self) -> bool:
        """连接Neo4j数据库"""
        try:
            from neo4j import GraphDatabase
            
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            # 测试连接
            with self.driver.session() as session:
                session.run("RETURN 1")
            
            logger.info("Neo4j数据库连接成功")
            return True
        except ImportError:
            logger.warning("neo4j包未安装，无法使用Neo4j数据库")
            return False
        except Exception as e:
            logger.error(f"Neo4j数据库连接失败: {str(e)}")
            return False
    
    def disconnect(self) -> None:
        """断开Neo4j连接"""
        if self.driver:
            self.driver.close()
            logger.info("Neo4j数据库连接已关闭")
    
    def create_node(self, label: str, properties: Dict[str, Any]) -> str:
        """创建节点"""
        if not self.driver:
            raise RuntimeError("数据库未连接")
        
        with self.driver.session() as session:
            query = f"CREATE (n:{label} $props) RETURN id(n) as node_id"
            result = session.run(query, props=properties)
            record = result.single()
            return str(record['node_id'])
    
    def create_relationship(
        self,
        from_node_id: str,
        to_node_id: str,
        rel_type: str,
        properties: Optional[Dict[str, Any]] = None
    ) -> bool:
        """创建关系"""
        if not self.driver:
            raise RuntimeError("数据库未连接")
        
        try:
            with self.driver.session() as session:
                if properties:
                    query = f"""
                    MATCH (a), (b)
                    WHERE id(a) = $from_id AND id(b) = $to_id
                    CREATE (a)-[r:{rel_type} $props]->(b)
                    RETURN r
                    """
                    session.run(query, from_id=int(from_node_id), to_id=int(to_node_id), props=properties)
                else:
                    query = f"""
                    MATCH (a), (b)
                    WHERE id(a) = $from_id AND id(b) = $to_id
                    CREATE (a)-[r:{rel_type}]->(b)
                    RETURN r
                    """
                    session.run(query, from_id=int(from_node_id), to_id=int(to_node_id))
            
            return True
        except Exception as e:
            logger.error(f"创建关系失败: {str(e)}")
            return False
    
    def query_nodes(
        self,
        label: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """查询节点"""
        if not self.driver:
            raise RuntimeError("数据库未连接")
        
        with self.driver.session() as session:
            if label:
                if filters:
                    filter_str = " AND ".join([f"n.{k} = ${k}" for k in filters.keys()])
                    query = f"MATCH (n:{label}) WHERE {filter_str} RETURN n"
                    result = session.run(query, **filters)
                else:
                    query = f"MATCH (n:{label}) RETURN n"
                    result = session.run(query)
            else:
                query = "MATCH (n) RETURN n LIMIT 100"
                result = session.run(query)
            
            nodes = []
            for record in result:
                node = dict(record['n'])
                nodes.append(node)
            
            return nodes
    
    def query_path(
        self,
        from_node_id: str,
        to_node_id: str,
        max_depth: int = 3
    ) -> List[List[Dict[str, Any]]]:
        """查询路径"""
        if not self.driver:
            raise RuntimeError("数据库未连接")
        
        with self.driver.session() as session:
            query = f"""
            MATCH path = shortestPath((a)-[*1..{max_depth}]-(b))
            WHERE id(a) = $from_id AND id(b) = $to_id
            RETURN path
            """
            result = session.run(query, from_id=int(from_node_id), to_id=int(to_node_id))
            
            paths = []
            for record in result:
                path = record['path']
                nodes = [dict(node) for node in path.nodes]
                paths.append(nodes)
            
            return paths


class NebulaGraphDatabase(GraphDatabaseInterface):
    """NebulaGraph图数据库实现"""
    
    def __init__(self, hosts: List[str], port: int, user: str, password: str, space: str):
        """
        Args:
            hosts: NebulaGraph主机列表
            port: 端口
            user: 用户名
            password: 密码
            space: 图空间名称
        """
        self.hosts = hosts
        self.port = port
        self.user = user
        self.password = password
        self.space = space
        self.pool = None
        self.session = None
    
    def connect(self) -> bool:
        """连接NebulaGraph数据库"""
        try:
            from nebula3.gclient.net import ConnectionPool
            from nebula3.Config import Config
            
            config = Config()
            self.pool = ConnectionPool()
            
            success = self.pool.init(
                [(host, self.port) for host in self.hosts],
                Config()
            )
            
            if not success:
                return False
            
            self.session = self.pool.get_session(self.user, self.password)
            self.session.execute(f"USE {self.space}")
            
            logger.info("NebulaGraph数据库连接成功")
            return True
        except ImportError:
            logger.warning("nebula3包未安装，无法使用NebulaGraph数据库")
            return False
        except Exception as e:
            logger.error(f"NebulaGraph数据库连接失败: {str(e)}")
            return False
    
    def disconnect(self) -> None:
        """断开NebulaGraph连接"""
        if self.session:
            self.session.release()
        if self.pool:
            self.pool.close()
        logger.info("NebulaGraph数据库连接已关闭")
    
    def create_node(self, label: str, properties: Dict[str, Any]) -> str:
        """创建节点"""
        if not self.session:
            raise RuntimeError("数据库未连接")
        
        # NebulaGraph需要先定义VID
        vid = properties.get('id', f"{label}_{len(properties)}")
        props_str = ", ".join([f"{k}: {repr(v)}" for k, v in properties.items()])
        
        query = f"INSERT VERTEX {label}({', '.join(properties.keys())}) VALUES '{vid}':({props_str})"
        self.session.execute(query)
        
        return vid
    
    def create_relationship(
        self,
        from_node_id: str,
        to_node_id: str,
        rel_type: str,
        properties: Optional[Dict[str, Any]] = None
    ) -> bool:
        """创建关系"""
        if not self.session:
            raise RuntimeError("数据库未连接")
        
        try:
            if properties:
                props_str = ", ".join([f"{k}: {repr(v)}" for k, v in properties.items()])
                query = f"INSERT EDGE {rel_type}({', '.join(properties.keys())}) VALUES '{from_node_id}' -> '{to_node_id}':({props_str})"
            else:
                query = f"INSERT EDGE {rel_type}() VALUES '{from_node_id}' -> '{to_node_id}'"
            
            self.session.execute(query)
            return True
        except Exception as e:
            logger.error(f"创建关系失败: {str(e)}")
            return False
    
    def query_nodes(
        self,
        label: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """查询节点"""
        if not self.session:
            raise RuntimeError("数据库未连接")
        
        if label:
            if filters:
                filter_str = " AND ".join([f"{k} == {repr(v)}" for k, v in filters.items()])
                query = f"FETCH PROP ON {label} * WHERE {filter_str} YIELD properties(vertex)"
            else:
                query = f"FETCH PROP ON {label} * YIELD properties(vertex)"
        else:
            query = "MATCH (v) RETURN v LIMIT 100"
        
        result = self.session.execute(query)
        nodes = []
        
        if result.is_succeeded():
            for row in result:
                nodes.append(dict(row.values[0]))
        
        return nodes
    
    def query_path(
        self,
        from_node_id: str,
        to_node_id: str,
        max_depth: int = 3
    ) -> List[List[Dict[str, Any]]]:
        """查询路径"""
        if not self.session:
            raise RuntimeError("数据库未连接")
        
        query = f"FIND SHORTEST PATH FROM '{from_node_id}' TO '{to_node_id}' OVER * UPTO {max_depth} STEPS"
        result = self.session.execute(query)
        
        paths = []
        if result.is_succeeded():
            for row in result:
                path = row.values[0]
                nodes = [dict(node) for node in path.nodes()]
                paths.append(nodes)
        
        return paths


class GraphDatabase:
    """图数据库管理器
    
    支持Neo4j和NebulaGraph
    """
    
    def __init__(self):
        self.db_type = settings.GRAPH_DB_TYPE
        self.db_url = settings.GRAPH_DB_URL
        self.db: Optional[GraphDatabaseInterface] = None
        self._initialize()
    
    def _initialize(self) -> None:
        """初始化图数据库连接"""
        if self.db_type == "json":
            # 使用JSON文件（默认，不需要连接数据库）
            logger.info("使用JSON文件存储知识图谱数据")
            self.db = None
        elif self.db_type == "neo4j":
            if not self.db_url:
                logger.warning("Neo4j数据库URL未配置，使用JSON文件")
                self.db = None
                return
            
            # 解析Neo4j连接字符串
            # 格式: bolt://user:password@host:port
            try:
                from urllib.parse import urlparse
                parsed = urlparse(self.db_url.replace("bolt://", "http://"))
                uri = f"bolt://{parsed.hostname}:{parsed.port or 7687}"
                user = parsed.username or "neo4j"
                password = parsed.password or "password"
                
                self.db = Neo4jDatabase(uri, user, password)
                self.db.connect()
            except Exception as e:
                logger.error(f"初始化Neo4j失败: {str(e)}")
                self.db = None
        
        elif self.db_type == "nebula":
            if not self.db_url:
                logger.warning("NebulaGraph数据库URL未配置，使用JSON文件")
                self.db = None
                return
            
            # 解析NebulaGraph连接字符串
            # 格式: nebula://user:password@host1,host2:port/space
            try:
                from urllib.parse import urlparse
                parsed = urlparse(self.db_url.replace("nebula://", "http://"))
                hosts = parsed.hostname.split(",") if "," in parsed.hostname else [parsed.hostname]
                port = parsed.port or 9669
                user = parsed.username or "root"
                password = parsed.password or "password"
                space = parsed.path.strip("/") or "icd_graph"
                
                self.db = NebulaGraphDatabase(hosts, port, user, password, space)
                self.db.connect()
            except Exception as e:
                logger.error(f"初始化NebulaGraph失败: {str(e)}")
                self.db = None
        
        else:
            logger.warning(f"未知的图数据库类型: {self.db_type}，使用JSON文件")
            self.db = None
    
    def is_connected(self) -> bool:
        """检查数据库是否已连接"""
        return self.db is not None
    
    def create_icd_node(self, icd_code: str, icd_name: str, level: int) -> Optional[str]:
        """创建ICD节点"""
        if not self.db:
            return None
        
        properties = {
            'code': icd_code,
            'name': icd_name,
            'level': level
        }
        
        try:
            node_id = self.db.create_node('ICD', properties)
            return node_id
        except Exception as e:
            logger.error(f"创建ICD节点失败: {str(e)}")
            return None
    
    def create_hierarchy_relationship(
        self,
        parent_id: str,
        child_id: str
    ) -> bool:
        """创建层次关系"""
        if not self.db:
            return False
        
        try:
            return self.db.create_relationship(parent_id, child_id, 'PARENT_OF')
        except Exception as e:
            logger.error(f"创建层次关系失败: {str(e)}")
            return False
    
    def query_icd_nodes(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """查询ICD节点"""
        if not self.db:
            return []
        
        try:
            return self.db.query_nodes('ICD', filters)
        except Exception as e:
            logger.error(f"查询ICD节点失败: {str(e)}")
            return []
    
    def query_icd_path(
        self,
        from_code: str,
        to_code: str,
        max_depth: int = 3
    ) -> List[List[Dict[str, Any]]]:
        """查询ICD编码之间的路径"""
        if not self.db:
            return []
        
        # 首先需要根据code查找节点ID
        from_nodes = self.query_icd_nodes({'code': from_code})
        to_nodes = self.query_icd_nodes({'code': to_code})
        
        if not from_nodes or not to_nodes:
            return []
        
        from_node_id = from_nodes[0].get('id')
        to_node_id = to_nodes[0].get('id')
        
        try:
            return self.db.query_path(from_node_id, to_node_id, max_depth)
        except Exception as e:
            logger.error(f"查询ICD路径失败: {str(e)}")
            return []
    
    def disconnect(self) -> None:
        """断开数据库连接"""
        if self.db:
            self.db.disconnect()


# 全局图数据库实例
graph_database = GraphDatabase()

