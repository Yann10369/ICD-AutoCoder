"""模型配置管理 API"""
from typing import List

from fastapi import APIRouter, HTTPException, Depends

from app.modules.model_configs.model_config_service import (
    ModelConfig,
    ModelConfigCreate,
    ModelConfigUpdate,
    model_config_service,
)
from app.modules.auth.schemas import TokenData
from app.modules.auth.security import require_permission

router = APIRouter()


@router.get("/", response_model=List[ModelConfig])
async def list_configs(
    _: TokenData = Depends(require_permission("models", "read")),
):
    """获取全部模型配置"""
    configs = model_config_service.list_configs()
    from app.core.logger import logger
    logger.info(f"返回模型配置列表，共 {len(configs)} 个配置")
    return configs


@router.get("/{config_id}", response_model=ModelConfig)
async def get_config(
    config_id: str,
    _: TokenData = Depends(require_permission("models", "read")),
):
    """获取单条配置"""
    cfg = model_config_service.get_config(config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="配置不存在")
    return cfg


@router.post("/", response_model=ModelConfig, status_code=201)
async def create_config(
    payload: ModelConfigCreate,
    _: TokenData = Depends(require_permission("models", "create")),
):
    """创建配置"""
    try:
        return model_config_service.create_config(payload)
    except Exception as exc:  # 捕获字段校验外的异常
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/{config_id}", response_model=ModelConfig)
async def update_config(
    config_id: str,
    payload: ModelConfigUpdate,
    _: TokenData = Depends(require_permission("models", "update")),
):
    """更新配置"""
    cfg = model_config_service.update_config(config_id, payload)
    if not cfg:
        raise HTTPException(status_code=404, detail="配置不存在")
    return cfg


@router.delete("/{config_id}")
async def delete_config(
    config_id: str,
    _: TokenData = Depends(require_permission("models", "delete")),
):
    """删除配置"""
    deleted = model_config_service.delete_config(config_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="配置不存在或已删除")
    return {"ok": True}


@router.post("/{config_id}/validate")
async def validate_paths(
    config_id: str,
    _: TokenData = Depends(require_permission("models", "read")),
):
    """校验权重与图谱路径格式"""
    cfg = model_config_service.get_config(config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="配置不存在")
    weight_result = model_config_service.validate_weights_path(cfg.weightsPath)
    graph_result = model_config_service.validate_graph_uri(cfg.graphUri)
    overall_ok = weight_result.get("ok") and graph_result.get("ok")
    return {
        "ok": overall_ok,
        "weights": weight_result,
        "graph": graph_result,
    }


@router.post("/{config_id}/test-graph")
async def test_graph_connection(
    config_id: str,
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """测试图谱连接（占位，当前仅格式校验）"""
    cfg = model_config_service.get_config(config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="配置不存在")
    result = model_config_service.test_graph_uri(cfg.graphUri)
    return result


@router.post("/{config_id}/toggle-enabled", response_model=ModelConfig)
async def toggle_enabled(
    config_id: str,
    _: TokenData = Depends(require_permission("models", "update")),
):
    """切换小模型启用/禁用状态"""
    cfg = model_config_service.get_config(config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="配置不存在")

    # 反转当前启用状态
    current_enabled = cfg.enabled if cfg.enabled is not None else True
    update_payload = ModelConfigUpdate(enabled=not current_enabled)
    updated = model_config_service.update_config(config_id, update_payload)
    if not updated:
        raise HTTPException(status_code=500, detail="更新失败")
    return updated
