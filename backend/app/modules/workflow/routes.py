"""工作流管理 API"""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends

from app.modules.workflow.workflow_storage import workflow_storage
from app.modules.workflow.workflow_engine import WorkflowEngine
from app.modules.auth.schemas import TokenData
from app.modules.auth.security import require_permission
from app.shared.storage import get_model_config_repo, get_age_graph_client

router = APIRouter()


@router.get("/", response_model=List[Dict[str, Any]])
async def list_workflows(
    _: TokenData = Depends(require_permission("workflow", "read")),
):
    """获取全部工作流列表"""
    return workflow_storage.list_workflows()


@router.get("/{workflow_id}", response_model=Dict[str, Any])
async def get_workflow(
    workflow_id: str,
    _: TokenData = Depends(require_permission("workflow", "read")),
):
    """获取单个工作流"""
    workflow = workflow_storage.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流不存在")
    return workflow


@router.post("/", response_model=Dict[str, Any])
async def create_workflow(
    payload: Dict[str, Any],
    _: TokenData = Depends(require_permission("workflow", "create")),
):
    """创建工作流"""
    return workflow_storage.create_workflow(payload)


@router.put("/{workflow_id}", response_model=Dict[str, Any])
async def update_workflow(
    workflow_id: str,
    payload: Dict[str, Any],
    _: TokenData = Depends(require_permission("workflow", "update")),
):
    """更新工作流"""
    workflow = workflow_storage.update_workflow(workflow_id, payload)
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流不存在")
    return workflow


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    _: TokenData = Depends(require_permission("workflow", "delete")),
):
    """删除工作流"""
    deleted = workflow_storage.delete_workflow(workflow_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="工作流不存在")
    return {"ok": True}


@router.post("/execute")
async def execute_workflow(
    payload: Dict[str, Any],
    _: TokenData = Depends(require_permission("workflow", "create")),
):
    """执行工作流"""
    workflow = payload.get("workflow")
    input_data = payload.get("input", {})

    if not workflow:
        raise HTTPException(status_code=400, detail="缺少工作流定义")

    engine = WorkflowEngine()
    try:
        result = engine.execute(workflow, input_data)
        return result
    except Exception as e:
        from app.core.logger import logger
        logger.error(f"工作流执行失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"执行失败: {str(e)}")
