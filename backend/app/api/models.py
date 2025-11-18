"""模型管理API路由（简化版，仅用于测试）"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.services.model_manager import model_manager
from app.core.logger import logger

router = APIRouter()


class ModelInfo(BaseModel):
    """模型信息"""
    name: str
    available: bool
    current: bool
    type: str = "small_model"


class ModelListResponse(BaseModel):
    """模型列表响应"""
    models: List[ModelInfo]
    current_model: str
    total: int


class SwitchModelRequest(BaseModel):
    """切换模型请求"""
    model_name: str = Field(..., description="要切换到的模型名称")


@router.get("/", response_model=ModelListResponse)
async def list_models():
    """获取模型列表与状态"""
    try:
        available_models = model_manager.get_available_models()
        current_model = model_manager.current_model
        
        models_info = []
        for model_name in available_models:
            models_info.append(ModelInfo(
                name=model_name,
                available=True,
                current=(model_name == current_model),
                type="small_model"
            ))
        
        return ModelListResponse(
            models=models_info,
            current_model=current_model,
            total=len(models_info)
        )
    
    except Exception as e:
        logger.error(f"获取模型列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取模型列表失败: {str(e)}")


@router.post("/switch")
async def switch_model(request: SwitchModelRequest):
    """切换当前使用的模型"""
    try:
        success = model_manager.set_current_model(request.model_name)
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"模型 {request.model_name} 不存在或不可用"
            )
        
        return {
            "success": True,
            "message": f"已切换到模型: {request.model_name}",
            "current_model": model_manager.current_model
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"切换模型失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"切换模型失败: {str(e)}")


@router.get("/{model_name}")
async def get_model_info(model_name: str):
    """获取特定模型的详细信息"""
    try:
        available_models = model_manager.get_available_models()
        
        if model_name not in available_models:
            raise HTTPException(
                status_code=404,
                detail=f"模型 {model_name} 不存在"
            )
        
        return {
            "name": model_name,
            "available": True,
            "current": (model_name == model_manager.current_model),
            "type": "small_model",
            "description": f"{model_name} 是一个用于ICD编码预测的小模型（测试模式）"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取模型信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取模型信息失败: {str(e)}")
