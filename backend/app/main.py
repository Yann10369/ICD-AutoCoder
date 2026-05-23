from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.modules.predict import routes as predict
from app.modules.graph import routes as graph
from app.modules.explain import routes as explain
from app.modules.models import routes as models
from app.modules.performance import routes as performance
from app.modules.model_configs import routes as model_configs
from app.modules.workflow import routes as workflow
from app.modules.auth import routes as auth
# 新增模块
from app.modules.coding_workbench import routes as coding_workbench
from app.modules.case_flow_management import routes as case_flow_management
from app.modules.system_foundation import routes as system_foundation
from app.modules.translation import routes as translation
from app.core.config import settings
from app.core.logger import logger
from app.core.exceptions import AppBaseException
from app.shared.schemas.response import APIResponse

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="智能ICD自动编码前后端交互系统"
)

# 配置CORS - 仅允许可信 origins
ALLOWED_ORIGINS = settings.CORS_ORIGINS.split(',') if hasattr(settings, 'CORS_ORIGINS') and settings.CORS_ORIGINS else ["http://localhost:8080"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局异常处理
@app.exception_handler(AppBaseException)
async def app_exception_handler(request: Request, exc: AppBaseException):
    """处理应用自定义异常"""
    logger.warning(f"应用异常: {exc.message} (code={exc.code})")
    response = APIResponse.error(message=exc.message, code=exc.code)
    return JSONResponse(
        status_code=exc.code,
        content=response.dict(),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """处理未捕获的异常"""
    import traceback
    logger.error(f"未捕获异常: {str(exc)}\n{traceback.format_exc()}", exc_info=True)
    response = APIResponse.error(message=str(exc), code=500)
    return JSONResponse(
        status_code=500,
        content=response.dict(),
    )

# 注册路由 - 统一添加 /api 前缀
app.include_router(predict.router, prefix="/api/predict", tags=["Predict"])
app.include_router(graph.router, prefix="/api/graph", tags=["Graph"])
app.include_router(models.router, prefix="/api/models", tags=["Models"])
app.include_router(explain.router, prefix="/api/explain", tags=["Explain"])
app.include_router(performance.router, prefix="/api/performance", tags=["Performance"])
app.include_router(model_configs.router, prefix="/api/model-configs", tags=["ModelConfigs"])
app.include_router(workflow.router, prefix="/api/workflow", tags=["Workflow"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# 新增模块路由
app.include_router(coding_workbench.router, prefix="/api/coding-workbench", tags=["编码工作台"])
app.include_router(case_flow_management.router, prefix="/api/case-flow", tags=["病历流程管理"])
app.include_router(system_foundation.router, prefix="/api/system", tags=["系统基础能力"])
app.include_router(translation.router, prefix="/api/translation", tags=["病例翻译"])


@app.get("/")
@app.get("/api/")
def root():
    """根路径"""
    return {
        "message": "ICD Auto Coder Backend API",
        "version": settings.API_VERSION,
        "build_time": settings.BUILD_TIME,
        "docs": "/docs",
        "endpoints": {
            "predict": "/api/predict",
            "models": "/api/models",
            "graph": "/api/graph",
            "explain": "/api/explain",
            "model_configs": "/api/model-configs",
            "workflow": "/api/workflow",
        }
    }


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    logger.info("ICD Auto Coder Backend 启动中...")
    logger.info(f"API版本: {settings.API_VERSION}")
    # 从 model_configs.json 读取模型列表
    from app.modules.model_configs.model_config_service import model_config_service
    configs = model_config_service.list_configs()
    model_names = [cfg.name for cfg in configs if cfg.name]
    logger.info(f"已加载模型配置: {model_names}")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    logger.info("ICD Auto Coder Backend 关闭中...")
