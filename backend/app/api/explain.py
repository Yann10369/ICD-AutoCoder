"""可解释性API路由"""
from fastapi import APIRouter, HTTPException, Body
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

from app.services.preprocessing import preprocessor
from app.services.explainer import explainer
from app.core.logger import logger

router = APIRouter()


class ExplainRequest(BaseModel):
    """解释请求模型"""
    text: str = Field(..., description="病例文本")
    icd_code: str = Field(..., description="要解释的ICD编码")
    probability: Optional[float] = Field(None, description="预测概率")
    use_attention: Optional[bool] = Field(True, description="是否使用注意力机制解释")
    use_graph: Optional[bool] = Field(True, description="是否使用知识图谱路径解释")


@router.post("/", response_model=Dict[str, Any])
async def explain_prediction(request: ExplainRequest):

    try:
        # 1. 预处理文本
        preprocessed = preprocessor.preprocess(request.text)
        
        # 2. 生成综合解释
        explanation = explainer.generate_comprehensive_explanation(
            text=request.text,
            preprocessed=preprocessed,
            icd_code=request.icd_code,
            probability=request.probability or 0.0,
            use_attention=request.use_attention,
            use_graph=request.use_graph
        )
        
        return {
            "success": True,
            "icd_code": request.icd_code,
            "explanation": explanation
        }
    
    except Exception as e:
        logger.error(f"生成解释失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"生成解释失败: {str(e)}")


@router.get("/attention")
async def explain_attention(
    icd_code: str,
    text: str
):
    """使用注意力机制解释预测结果"""
    try:
        preprocessed = preprocessor.preprocess(text)
        
        result = explainer.explain_with_gradients(
            text=text,
            tokens=preprocessed.get('tokens', []),
            icd_code=icd_code
        )
        
        return {
            "success": True,
            "method": "attention",
            "result": result
        }
    
    except Exception as e:
        logger.error(f"注意力解释失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"注意力解释失败: {str(e)}")


@router.get("/graph")
async def explain_graph(
    icd_code: str,
    text: Optional[str] = None
):
    """使用知识图谱路径解释预测结果"""
    try:
        entities = {}
        if text:
            preprocessed = preprocessor.preprocess(text)
            entities = preprocessed.get('entities', {})
        
        result = explainer.explain_with_graph_path(
            icd_code=icd_code,
            case_entities=entities
        )
        
        return {
            "success": True,
            "method": "graph_path",
            "result": result
        }
    
    except Exception as e:
        logger.error(f"图谱解释失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"图谱解释失败: {str(e)}")
