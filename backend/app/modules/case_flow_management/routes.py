"""
病历流程管理 API 路由
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
import logging
from datetime import datetime

from app.modules.auth.security import get_current_user, require_permission
from app.modules.auth.schemas import TokenData, UserRole
from app.modules.auth import user_storage
from app.services.email_service import email_service
from .worklist import WorklistManager
from app.shared.storage.repositories.worklist_repo import worklist_repo
from app.modules.auth.user_storage import get_user_by_id

router = APIRouter()
logger = logging.getLogger(__name__)

# 全局工作队列管理器实例
worklist_manager = WorklistManager()


def _in_quiet_hours(notif_settings: dict) -> bool:
    """检查当前时间是否在免打扰时段内"""
    try:
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        start = notif_settings.get("quiet_hours_start", "22:00")
        end = notif_settings.get("quiet_hours_end", "08:00")
        # 简单判断：如果开始时间 > 结束时间（跨午夜）
        if start > end:
            # 跨午夜的情况，例如 22:00 - 08:00
            return current_time >= start or current_time <= end
        else:
            # 同一天的情况
            return start <= current_time <= end
    except Exception:
        return False


@router.get("/worklist")
async def get_worklist(
    status: str = Query("all", description="状态筛选"),
    priority: str = Query("all", description="优先级筛选"),
    department: str = Query("all", description="科室筛选"),
    assigned_only: bool = Query(False, description="只看分配给我的"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    user_id: int = Query(1, description="当前用户ID"),
    user_role: str = Query("coder", description="用户角色")
):
    """获取工作队列"""
    try:
        result = worklist_manager.get_worklist(
            user_id=user_id,
            user_role=user_role,
            status_filter=status,
            priority_filter=priority,
            department_filter=department,
            assigned_only=assigned_only,
            page=page,
            page_size=page_size
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"获取工作队列失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/worklist/summary")
async def get_worklist_summary(
    user_id: int = Query(1, description="当前用户ID"),
    user_role: str = Query("coder", description="用户角色")
):
    """获取队列摘要统计"""
    try:
        result = worklist_manager.get_worklist(
            user_id=user_id,
            user_role=user_role,
            status_filter="all",
            priority_filter="all",
            department_filter="all",
            assigned_only=False,
            page=1,
            page_size=1000
        )
        return {"success": True, "data": result["summary"]}
    except Exception as e:
        logger.error(f"获取队列摘要失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/worklist/departments")
async def get_departments():
    """获取科室列表（用于筛选）"""
    try:
        departments = worklist_manager.get_department_list()
        return {"success": True, "data": departments}
    except Exception as e:
        logger.error(f"获取科室列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/worklist/{case_id}/claim")
async def claim_case(
    case_id: str,
    user_id: int = Query(1, description="当前用户ID"),
    user_name: str = Query(None, description="当前用户名称"),
    force: bool = Query(False, description="强制分配（仅管理员可用）"),
    current_user: TokenData = Depends(require_permission("cases", "update")),
):
    """编码员认领/抢单

    - 普通编码员：只能领取未分配或 pending_coding 状态且不属于他人的病例
    - 管理员：可以使用 force=true 强制分配给任意编码员
    """
    try:
        # 判断是否为管理员（管理员可以强制分配）
        is_admin = current_user.role == UserRole.ADMIN if current_user.role else False

        result = worklist_manager.claim_case(
            case_id=case_id,
            coder_id=user_id,
            coder_name=user_name,
            force=force and is_admin  # 只有管理员才能强制分配
        )
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error"))

        # 发送新病例分配通知
        coder = get_user_by_id(str(user_id))
        if coder and coder.get("email"):
            # 检查用户通知设置
            notif_settings = user_storage.get_notification_settings(coder["username"])
            if notif_settings and notif_settings.get("notify_case_assigned", True):
                if notif_settings.get("quiet_hours_enabled"):
                    if _in_quiet_hours(notif_settings):
                        logger.debug(f"免打扰时段，跳过邮件通知: {coder['username']}")
                else:
                    case = worklist_manager.get_case(case_id)
                    email_service.notify_case_assigned(
                        coder_email=coder["email"],
                        coder_name=coder.get("full_name", user_name or coder["username"]),
                        case_id=case_id,
                        patient_name=case.get("patient_name", "未知") if case else "未知"
                    )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"认领病历失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/worklist/{case_id}/release")
async def release_case(
    case_id: str,
    user_id: int = Query(1, description="当前用户ID"),
    _: TokenData = Depends(require_permission("cases", "update")),
):
    """编码员释放病例"""
    try:
        result = worklist_manager.release_case(case_id=case_id, coder_id=user_id)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"释放病历失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/worklist/{case_id}/start-coding")
async def start_coding(
    case_id: str,
    user_id: int = Query(1, description="当前用户ID"),
    _: TokenData = Depends(require_permission("cases", "update")),
):
    """开始编码"""
    try:
        result = worklist_manager.start_coding(
            case_id=case_id,
            coder_id=user_id
        )
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"开始编码失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/worklist/{case_id}/submit-qa")
async def submit_for_qa(
    case_id: str,
    user_id: int = Query(1, description="当前用户ID"),
    _: TokenData = Depends(require_permission("cases", "update")),
):
    """提交质控"""
    try:
        case = worklist_manager.get_case(case_id)
        if not case:
            raise HTTPException(status_code=404, detail="病历不存在")

        from .case_status_machine import CaseStatusMachine
        sm = CaseStatusMachine(case_id, case["status"], "coder", user_id)
        result = sm.transition_to("pending_qa", "编码完成，提交质控")

        if result["success"]:
            # 更新工作队列中的状态到数据库
            try:
                case["status"] = "pending_qa"
                worklist_repo.save(case)
            except Exception as e:
                logger.warning(f"更新病历状态失败: {e}")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"提交质控失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status-options")
async def get_status_options():
    """获取所有状态选项（用于前端下拉框）"""
    try:
        from .case_status_machine import CaseStatusMachine
        options = CaseStatusMachine.get_all_status_info()
        return {"success": True, "data": options}
    except Exception as e:
        logger.error(f"获取状态选项失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/allowed-actions")
async def get_allowed_actions(
    case_id: str,
    user_role: str = Query("coder", description="用户角色")
):
    """获取病历当前状态允许的操作列表"""
    try:
        case = worklist_manager.get_case(case_id)
        if not case:
            raise HTTPException(status_code=404, detail="病历不存在")

        from .case_status_machine import CaseStatusMachine
        sm = CaseStatusMachine(case_id, case["status"], user_role)
        actions = sm.get_allowed_actions()

        return {
            "success": True,
            "data": {
                "current_status": case["status"],
                "current_status_display": sm.get_display_name(),
                "current_status_color": sm.get_status_color(),
                "can_edit_codes": sm.can_edit_codes(),
                "allowed_actions": actions
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取允许操作失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 质控工作流 API ====================

@router.post("/qa/{case_id}/submit", summary="提交质控")
async def submit_for_qa(
    case_id: str,
    user_id: int = Query(1, description="当前用户ID")
):
    """编码员提交病历到质控"""
    try:
        from .qa_workflow import qa_engine
        result = qa_engine.submit_for_qa(case_id, user_id)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"提交质控失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/qa/{case_id}/decision", summary="执行质控决策")
async def perform_qa_decision(
    case_id: str,
    decision: str = Query(..., description="质控决策: approve/reject/force_approve"),
    comment: str = Query("", description="质控意见"),
    force_reason: str = Query(None, description="强行通过原因"),
    qa_officer_id: int = Query(1, description="质控员ID"),
    _: TokenData = Depends(require_permission("audit", "read")),
):
    """质控员执行质控决策（通过/打回/强行通过）"""
    try:
        from .qa_workflow import qa_engine

        result = qa_engine.perform_qa(
            case_id=case_id,
            qa_officer_id=qa_officer_id,
            decision=decision,
            qa_comment=comment,
            force_reason=force_reason
        )
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error"))

        # 根据决策发送邮件通知
        if decision == "reject":
            # 病例被打回，通知编码员
            case = worklist_manager.get_case(case_id)
            if case and case.get("coder_id"):
                coder = get_user_by_id(str(case["coder_id"]))
                if coder and coder.get("email"):
                    # 检查用户通知设置
                    notif_settings = user_storage.get_notification_settings(coder["username"])
                    if notif_settings and notif_settings.get("notify_case_rejected", True):
                        if notif_settings.get("quiet_hours_enabled"):
                            if _in_quiet_hours(notif_settings):
                                logger.debug(f"免打扰时段，跳过邮件通知: {coder['username']}")
                        else:
                            email_service.notify_case_rejected(
                                coder_email=coder["email"],
                                coder_name=coder.get("full_name", coder["username"]),
                                case_id=case_id,
                                reason=comment or "质控审核不通过"
                            )
        elif decision == "approve":
            # 病例通过，通知编码员
            case = worklist_manager.get_case(case_id)
            if case and case.get("coder_id"):
                coder = get_user_by_id(str(case["coder_id"]))
                if coder and coder.get("email"):
                    # 检查用户通知设置
                    notif_settings = user_storage.get_notification_settings(coder["username"])
                    if notif_settings and notif_settings.get("notify_case_approved", True):
                        if notif_settings.get("quiet_hours_enabled"):
                            if _in_quiet_hours(notif_settings):
                                logger.debug(f"免打扰时段，跳过邮件通知: {coder['username']}")
                        else:
                            email_service.notify_case_approved(
                                coder_email=coder["email"],
                                coder_name=coder.get("full_name", coder["username"]),
                                case_id=case_id,
                            )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"执行质控决策失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/qa/{case_id}/comparison", summary="获取质控对比视图")
async def get_qa_comparison_view(case_id: str):
    """获取AI推荐 vs 编码员选择的对比视图"""
    try:
        from .qa_workflow import qa_engine
        result = qa_engine.get_qa_comparison_view(case_id)
        return result
    except Exception as e:
        logger.error(f"获取质控对比视图失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/qa/pending/list", summary="获取待质控列表")
async def get_pending_qa_list(
    qa_officer_id: int = Query(None, description="质控员ID"),
    limit: int = Query(50, description="返回数量限制")
):
    """获取待质控的病历列表"""
    try:
        from .qa_workflow import qa_engine
        result = qa_engine.get_qa_pending_list(qa_officer_id, limit)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"获取待质控列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/qa/{case_id}/history", summary="获取质控历史记录")
async def get_qa_history(case_id: str):
    """获取病历的质控历史记录"""
    try:
        from .qa_workflow import qa_engine
        result = qa_engine.get_qa_record_history(case_id)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"获取质控历史记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/qa/statistics", summary="获取质控统计数据")
async def get_qa_statistics(
    qa_officer_id: int = Query(None, description="质控员ID"),
    days: int = Query(30, description="统计天数")
):
    """获取质控统计数据"""
    try:
        from .qa_workflow import qa_engine
        result = qa_engine.get_qa_statistics(qa_officer_id, days)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"获取质控统计数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 最近处理记录 API ====================

@router.get("/recent", summary="获取最近处理记录")
async def get_recent_cases(
    limit: int = Query(10, ge=1, le=50, description="返回数量限制"),
    user_id: int = Query(None, description="筛选特定用户ID")
):
    """获取最近处理的病例记录（用于Dashboard显示）"""
    try:
        from .recent_records import recent_records_service

        # 检查数据库连接是否可用
        from app.core.database import check_db_connection
        if not check_db_connection():
            # 数据库不可用时返回友好提示
            return {
                "success": True,
                "data": [],
                "message": "数据库暂不可用，请稍后重试",
                "use_mock": True
            }

        recent_cases = recent_records_service.get_recent_cases(limit=limit, user_id=user_id)
        return {"success": True, "data": recent_cases}
    except Exception as e:
        logger.error(f"获取最近处理记录失败: {str(e)}")
        # 出错时返回空数组，不影响前端渲染
        return {"success": True, "data": [], "error": str(e)}


@router.get("/recent/{case_id}/history", summary="获取病例操作历史")
async def get_case_history(
    case_id: str,
    limit: int = Query(50, ge=1, le=100, description="返回数量限制")
):
    """获取特定病例的操作历史记录"""
    try:
        from .recent_records import recent_records_service
        history = recent_records_service.get_case_history(case_id, limit=limit)
        return {"success": True, "data": history}
    except Exception as e:
        logger.error(f"获取病例历史失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
