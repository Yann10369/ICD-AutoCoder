"""LLM API路由"""
from fastapi import APIRouter, HTTPException, Body
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

from app.services.llm_intergration import llm_integration
from app.core.logger import logger

router = APIRouter()


class VerifyRequest(BaseModel):
    """验证请求模型"""
    case_text: str = Field(..., description="病例文本")
    icd_code: str = Field(..., description="要验证的ICD编码")
    probability: Optional[float] = Field(None, description="预测概率")


class ExplainLLMRequest(BaseModel):
    """LLM解释请求模型"""
    case_text: str = Field(..., description="病例文本")
    icd_code: str = Field(..., description="要解释的ICD编码")
    icd_name: Optional[str] = Field(None, description="ICD编码名称")


@router.post("/verify", response_model=Dict[str, Any])
async def verify_prediction(request: VerifyRequest):
    """验证小模型输出的语义合理性
    
    使用大模型验证预测的ICD编码与病例描述的匹配度
    """
    try:
        result = llm_integration.verify(
            case_text=request.case_text,
            icd_code=request.icd_code,
            probability=request.probability or 0.0
        )
        
        return {
            "success": True,
            "icd_code": request.icd_code,
            "verification": result
        }
    
    except Exception as e:
        logger.error(f"LLM验证失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM验证失败: {str(e)}")


@router.post("/explain", response_model=Dict[str, Any])
async def explain_with_llm(request: ExplainLLMRequest):
    """生成可读的医学解释文本
    
    使用大模型生成自然语言解释，说明为什么病例会被编码为该ICD编码
    """
    try:
        result = llm_integration.explain(
            case_text=request.case_text,
            icd_code=request.icd_code,
            icd_name=request.icd_name
        )
        
        return {
            "success": True,
            "icd_code": request.icd_code,
            "explanation": result
        }
    
    except Exception as e:
        logger.error(f"LLM解释生成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM解释生成失败: {str(e)}")


@router.get("/health")
async def llm_health_check():
    """LLM服务健康检查"""
    try:
        # 简单的健康检查
        return {
            "status": "available",
            "provider": llm_integration.provider,
            "model": llm_integration.model,
            "api_key_configured": bool(llm_integration.api_key)
        }
    
    except Exception as e:
        logger.error(f"LLM健康检查失败: {str(e)}")
        return {
            "status": "unavailable",
            "error": str(e)
        }
