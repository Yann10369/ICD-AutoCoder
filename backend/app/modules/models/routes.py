"""模型管理API路由"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from pydantic import BaseModel

from app.modules.models.model_manager import model_manager
from app.modules.model_configs.model_config_service import model_config_service
from app.modules.auth.schemas import TokenData
from app.modules.auth.security import require_permission
from app.core.logger import logger

router = APIRouter()


class ModelInfo(BaseModel):
    """模型信息"""
    name: str
    category: str  # small/large/graph
    status: str
    available: bool


class ModelListResponse(BaseModel):
    """模型列表响应"""
    models: List[ModelInfo]
    total: int


@router.get("/", response_model=ModelListResponse)
async def list_models(
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """获取模型列表"""
    try:
        # 从 model_configs.json 获取所有模型配置
        configs = model_config_service.list_configs()
        
        models_info = []
        for cfg in configs:
            if cfg.name:  # 只返回有名称的模型
                models_info.append(ModelInfo(
                    name=cfg.name,
                    category=cfg.category or "small",
                    status=cfg.status or "unknown",
                    available=(cfg.status == "valid")
                ))
        
        return ModelListResponse(
            models=models_info,
            total=len(models_info)
        )
    
    except Exception as e:
        logger.error(f"获取模型列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取模型列表失败: {str(e)}")


@router.get("/{model_name}")
async def get_model_info(
    model_name: str,
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """获取特定模型的详细信息"""
    try:
        # 从 model_configs.json 查找模型
        configs = model_config_service.list_configs()
        model_config = None
        for cfg in configs:
            if cfg.name == model_name:
                model_config = cfg
                break
        
        if not model_config:
            raise HTTPException(
                status_code=404,
                detail=f"模型 {model_name} 不存在"
            )
        
        # 根据模型类型生成描述
        if model_config.category == "small":
            description = f"{model_name} 是一个小模型，用于ICD编码预测"
        elif model_config.category == "large":
            description = f"{model_name} 是一个大语言模型，用于生成ICD编码预测的解释"
        else:
            description = f"{model_name} 是一个用于ICD编码预测的模型"
        
        return {
            "name": model_config.name,
            "category": model_config.category or "small",
            "status": model_config.status or "unknown",
            "available": (model_config.status == "valid"),
            "description": description,
            "dockerImage": model_config.dockerImage if model_config.category == "small" else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取模型信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取模型信息失败: {str(e)}")
