"""PLM-ICD FastAPI预测服务"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
import logging
from model_loader import PLMICDModelLoader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PLM-ICD Model Service",
    version="1.0.0",
    description="PLM-ICD模型预测服务"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局模型加载器
model_loader: PLMICDModelLoader = None


@app.on_event("startup")
async def startup_event():
    """服务启动时加载模型"""
    global model_loader
    try:
        logger.info("开始加载PLM-ICD模型...")
        model_loader = PLMICDModelLoader()
        logger.info("PLM-ICD模型加载完成")
    except Exception as e:
        logger.error(f"模型加载失败: {str(e)}")
        raise


class PredictRequest(BaseModel):
    """预测请求"""
    text: str = Field(..., description="待预测文本")
    top_k: int = Field(10, ge=1, le=100, description="返回前k个结果")
    threshold: float = Field(0.5, ge=0.0, le=1.0, description="概率阈值")


class ICDResult(BaseModel):
    """ICD预测结果"""
    icd_code: str
    probability: float


class PredictResponse(BaseModel):
    """预测响应"""
    results: List[ICDResult]


@app.post("/models/plm-icd/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """
    PLM-ICD模型预测接口
    
    接受待预测文本，返回ICD编码预测结果
    """
    if model_loader is None:
        raise HTTPException(status_code=503, detail="模型未加载")
    
    try:
        predictions = model_loader.predict(
            text=request.text,
            threshold=request.threshold,
        )
        
        if len(predictions)==0:
            logger.warning("Predictions is empty")
        results = [
            ICDResult(
                icd_code=pred['icd_code'],
                probability=pred['probability']
            )
            for pred in predictions
        ]
        
        return PredictResponse(
            results=results,
        )
    except Exception as e:
        logger.error(f"预测失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"预测失败: {str(e)}")


@app.get("/models/plm-icd/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy" if model_loader is not None else "unhealthy",
        "model": "PLM-ICD"
    }


@app.get("/")
async def root():
    """服务信息"""
    return {
        "service": "PLM-ICD Model Service",
        "version": "1.0.0",
        "endpoint": "/models/plm-icd/predict"
    }

