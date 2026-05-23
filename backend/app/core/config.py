"""配置管理模块"""
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings

from typing import List, Optional, Dict
from pathlib import Path

# 确定 .env 文件路径（相对于当前文件的 backend/.env）
# config.py 在 backend/app/core/，向上3级到 backend/，然后找 .env
_ENV_FILE_PATH = Path(__file__).parent.parent.parent / ".env"

# 使用 python-dotenv 手动加载 .env 文件，确保环境变量被正确设置
try:
    from dotenv import load_dotenv
    if _ENV_FILE_PATH.exists():
        load_dotenv(_ENV_FILE_PATH)
except ImportError:
    # 如果没有安装 python-dotenv，使用 pydantic-settings 的默认行为
    pass


class Settings(BaseSettings):
    """应用配置"""

    # API配置
    API_TITLE: str = "ICD Auto Coder Backend"
    API_VERSION: str = "1.2.0"  # 版本号，用于验证代码更新
    BUILD_TIME: str = "2026-05-07"  # 构建日期
    
    # 模型服务基础配置（模型列表从 model_configs.json 读取）
    MODEL_DIR: str = "models"
    # MODELS中继站API配置
    MODELS_API_URL: str = "http://localhost:8005"  # MODELS/app.py 的本地地址
    
    # AI模型服务配置（阿里云）
    ALI_API_KEY: Optional[str] = None
    ALI_BASE_URL: Optional[str] = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    
    # 知识图谱配置
    GRAPH_DB_TYPE: str = "json"  # json, neo4j, nebula, age
    GRAPH_DB_URL: Optional[str] = None
    GRAPH_API_KEY: Optional[str] = None  # 图谱API访问密钥（从环境变量读取）
    AGE_GRAPH_NAME: str = "icd_graph"  # AGE 图名称
    ICD_HIERARCHY_PATH: str = "app/data/icd_hierarchy.json"
    UMLS_MAPPINGS_PATH: str = "app/data/umls_mappings.json"
    UMLS_API_KEY: Optional[str] = None  # UMLS API Key，用于知识图谱查询
    
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

    # JWT认证配置
    SECRET_KEY: str = "your-secret-key-change-in-production-icd-autocoder-2024"
    ALGORITHM: str = "HS256"
    # JWT过期时间（分钟）- 医疗场景建议较短，敏感操作需要重新认证
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # 30分钟，适合医疗系统安全要求
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 7天 refresh token

    # 邮件通知配置
    EMAIL_ENABLED: bool = False
    SMTP_HOST: str = "smtp.example.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "icd-autocoder@example.com"
    EMAIL_TO_ADMIN: str = "admin@example.com"

    # CORS配置 - 逗号分隔的可信 origins 列表
    CORS_ORIGINS: str = "http://localhost:8080,http://localhost:3000"

    class Config:
        # 使用相对于配置文件的路径查找 .env 文件
        # 从 backend/app/core/config.py 向上查找 backend/.env
        env_file = str(_ENV_FILE_PATH) if _ENV_FILE_PATH.exists() else ".env"
        case_sensitive = True
        extra = "ignore"  # 忽略 .env 文件中的额外字段


settings = Settings()

