"""BiomedNLP NER FastAPI预测服务 - 用于识别医学命名实体"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import logging
import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BiomedNLP NER Service",
    version="1.0.0",
    description="BiomedNLP PubMedBERT NER模型服务 - 用于识别医学命名实体"
)

# 全局NER模型
ner_pipeline: pipeline = None
MODEL_PATH = "/app/models/BiomedNLP-PubMedBERT"


class NERRequest(BaseModel):
    """NER请求"""
    text: str = Field(..., description="待识别文本")
    aggregation_strategy: str = Field("simple", description="聚合策略: simple, average, first, max")


class Entity(BaseModel):
    """识别出的实体"""
    entity_group: str
    score: float
    word: str
    start: int
    end: int


class NERResponse(BaseModel):
    """NER响应"""
    entities: List[Entity]
    text: str


@app.on_event("startup")
async def startup_event():
    """服务启动时加载模型"""
    global ner_pipeline
    try:
        logger.info("开始加载BiomedNLP NER模型...")
        # 加载tokenizer和模型
        tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
        # 创建NER pipeline
        ner_pipeline = pipeline(
            "ner",
            model=model,
            tokenizer=tokenizer,
            aggregation_strategy="simple",
            device=0 if torch.cuda.is_available() else -1
        )
        logger.info("BiomedNLP NER模型加载完成")
    except Exception as e:
        logger.error(f"模型加载失败: {str(e)}")
        raise


@app.post("/models/ner/predict", response_model=NERResponse)
async def predict(request: NERRequest):
    """NER预测接口"""
    if ner_pipeline is None:
        raise HTTPException(status_code=503, detail="模型未加载")

    try:
        results = ner_pipeline(request.text)
        entities = [
            Entity(
                entity_group=r["entity_group"],
                score=r["score"],
                word=r["word"],
                start=r["start"],
                end=r["end"]
            )
            for r in results
        ]
        return NERResponse(entities=entities, text=request.text)
    except Exception as e:
        logger.error(f"预测失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"预测失败: {str(e)}")


@app.get("/models/ner/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy" if ner_pipeline is not None else "unhealthy",
        "model": "BiomedNLP-PubMedBERT-ner"
    }


@app.get("/")
async def root():
    """服务信息"""
    return {
        "service": "BiomedNLP NER Model Service",
        "version": "1.0.0",
        "endpoint": "/models/ner/predict"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)