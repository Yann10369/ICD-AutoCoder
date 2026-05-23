"""模型配置相关Schema"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


def _now_iso() -> str:
    """生成当前时间的 ISO 字符串"""
    return datetime.utcnow().isoformat() + "Z"


class ModelConfig(BaseModel):
    """模型配置实体"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(default="", description="实例名称")
    category: str = Field(default="small", description="分类: small/large/graph")
    status: Optional[str] = Field(default="unknown", description="valid/invalid/unknown")
    createdAt: str = Field(default_factory=_now_iso)
    updatedAt: str = Field(default_factory=_now_iso)
    # 大模型字段
    apiKey: Optional[str] = Field(default=None, description="大模型 API Key")
    exampleCode: Optional[str] = Field(default=None, description="大模型调用示例代码")
    # 小模型字段
    dockerImage: Optional[str] = Field(default=None, description="小模型 Docker 镜像")
    size: Optional[float] = Field(default=None, description="模型大小 (MB)")
    description: Optional[str] = Field(default=None, description="模型主要特点描述")
    enabled: Optional[bool] = Field(default=True, description="是否启用")
    # 图谱字段
    graphApiCode: Optional[str] = Field(default=None, description="图谱 API 调用代码")
    graphApiKey: Optional[str] = Field(default=None, description="图谱 API Key")
    # 兼容旧字段（向后兼容）
    arch: Optional[str] = Field(default=None, description="模型架构/类型（已废弃）")
    weightsPath: Optional[str] = Field(default=None, description="模型权重路径（已废弃）")
    graphUri: Optional[str] = Field(default=None, description="知识图谱连接（已废弃）")


class ModelConfigCreate(BaseModel):
    """创建配置请求"""
    name: str
    category: Optional[str] = "small"
    status: Optional[str] = "unknown"
    # 大模型字段
    apiKey: Optional[str] = None
    exampleCode: Optional[str] = None
    # 小模型字段
    dockerImage: Optional[str] = None
    size: Optional[float] = None
    description: Optional[str] = None
    enabled: Optional[bool] = True
    # 图谱字段
    graphApiCode: Optional[str] = None
    graphApiKey: Optional[str] = None
    # 兼容旧字段
    arch: Optional[str] = None
    weightsPath: Optional[str] = None
    graphUri: Optional[str] = None


class ModelConfigUpdate(BaseModel):
    """更新配置请求"""
    name: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    # 大模型字段
    apiKey: Optional[str] = None
    exampleCode: Optional[str] = None
    # 小模型字段
    dockerImage: Optional[str] = None
    size: Optional[float] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    # 图谱字段
    graphApiCode: Optional[str] = None
    graphApiKey: Optional[str] = None
    # 兼容旧字段
    arch: Optional[str] = None
    weightsPath: Optional[str] = None
    graphUri: Optional[str] = None


class ModelConfigResponse(BaseModel):
    """模型配置响应"""
    id: str
    name: str
    category: str
    status: Optional[str]
    # 大模型字段
    apiKey: Optional[str]
    exampleCode: Optional[str]
    # 小模型字段
    dockerImage: Optional[str]
    size: Optional[float]
    description: Optional[str]
    enabled: Optional[bool]
    # 图谱字段
    graphApiCode: Optional[str]
    graphApiKey: Optional[str]
    # 时间戳
    createdAt: str
    updatedAt: str
    # 兼容旧字段
    arch: Optional[str]
    weightsPath: Optional[str]
    graphUri: Optional[str]

    class Config:
        orm_mode = True
