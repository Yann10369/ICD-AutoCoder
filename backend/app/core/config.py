"""配置管理模块"""
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings

from typing import List, Optional, Dict


class Settings(BaseSettings):
    """应用配置"""
    
    # API配置
    API_TITLE: str = "ICD Auto Coder Backend"
    API_VERSION: str = "1.0.0"
    
    # 模型配置（测试模式）
    MODEL_DIR: str = "models"
    AVAILABLE_MODELS: List[str] = ["CAML", "DCAN", "Fusion", "TransICD"]
    DEFAULT_MODEL: str = "CAML"
    
    # LLM配置
    LLM_PROVIDER: str = "openai"  # openai, anthropic, local
    LLM_MODEL: str = "gpt-4"
    LLM_API_KEY: Optional[str] = None
    LLM_BASE_URL: Optional[str] = None
    
    # 知识图谱配置
    GRAPH_DB_TYPE: str = "json"  # json, neo4j, nebula
    GRAPH_DB_URL: Optional[str] = None
    ICD_HIERARCHY_PATH: str = "app/data/icd_hierarchy.json"
    UMLS_MAPPINGS_PATH: str = "app/data/umls_mappings.json"
    
    # 数据库配置
    DATABASE_TYPE: str = "json"  # json, mysql, mongodb
    DATABASE_URL: Optional[str] = None
    
    # 预测配置
    TOP_K: int = 10  # 返回top-k个ICD编码
    PREDICTION_THRESHOLD: float = 0.5  # 预测概率阈值
    
    # 预处理配置
    MAX_TEXT_LENGTH: int = 512
    REMOVE_STOPWORDS: bool = True
    KEEP_NUMBERS: bool = True
    
    # 测试模式配置（使用测试数据）
    USE_MOCK_MODE: bool = True  # 始终使用测试数据（默认True）
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

