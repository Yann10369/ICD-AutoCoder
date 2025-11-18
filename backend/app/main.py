from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import predict, graph, explain, llm, models, performance
from app.core.config import settings
from app.core.logger import logger

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="智能ICD自动编码前后端交互系统"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该指定具体的前端地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(predict.router, prefix="/predict", tags=["Predict"])
app.include_router(graph.router, prefix="/graph", tags=["Graph"])
app.include_router(llm.router, prefix="/llm", tags=["LLM"])
app.include_router(models.router, prefix="/models", tags=["Models"])
app.include_router(explain.router, prefix="/explain", tags=["Explain"])
app.include_router(performance.router, prefix="/performance", tags=["Performance"])


@app.get("/")
def root():
    """根路径"""
    return {
        "message": "ICD Auto Coder Backend API",
        "version": settings.API_VERSION,
        "docs": "/docs",
        "endpoints": {
            "predict": "/predict",
            "models": "/models",
            "graph": "/graph",
            "explain": "/explain",
            "llm": "/llm"
        }
    }


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    logger.info("ICD Auto Coder Backend 启动中...")
    logger.info(f"API版本: {settings.API_VERSION}")
    logger.info(f"可用模型: {settings.AVAILABLE_MODELS}")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    logger.info("ICD Auto Coder Backend 关闭中...")
