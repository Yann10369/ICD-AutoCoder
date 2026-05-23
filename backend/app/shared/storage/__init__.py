"""存储层 - 数据访问和持久化"""
from pathlib import Path

# 仓库
from app.shared.storage.repositories.base import BaseRepository
from app.shared.storage.repositories.model_config_repo import ModelConfigRepository
from app.shared.storage.repositories.prediction_repo import PredictionRepository, PredictionRecord
from app.shared.storage.repositories.icd_hierarchy_repo import ICDHierarchyRepository

# 数据存储
from app.shared.storage.model_repository import ModelRepository
from app.shared.storage.graph_database import GraphDatabase, graph_database
from app.shared.storage.case_storage import CaseStorage

# 数据文件路径
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Repository 单例实例
model_config_repo = ModelConfigRepository(DATA_DIR / "model_configs.json")
prediction_repo = PredictionRepository(DATA_DIR / "predictions.json")

# 惰性导入数据库连接（只有在实际使用时才导入，避免 psycopg2 依赖问题）
PostgresClient = None
AgeGraphClient = None
age_graph_client = None

def _import_database():
    """惰性导入数据库模块"""
    global PostgresClient, AgeGraphClient, age_graph_client
    if PostgresClient is None:
        from app.shared.storage.database.postgres import PostgresClient
        from app.shared.storage.database.age_graph import AgeGraphClient, age_graph_client
        PostgresClient = PostgresClient
        AgeGraphClient = AgeGraphClient
        age_graph_client = age_graph_client

# 在导入时尝试预导入（如果 psycopg2 可用）
try:
    _import_database()
except ImportError:
    # 如果 psycopg2 不可用，保持 None，使用时再尝试
    pass

# 依赖注入函数（原 dependencies/services.py）
# 惰性导入 ModelConfigService 以避免循环导入
def get_model_config_service():
    from app.services.model_config_service import ModelConfigService, model_config_service
    return model_config_service


def get_model_config_repo() -> ModelConfigRepository:
    return model_config_repo


def get_prediction_repo() -> PredictionRepository:
    return prediction_repo


def get_age_graph_client():
    if AgeGraphClient is None:
        _import_database()
    return age_graph_client


__all__ = [
    # 基类
    'BaseRepository',
    # 数据库连接（可能为 None，需要惰性加载）
    'PostgresClient',
    'AgeGraphClient', 'age_graph_client',
    # 仓库
    'ModelConfigRepository',
    'PredictionRepository', 'PredictionRecord',
    'ICDHierarchyRepository',
    # 数据存储
    'ModelRepository',
    'GraphDatabase', 'graph_database',
    'CaseStorage', 'case_storage',
    # 依赖注入函数
    'get_model_config_repo',
    'get_prediction_repo',
    'get_age_graph_client',
    'get_model_config_service',
    # 路径
    'DATA_DIR',
]
