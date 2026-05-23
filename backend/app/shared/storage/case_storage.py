"""结构化病例样本存储模块"""
from typing import Dict, List, Optional, Any
from abc import ABC, abstractmethod
from datetime import datetime
from app.core.config import settings
from app.core.logger import logger


class CaseStorageInterface(ABC):
    """病例存储接口"""
    
    @abstractmethod
    def connect(self) -> bool:
        pass
    
    @abstractmethod
    def disconnect(self) -> None:
        pass
    
    @abstractmethod
    def save_case(self, case_text: str, icd_codes: List[Dict[str, Any]], metadata: Optional[Dict[str, Any]] = None) -> Optional[str]:
        pass
    
    @abstractmethod
    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        pass
    
    @abstractmethod
    def search_cases(self, filters: Optional[Dict[str, Any]] = None, limit: int = 10) -> List[Dict[str, Any]]:
        pass


class MySQLCaseStorage(CaseStorageInterface):
    """MySQL病例存储实现"""
    
    def __init__(self, host: str, port: int, user: str, password: str, database: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self.connection = None
    
    def connect(self) -> bool:
        """连接MySQL数据库"""
        try:
            try:
                import pymysql
            except ImportError:
                logger.warning("pymysql包未安装，无法使用MySQL数据库")
                return False
            
            self.connection = pymysql.connect(
                host=self.host, port=self.port, user=self.user,
                password=self.password, database=self.database, charset='utf8mb4'
            )
            self._create_tables()
            logger.info("MySQL数据库连接成功")
            return True
        except ImportError:
            logger.warning("pymysql包未安装，无法使用MySQL数据库")
            return False
        except Exception as e:
            logger.error(f"MySQL数据库连接失败: {str(e)}")
            return False
    
    def _get_pymysql_cursor(self):
        """获取pymysql字典游标"""
        try:
            import pymysql
            return self.connection.cursor(pymysql.cursors.DictCursor)
        except ImportError:
            raise ImportError("pymysql包未安装")
    
    def _create_tables(self) -> None:
        """创建表结构"""
        if not self.connection:
            return
        
        cursor = self.connection.cursor()
        
        # 病例表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cases (
                id VARCHAR(64) PRIMARY KEY,
                case_text TEXT NOT NULL,
                preprocessed_text TEXT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                metadata JSON
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """)
        
        # ICD编码表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS case_icd_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                case_id VARCHAR(64) NOT NULL,
                icd_code VARCHAR(20) NOT NULL,
                icd_name VARCHAR(255),
                probability FLOAT,
                rank INT,
                created_at DATETIME NOT NULL,
                INDEX idx_case_id (case_id),
                INDEX idx_icd_code (icd_code),
                FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """)
        
        self.connection.commit()
        cursor.close()
    
    def disconnect(self) -> None:
        """断开MySQL连接"""
        if self.connection:
            self.connection.close()
            logger.info("MySQL数据库连接已关闭")
    
    def save_case(
        self,
        case_text: str,
        icd_codes: List[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """保存病例"""
        if not self.connection:
            raise RuntimeError("数据库未连接")
        
        import uuid
        import json
        
        case_id = str(uuid.uuid4())
        now = datetime.now()
        
        try:
            cursor = self.connection.cursor()
            
            # 插入病例
            cursor.execute("""
                INSERT INTO cases (id, case_text, created_at, updated_at, metadata)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                case_id,
                case_text,
                now,
                now,
                json.dumps(metadata or {})
            ))
            
            # 插入ICD编码
            for rank, icd in enumerate(icd_codes, 1):
                cursor.execute("""
                    INSERT INTO case_icd_codes (case_id, icd_code, icd_name, probability, rank, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    case_id,
                    icd.get('icd_code', ''),
                    icd.get('icd_name', ''),
                    icd.get('probability', 0.0),
                    rank,
                    now
                ))
            
            self.connection.commit()
            cursor.close()
            
            logger.info(f"保存病例成功: {case_id}")
            return case_id
        
        except Exception as e:
            logger.error(f"保存病例失败: {str(e)}")
            self.connection.rollback()
            return None
    
    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        """获取病例"""
        if not self.connection:
            raise RuntimeError("数据库未连接")
        
        import json
        
        try:
            cursor = self._get_pymysql_cursor()
            
            # 获取病例信息
            cursor.execute("SELECT * FROM cases WHERE id = %s", (case_id,))
            case = cursor.fetchone()
            
            if not case:
                return None
            
            # 获取ICD编码
            cursor.execute("""
                SELECT icd_code, icd_name, probability, rank
                FROM case_icd_codes
                WHERE case_id = %s
                ORDER BY rank
            """, (case_id,))
            icd_codes = cursor.fetchall()
            
            cursor.close()
            
            case['icd_codes'] = icd_codes
            if case.get('metadata'):
                case['metadata'] = json.loads(case['metadata'])
            
            return case
        
        except Exception as e:
            logger.error(f"获取病例失败: {str(e)}")
            return None
    
    def search_cases(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """搜索病例"""
        if not self.connection:
            raise RuntimeError("数据库未连接")
        
        import json
        
        try:
            cursor = self._get_pymysql_cursor()
            
            query = "SELECT * FROM cases WHERE 1=1"
            params = []
            
            if filters:
                if 'icd_code' in filters:
                    query += """ AND id IN (
                        SELECT DISTINCT case_id FROM case_icd_codes WHERE icd_code = %s
                    )"""
                    params.append(filters['icd_code'])
                
                if 'date_from' in filters:
                    query += " AND created_at >= %s"
                    params.append(filters['date_from'])
                
                if 'date_to' in filters:
                    query += " AND created_at <= %s"
                    params.append(filters['date_to'])
            
            query += " ORDER BY created_at DESC LIMIT %s"
            params.append(limit)
            
            cursor.execute(query, params)
            cases = cursor.fetchall()
            
            # 为每个病例加载ICD编码
            for case in cases:
                cursor.execute("""
                    SELECT icd_code, icd_name, probability, rank
                    FROM case_icd_codes
                    WHERE case_id = %s
                    ORDER BY rank
                """, (case['id'],))
                case['icd_codes'] = cursor.fetchall()
                
                if case.get('metadata'):
                    case['metadata'] = json.loads(case['metadata'])
            
            cursor.close()
            return cases
        
        except Exception as e:
            logger.error(f"搜索病例失败: {str(e)}")
            return []


class MongoDBCaseStorage(CaseStorageInterface):
    """MongoDB病例存储实现"""
    
    def __init__(self, uri: str, database: str, collection: str = "cases"):
        """
        Args:
            uri: MongoDB连接URI
            database: 数据库名
            collection: 集合名
        """
        self.uri = uri
        self.database = database
        self.collection_name = collection
        self.client = None
        self.db = None
        self.collection = None
    
    def connect(self) -> bool:
        """连接MongoDB数据库"""
        try:
            try:
                from pymongo import MongoClient
            except ImportError:
                logger.warning("pymongo包未安装，无法使用MongoDB数据库")
                return False
            
            self.client = MongoClient(self.uri)
            self.db = self.client[self.database]
            self.collection = self.db[self.collection_name]
            
            # 创建索引
            self.collection.create_index("created_at")
            self.collection.create_index("icd_codes.icd_code")
            
            logger.info("MongoDB数据库连接成功")
            return True
        except ImportError:
            logger.warning("pymongo包未安装，无法使用MongoDB数据库")
            return False
        except Exception as e:
            logger.error(f"MongoDB数据库连接失败: {str(e)}")
            return False
    
    def disconnect(self) -> None:
        """断开MongoDB连接"""
        if self.client:
            self.client.close()
            logger.info("MongoDB数据库连接已关闭")
    
    def save_case(
        self,
        case_text: str,
        icd_codes: List[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """保存病例"""
        if not self.collection:
            raise RuntimeError("数据库未连接")
        
        try:
            from bson import ObjectId
        except ImportError:
            raise ImportError("bson包未安装（pymongo的依赖）")
        
        now = datetime.now()
        
        case_doc = {
            'case_text': case_text,
            'icd_codes': icd_codes,
            'created_at': now,
            'updated_at': now,
            'metadata': metadata or {}
        }
        
        try:
            result = self.collection.insert_one(case_doc)
            case_id = str(result.inserted_id)
            
            logger.info(f"保存病例成功: {case_id}")
            return case_id
        
        except Exception as e:
            logger.error(f"保存病例失败: {str(e)}")
            return None
    
    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        """获取病例"""
        if not self.collection:
            raise RuntimeError("数据库未连接")
        
        try:
            from bson import ObjectId
        except ImportError:
            raise ImportError("bson包未安装（pymongo的依赖）")
        
        try:
            case = self.collection.find_one({'_id': ObjectId(case_id)})
            if case:
                case['id'] = str(case['_id'])
                del case['_id']
            return case
        
        except Exception as e:
            logger.error(f"获取病例失败: {str(e)}")
            return None
    
    def search_cases(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """搜索病例"""
        if not self.collection:
            raise RuntimeError("数据库未连接")
        
        try:
            from bson import ObjectId
        except ImportError:
            raise ImportError("bson包未安装（pymongo的依赖）")
        
        query = {}
        
        if filters:
            if 'icd_code' in filters:
                query['icd_codes.icd_code'] = filters['icd_code']
            
            if 'date_from' in filters:
                query['created_at'] = {'$gte': filters['date_from']}
            
            if 'date_to' in filters:
                if 'created_at' in query:
                    query['created_at']['$lte'] = filters['date_to']
                else:
                    query['created_at'] = {'$lte': filters['date_to']}
        
        try:
            cases = list(self.collection.find(query).sort('created_at', -1).limit(limit))
            
            for case in cases:
                case['id'] = str(case['_id'])
                del case['_id']
            
            return cases
        
        except Exception as e:
            logger.error(f"搜索病例失败: {str(e)}")
            return []


class CaseStorage:
    """病例存储管理器
    
    支持MySQL和MongoDB
    """
    
    def __init__(self):
        self.db_type = settings.DATABASE_TYPE if hasattr(settings, 'DATABASE_TYPE') else "json"
        self.db_url = settings.DATABASE_URL if hasattr(settings, 'DATABASE_URL') else None
        self.storage: Optional[CaseStorageInterface] = None
        self._initialize()
    
    def _initialize(self) -> None:
        """初始化数据库连接"""
        if self.db_type == "json":
            # 使用JSON文件（默认）
            logger.info("使用JSON文件存储病例数据")
            self.storage = None
        elif self.db_type == "mysql":
            if not self.db_url:
                logger.warning("MySQL数据库URL未配置，使用JSON文件")
                self.storage = None
                return
            
            # 解析MySQL连接字符串
            # 格式: mysql://user:password@host:port/database
            try:
                from urllib.parse import urlparse
                parsed = urlparse(self.db_url.replace("mysql://", "http://"))
                host = parsed.hostname or "localhost"
                port = parsed.port or 3306
                user = parsed.username or "root"
                password = parsed.password or ""
                database = parsed.path.strip("/") or "icd_cases"
                
                self.storage = MySQLCaseStorage(host, port, user, password, database)
                self.storage.connect()
            except Exception as e:
                logger.error(f"初始化MySQL失败: {str(e)}")
                self.storage = None
        
        elif self.db_type == "mongodb":
            if not self.db_url:
                logger.warning("MongoDB数据库URL未配置，使用JSON文件")
                self.storage = None
                return
            
            # 解析MongoDB连接字符串
            # 格式: mongodb://user:password@host:port/database
            try:
                from urllib.parse import urlparse
                parsed = urlparse(self.db_url)
                database = parsed.path.strip("/").split("/")[0] or "icd_cases"
                
                self.storage = MongoDBCaseStorage(self.db_url, database)
                self.storage.connect()
            except Exception as e:
                logger.error(f"初始化MongoDB失败: {str(e)}")
                self.storage = None
        
        else:
            logger.warning(f"未知的数据库类型: {self.db_type}，使用JSON文件")
            self.storage = None
    
    def is_connected(self) -> bool:
        """检查数据库是否已连接"""
        return self.storage is not None
    
    def save_case(
        self,
        case_text: str,
        icd_codes: List[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """保存病例"""
        if not self.storage:
            # 如果没有数据库，保存到JSON文件
            return self._save_to_json(case_text, icd_codes, metadata)
        
        try:
            return self.storage.save_case(case_text, icd_codes, metadata)
        except Exception as e:
            logger.error(f"保存病例失败: {str(e)}")
            return None
    
    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        """获取病例"""
        if not self.storage:
            return self._load_from_json(case_id)
        
        try:
            return self.storage.get_case(case_id)
        except Exception as e:
            logger.error(f"获取病例失败: {str(e)}")
            return None
    
    def search_cases(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """搜索病例"""
        if not self.storage:
            return self._search_json(filters, limit)
        
        try:
            return self.storage.search_cases(filters, limit)
        except Exception as e:
            logger.error(f"搜索病例失败: {str(e)}")
            return []
    
    def _save_to_json(
        self,
        case_text: str,
        icd_codes: List[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """保存到JSON文件（备用方法）"""
        import uuid
        import json
        from pathlib import Path
        
        case_id = str(uuid.uuid4())
        case_dir = Path("app/data/sample_cases")
        case_dir.mkdir(parents=True, exist_ok=True)
        
        case_file = case_dir / f"{case_id}.json"
        
        case_data = {
            'id': case_id,
            'case_text': case_text,
            'icd_codes': icd_codes,
            'created_at': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        try:
            with open(case_file, 'w', encoding='utf-8') as f:
                json.dump(case_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"保存病例到JSON文件: {case_id}")
            return case_id
        except Exception as e:
            logger.error(f"保存病例到JSON文件失败: {str(e)}")
            return None
    
    def _load_from_json(self, case_id: str) -> Optional[Dict[str, Any]]:
        """从JSON文件加载（备用方法）"""
        import json
        from pathlib import Path
        
        case_file = Path(f"app/data/sample_cases/{case_id}.json")
        
        if not case_file.exists():
            return None
        
        try:
            with open(case_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"从JSON文件加载病例失败: {str(e)}")
            return None
    
    def _search_json(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """从JSON文件搜索（备用方法）"""
        import json
        from pathlib import Path
        
        case_dir = Path("app/data/sample_cases")
        cases = []
        
        for case_file in case_dir.glob("*.json"):
            try:
                with open(case_file, 'r', encoding='utf-8') as f:
                    case = json.load(f)
                    
                    if filters:
                        if 'icd_code' in filters:
                            icd_codes = [icd.get('icd_code') for icd in case.get('icd_codes', [])]
                            if filters['icd_code'] not in icd_codes:
                                continue
                        
                        if 'date_from' in filters:
                            if case.get('created_at', '') < filters['date_from']:
                                continue
                        
                        if 'date_to' in filters:
                            if case.get('created_at', '') > filters['date_to']:
                                continue
                    
                    cases.append(case)
            except Exception:
                continue
        
        # 按创建时间排序
        cases.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return cases[:limit]
    
    def disconnect(self) -> None:
        """断开数据库连接"""
        if self.storage:
            self.storage.disconnect()


# 全局病例存储实例
case_storage = CaseStorage()

