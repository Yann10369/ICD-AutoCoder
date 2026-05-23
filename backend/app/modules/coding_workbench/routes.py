"""
编码工作台 API 路由
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime
import logging

from .coding_pool import CodingPoolManager
from .coding_validator import CodingValidator
from app.shared.storage.repositories.coding_pool_repo import coding_pool_repo
from app.modules.auth.security import require_permission
from app.modules.auth.schemas import TokenData

router = APIRouter()
logger = logging.getLogger(__name__)

# 内存缓存（用于减少数据库查询，第一次从数据库加载后缓存）
_pool_cache: Dict[str, CodingPoolManager] = {}


class CodeItemRequest(BaseModel):
    """添加编码请求"""
    code: str
    description: str
    confidence: Optional[float] = 0.8
    evidence: Optional[Dict] = None
    source: Optional[str] = "ai_suggested"


class ReorderRequest(BaseModel):
    """排序请求"""
    category: str  # secondary_dx / procedures
    old_index: int
    new_index: int


class RemoveCodeRequest(BaseModel):
    """删除编码请求"""
    category: str  # principal_dx / secondary_dx / procedures
    index: Optional[int] = None


class BatchImportRequest(BaseModel):
    """批量导入预测结果"""
    predictions: List[Dict]


@router.post("/pool/{case_id}/principal-dx")
async def set_principal_dx(
    case_id: str,
    request: CodeItemRequest,
    _: TokenData = Depends(require_permission("cases", "update"))
):
    """设置主要诊断"""
    try:
        # 从缓存或数据库获取编码池
        pool = _pool_cache.get(case_id)
        if not pool:
            db_data = coding_pool_repo.get_by_id(case_id)
            if db_data:
                # 从数据库恢复编码池
                pool = CodingPoolManager(case_id)
                _pool_cache[case_id] = pool
            else:
                pool = CodingPoolManager(case_id)

        result = pool.set_principal_dx(
            code=request.code,
            description=request.description,
            evidence=request.evidence,
            source=request.source
        )
        _pool_cache[case_id] = pool

        # 持久化到数据库
        _persist_pool(case_id, pool)

        return {
            "success": True,
            "data": pool.get_full_pool(),
            "warnings": result.get("warnings", []),
            "need_confirm": result.get("need_confirm", False)
        }
    except Exception as e:
        logger.error(f"设置主诊失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pool/{case_id}/secondary-dx")
async def add_secondary_dx(
    case_id: str,
    request: CodeItemRequest,
    _: TokenData = Depends(require_permission("cases", "update"))
):
    """添加其他诊断"""
    try:
        pool = _get_pool(case_id)
        result = pool.add_secondary_dx(
            code=request.code,
            description=request.description,
            evidence=request.evidence,
            source=request.source
        )
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        _persist_pool(case_id, pool)

        return {"success": True, "data": pool.get_full_pool(), "index": result["index"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加副诊失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pool/{case_id}/procedures")
async def add_procedure(
    case_id: str,
    request: CodeItemRequest,
    _: TokenData = Depends(require_permission("cases", "update"))
):
    """添加手术操作"""
    try:
        pool = _get_pool(case_id)
        result = pool.add_procedure(
            code=request.code,
            description=request.description,
            evidence=request.evidence,
            source=request.source
        )
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        _persist_pool(case_id, pool)

        return {"success": True, "data": pool.get_full_pool(), "index": result["index"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加手术失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/pool/{case_id}/reorder")
async def reorder_codes(
    case_id: str,
    request: ReorderRequest,
    _: TokenData = Depends(require_permission("cases", "update"))
):
    """拖拽排序"""
    try:
        pool = _get_pool(case_id)
        if not pool:
            raise HTTPException(status_code=404, detail="编码池不存在")

        result = pool.reorder(request.category, request.old_index, request.new_index)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        _persist_pool(case_id, pool)

        return {"success": True, "data": pool.get_full_pool()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"排序失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def _get_pool(case_id: str) -> CodingPoolManager:
    """获取编码池（从缓存或数据库）"""
    pool = _pool_cache.get(case_id)
    if not pool:
        db_data = coding_pool_repo.get_by_id(case_id)
        if db_data:
            pool = CodingPoolManager(case_id)
            _pool_cache[case_id] = pool
        else:
            pool = CodingPoolManager(case_id)
            _pool_cache[case_id] = pool
    return pool


def _persist_pool(case_id: str, pool: CodingPoolManager) -> None:
    """持久化编码池到数据库"""
    try:
        pool_data = pool.get_full_pool()
        pool_data['last_modified'] = datetime.now()
        coding_pool_repo.save(pool_data)
    except Exception as e:
        logger.error(f"持久化编码池失败: {e}")


@router.put("/pool/{case_id}/promote-principal/{index}")
async def promote_to_principal(
    case_id: str,
    index: int,
    _: TokenData = Depends(require_permission("cases", "update"))
):
    """将副诊提升为主诊"""
    try:
        pool = _get_pool(case_id)
        result = pool.promote_to_principal(index)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        _persist_pool(case_id, pool)

        return {
            "success": True,
            "data": pool.get_full_pool(),
            "warnings": result.get("warnings", []),
            "old_principal_downgraded": result.get("old_principal_downgraded")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"提升主诊失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/pool/{case_id}/code")
async def remove_code(
    case_id: str,
    request: RemoveCodeRequest,
    _: TokenData = Depends(require_permission("cases", "update"))
):
    """删除编码"""
    try:
        pool = _get_pool(case_id)
        result = pool.remove_code(request.category, request.index or 0)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        _persist_pool(case_id, pool)

        return {"success": True, "data": pool.get_full_pool()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除编码失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pool/{case_id}/batch-import")
async def batch_import_codes(
    case_id: str,
    request: BatchImportRequest,
    _: TokenData = Depends(require_permission("cases", "update"))
):
    """批量导入AI预测结果"""
    try:
        pool = _get_pool(case_id)
        result = pool.batch_import_codes(request.predictions)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        _persist_pool(case_id, pool)

        return {
            "success": True,
            "data": pool.get_full_pool(),
            "imported": result["imported"],
            "as_principal": result["as_principal"],
            "as_secondary": result["as_secondary"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批量导入失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pool/{case_id}")
async def get_coding_pool(
    case_id: str,
    _: TokenData = Depends(require_permission("cases", "read"))
):
    """获取完整编码池"""
    try:
        pool = _get_pool(case_id)
        return {"success": True, "data": pool.get_full_pool()}
    except Exception as e:
        logger.error(f"获取编码池失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pool/{case_id}/summary")
async def get_pool_summary(
    case_id: str,
    _: TokenData = Depends(require_permission("cases", "read"))
):
    """获取编码池摘要"""
    try:
        pool = _get_pool(case_id)
        return {"success": True, "data": pool.get_pool_summary()}
    except Exception as e:
        logger.error(f"获取编码池摘要失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pool/{case_id}/validate")
async def validate_coding_pool(
    case_id: str,
    _: TokenData = Depends(require_permission("cases", "read"))
):
    """编码质量校验"""
    try:
        pool = _get_pool(case_id)
        validator = CodingValidator()
        result = validator.validate_all(pool.get_full_pool())

        return {
            "success": True,
            "can_submit": validator.quick_check(pool.get_full_pool()),
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"编码校验失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 特殊编码检测 ====================
@router.post("/special-coding/detect/{case_id}")
async def detect_special_coding(
    case_id: str,
    request: dict,
    _: TokenData = Depends(require_permission("cases", "update"))
):
    """检测需要特殊处理的编码（肿瘤M码、外伤、星剑号等）"""
    try:
        from .special_coding import SpecialCodingDetector
        detector = SpecialCodingDetector()

        pool = _get_pool(case_id)
        full_pool = pool.get_full_pool()

        # 提取所有编码
        all_codes = []
        if full_pool.get("principal_dx"):
            all_codes.append(full_pool["principal_dx"]["code"])
        all_codes.extend([item["code"] for item in full_pool.get("secondary_dx", [])])
        all_codes.extend([item["code"] for item in full_pool.get("procedures", [])])

        # 检测结果
        result = detector.detect_all(all_codes, request.get("caseText", ""))

        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"特殊编码检测失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DRG优化建议 ====================
class DrgSuggestionRequest(BaseModel):
    caseText: Optional[str] = ""
    currentDrg: Optional[str] = None


@router.post("/drg-suggestions/{case_id}")
async def get_drg_suggestions(
    case_id: str,
    request: DrgSuggestionRequest,
    _: TokenData = Depends(require_permission("cases", "read"))
):
    """获取DRG优化建议"""
    try:
        from .drg_linkage import DrgLinkageEngine

        pool = _get_pool(case_id)
        drg_engine = DrgLinkageEngine(pool)

        # 生成建议
        suggestions = drg_engine.generate_optimization_suggestions(case_id, pool.get_full_pool(), request.caseText)

        return {
            "success": True,
            "data": {
                "currentDrg": "FK29",  # 模拟当前DRG
                "currentWeight": 2.85,
                "estimatedPayment": 42750,
                "suggestions": suggestions
            }
        }
    except Exception as e:
        logger.error(f"DRG建议生成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/drg-suggestions/{case_id}/apply")
async def apply_drg_suggestion(
    case_id: str,
    request: dict,
    _: TokenData = Depends(require_permission("cases", "update"))
):
    """应用DRG建议"""
    try:
        suggestion_id = request.get("suggestion_id")
        if not suggestion_id:
            raise HTTPException(status_code=400, detail="缺少suggestion_id")

        pool = _get_pool(case_id)
        if not pool:
            raise HTTPException(status_code=404, detail="编码池不存在")

        # 模拟应用成功
        return {"success": True, "applied": suggestion_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"应用DRG建议失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
