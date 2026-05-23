"""可解释性API路由 - 直接从JSON读取explanation数据"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, Dict, Any
from pathlib import Path
import json

from app.core.config import settings
from app.core.logger import logger
from app.modules.auth.schemas import TokenData
from app.modules.auth.security import require_permission

router = APIRouter()


def load_prediction_data() -> Dict[str, Any]:
    """从icd_hierarchy.json加载预测数据"""
    try:
        icd_hierarchy_path = Path(settings.ICD_HIERARCHY_PATH)
        if not icd_hierarchy_path.exists():
            logger.warning(f"预测数据文件不存在: {icd_hierarchy_path}")
            return {}
        
        with open(icd_hierarchy_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return data
    except Exception as e:
        logger.error(f"加载预测数据失败: {str(e)}")
        return {}


@router.get("/", response_model=Dict[str, Any])
async def get_explanation(
    _: TokenData = Depends(require_permission("predict", "read")),
):
    """获取解释数据 - 直接从JSON读取"""
    try:
        data = load_prediction_data()
        
        if not data:
            return {
                "success": False,
                "message": "暂无预测数据"
            }
        
        # 从predictions中提取explanation
        predictions = data.get('predictions', {})
        explanation = predictions.get('explanation', '')
        
        return {
            "success": True,
            "explanation": explanation,
            "predictions": predictions,
            "metadata": {
                "timestamp": data.get('timestamp', ''),
                "model": data.get('model', ''),
                "top_k": data.get('top_k', 0),
                "threshold": data.get('threshold', 0.0)
            }
        }
    
    except Exception as e:
        logger.error(f"获取解释失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取解释失败: {str(e)}")


@router.get("/attention")
async def explain_attention(
    icd_code: Optional[str] = Query(None, description="ICD编码"),
    _: TokenData = Depends(require_permission("predict", "read")),
):
    """获取注意力解释（从JSON数据中提取）"""
    try:
        data = load_prediction_data()
        
        if not data:
            return {
                "success": False,
                "message": "暂无预测数据",
                "method": "attention",
                "result": None
            }
        
        predictions = data.get('predictions', {})
        icd_predictions = predictions.get('icdPredictions', [])
        
        # 如果指定了icd_code，查找对应的预测
        if icd_code:
            target_pred = None
            for pred in icd_predictions:
                if pred.get('code') == icd_code:
                    target_pred = pred
                    break
            
            if not target_pred:
                return {
                    "success": False,
                    "message": f"未找到ICD编码 {icd_code} 的预测",
                    "method": "attention",
                    "result": None
                }
            
            return {
                "success": True,
                "method": "attention",
                "icd_code": icd_code,
                "result": {
                    "code": target_pred.get('code'),
                    "description": target_pred.get('description'),
                    "probability": target_pred.get('probability'),
                    "explanation": f"ICD编码 {icd_code} 的预测概率为 {target_pred.get('probability', 0):.2%}"
                }
            }
        
        # 返回所有预测结果
        return {
            "success": True,
            "method": "attention",
            "result": {
                "predictions": icd_predictions,
                "explanation": predictions.get('explanation', '')
            }
        }
    
    except Exception as e:
        logger.error(f"注意力解释失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"注意力解释失败: {str(e)}")


@router.get("/graph")
async def explain_graph(
    icd_code: Optional[str] = Query(None, description="ICD编码"),
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """获取知识图谱解释（通过graph_manager获取）"""
    try:
        from app.modules.graph.graph_manager import graph_manager
        
        data = load_prediction_data()
        
        if not data:
            return {
                "success": False,
                "message": "暂无预测数据",
                "method": "graph_path",
                "result": None
            }
        
        # 如果没有指定icd_code，从预测结果中获取第一个
        if not icd_code:
            predictions = data.get('predictions', {})
            icd_predictions = predictions.get('icdPredictions', [])
            if icd_predictions:
                icd_code = icd_predictions[0].get('code')
        
        if not icd_code:
            return {
                "success": False,
                "message": "未指定ICD编码且预测结果为空",
                "method": "graph_path",
                "result": None
            }
        
        # 使用graph_manager获取图数据
        result = graph_manager.explain_icd_path(icd_code)
        
        return {
            "success": True,
            "method": "graph_path",
            "icd_code": icd_code,
            "result": result
        }
    
    except Exception as e:
        logger.error(f"图谱解释失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"图谱解释失败: {str(e)}")
