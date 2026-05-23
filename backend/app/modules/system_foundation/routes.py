"""
系统基础能力模块路由
- 字典版本管理
- 术语映射管理
- 溯源日志查询
- RLHF数据导出
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from pydantic import BaseModel

from .dictionary import DictionaryManager, DictionaryVersion
from .audit_trail import AuditTrailService, AuditActionType
from app.modules.auth.security import require_permission
from app.modules.auth.schemas import TokenData

router = APIRouter()

# 初始化服务
dict_manager = DictionaryManager()
audit_service = AuditTrailService()


# ==================== Schema ====================
class TermMappingRequest(BaseModel):
    clinical_term: str
    standard_code: str
    standard_description: str
    user_id: int


class AuditLogRequest(BaseModel):
    case_id: str = "UNKNOWN"
    user_id: int = 0
    action_type: str
    action_details: Dict = {}
    reason: str = None


# ==================== 字典版本管理 ====================
@router.get("/dictionary/versions", summary="获取所有可用字典版本")
async def get_dictionary_versions(_: TokenData = Depends(require_permission("graph", "read"))):
    return {
        "versions": [
            {"value": v.value, "label": v.name}
            for v in DictionaryVersion
        ],
        "active_version": dict_manager.active_version
    }


@router.post("/dictionary/switch-version", summary="切换字典版本")
async def switch_dictionary_version(
    version: str,
    _: TokenData = Depends(require_permission("system", "config"))
):
    """切换字典版本 - 仅管理员可操作"""
    result = dict_manager.switch_version(version)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/dictionary/map-term", summary="术语映射查询")
async def map_term_to_code(term: str, _: TokenData = Depends(require_permission("graph", "read"))):
    return dict_manager.map_term_to_code(term)


@router.post("/dictionary/mappings", summary="添加术语映射")
async def add_term_mapping(
    request: TermMappingRequest,
    _: TokenData = Depends(require_permission("system", "config"))
):
    """添加术语映射 - 仅管理员可操作"""
    result = dict_manager.add_mapping(
        request.clinical_term,
        request.standard_code,
        request.standard_description,
        request.user_id
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/dictionary/stats", summary="获取映射统计")
async def get_mapping_stats(_: TokenData = Depends(require_permission("graph", "read"))):
    return dict_manager.get_mapping_stats()


@router.post("/dictionary/normalize-text", summary="病历文本术语标准化")
async def normalize_case_text(text: str, _: TokenData = Depends(require_permission("predict", "read"))):
    return {"normalized_text": dict_manager.normalize_case_text(text)}


# ==================== 溯源日志 ====================
@router.get("/audit/action-types", summary="获取所有操作类型")
async def get_audit_action_types(_: TokenData = Depends(require_permission("audit", "read"))):
    return {
        "types": [
            {"value": t.value, "label": t.name}
            for t in AuditActionType
        ]
    }


@router.post("/audit/log", summary="记录操作日志")
async def log_audit_action(
    request: AuditLogRequest,
    _: TokenData = Depends(require_permission("audit", "read"))
):
    """记录操作日志 - 审核员和管理员可写入"""
    log_id = audit_service.log_action(
        request.case_id,
        request.user_id,
        request.action_type,
        request.action_details,
        request.reason
    )
    return {"log_id": log_id, "success": True}


@router.get("/audit/case/{case_id}", summary="获取单病历操作轨迹")
async def get_case_audit_trail(
    case_id: str,
    limit: int = 100,
    _: TokenData = Depends(require_permission("audit", "read"))
):
    return {
        "case_id": case_id,
        "logs": audit_service.get_case_audit_trail(case_id, limit)
    }


@router.get("/audit/coder/{coder_id}/performance", summary="获取编码员工作指标")
async def get_coder_performance(
    coder_id: int,
    days: int = 30,
    _: TokenData = Depends(require_permission("audit", "read"))
):
    return audit_service.calculate_coder_performance(coder_id, days)


# ==================== RLHF数据导出 ====================
@router.get("/rlhf/export-samples", summary="导出RLHF训练样本")
async def export_rlhf_samples(
    coder_id: int = None,
    days: int = 30,
    min_quality_score: float = 0.5,
    sample_type: str = None,
    limit: int = 1000,
    format: str = "json",
    _: TokenData = Depends(require_permission("system", "config"))
):
    """导出高价值RLHF训练样本 - 仅管理员可导出敏感数据"""
    from .rlhf_exporter import rlhf_exporter

    sample_types = [sample_type] if sample_type else None
    result = rlhf_exporter.export_samples(
        coder_id=coder_id,
        days=days,
        min_quality_score=min_quality_score,
        sample_types=sample_types,
        limit=limit,
        format=format
    )
    return result


@router.get("/rlhf/queue-stats", summary="获取RLHF样本队列统计")
async def get_rlhf_queue_stats(_: TokenData = Depends(require_permission("audit", "read"))):
    """获取RLHF训练样本队列统计信息"""
    from .rlhf_exporter import rlhf_exporter
    return rlhf_exporter.get_sample_queue_stats()


@router.get("/rlhf/coder-grade/{coder_id}", summary="获取编码员训练等级")
async def get_coder_training_grade(
    coder_id: int,
    days: int = 30,
    _: TokenData = Depends(require_permission("audit", "read"))
):
    """获取编码员的训练等级（用于模型个性化）"""
    from .rlhf_exporter import rlhf_exporter
    return rlhf_exporter.get_coder_training_grade(coder_id, days)


@router.get("/rlhf/sample-types", summary="获取所有样本类型")
async def get_sample_types(_: TokenData = Depends(require_permission("audit", "read"))):
    """获取所有RLHF样本类型"""
    from .rlhf_exporter import SampleType
    return {
        "types": [
            {"value": t.value, "label": t.name}
            for t in SampleType
        ]
    }
