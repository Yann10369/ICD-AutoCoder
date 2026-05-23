"""
医学病例翻译 API 路由
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import logging

from . import MedicalTranslator
from app.modules.auth.schemas import TokenData
from app.modules.auth.security import require_permission

router = APIRouter()
logger = logging.getLogger(__name__)

# 全局翻译器实例
_translator: Optional[MedicalTranslator] = None


def get_translator() -> MedicalTranslator:
    """获取翻译器实例"""
    global _translator
    if _translator is None:
        _translator = MedicalTranslator()
    return _translator


class TranslationRequest(BaseModel):
    """翻译请求"""
    text: str
    case_type: Optional[str] = "general"  # cardiovascular/respiratory/neurological/gastrointestinal/endocrine/musculoskeletal/oncology/trauma/general


class BatchTranslationRequest(BaseModel):
    """批量翻译请求"""
    texts: list
    case_type: Optional[str] = "general"


@router.post("/translate", summary="翻译单个病例")
async def translate_case(
    request: TranslationRequest,
    _: TokenData = Depends(require_permission("predict", "read")),
):
    """
    将中文病例翻译为英文

    Args:
        request.text: 中文病例文本
        request.case_type: 病例类型（可选）

    Returns:
        翻译结果
    """
    try:
        translator = get_translator()
        result = translator.translate(request.text, request.case_type or "general")

        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "翻译失败"))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"翻译病例失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translate/batch", summary="批量翻译病例")
async def translate_batch(
    request: BatchTranslationRequest,
    _: TokenData = Depends(require_permission("predict", "read")),
):
    """
    批量翻译多个病例

    Args:
        request.texts: 中文病例文本列表
        request.case_type: 病例类型（可选）

    Returns:
        批量翻译结果
    """
    try:
        translator = get_translator()
        results = []

        for i, text in enumerate(request.texts):
            try:
                result = translator.translate(text, request.case_type or "general")
                results.append({
                    "index": i,
                    **result
                })
            except Exception as e:
                results.append({
                    "index": i,
                    "success": False,
                    "error": str(e),
                    "english_text": None
                })

        success_count = sum(1 for r in results if r["success"])
        return {
            "success": True,
            "total": len(request.texts),
            "success_count": success_count,
            "failed_count": len(request.texts) - success_count,
            "results": results
        }

    except Exception as e:
        logger.error(f"批量翻译失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/translate/health", summary="翻译服务健康检查")
async def translation_health():
    """检查翻译服务是否可用"""
    try:
        translator = get_translator()
        if translator.client:
            return {
                "success": True,
                "available": True,
                "model": translator.model_name
            }
        else:
            return {
                "success": True,
                "available": False,
                "error": "API Key未配置"
            }
    except Exception as e:
        return {
            "success": True,
            "available": False,
            "error": str(e)
        }