"""Benchmark模型服务 - 支持CAML, DCAN, Fusion, MultiResCNN, TransICD"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import torch
import sys
import os
import numpy as np

sys.path.insert(0, '/app/icd-coding-benchmark')

from anemic.models import CAMLModel, DCANModel, FusionModel, MultiResCNNModel, TransICDModel
from anemic.modules.preprocessors import ClinicalNotePreprocessor
from anemic.utils.configuration import Config
from anemic.utils.mapper import ConfigMapper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Benchmark Models Service",
    version="1.0.0",
    description="Benchmark模型预测服务 (CAML, DCAN, Fusion, MultiResCNN, TransICD)"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS = {}
preprocessor = None
dataset = None
config = None

class PredictRequest(BaseModel):
    text: str = Field(..., description="待预测文本")
    model_name: str = Field("CAML", description="模型名称: CAML, DCAN, Fusion, MultiResCNN, TransICD")
    top_k: int = Field(10, ge=1, le=50, description="返回前k个结果")
    threshold: float = Field(0.5, ge=0.0, le=1.0, description="概率阈值")

class ICDResult(BaseModel):
    icd_code: str
    probability: float

class PredictResponse(BaseModel):
    results: List[ICDResult]
    model_name: str

MODEL_CLASSES = {
    "CAML": CAMLModel,
    "DCAN": DCANModel,
    "Fusion": FusionModel,
    "MultiResCNN": MultiResCNNModel,
    "TransICD": TransICDModel,
}

def load_model_and_data():
    global MODELS, preprocessor, dataset, config
    try:
        config_path = "/app/icd-coding-benchmark/configs/demo/multi_mimic3_50.yml"
        config = Config(path=config_path)

        # 预处理
        preprocessor = ClinicalNotePreprocessor(config.clinical_note_preprocessing)

        # 数据集
        dataset = ConfigMapper.get_object("datasets", config.dataset.name)(config.dataset.params)

        # 加载多个模型
        for model_config in config.models:
            model_name = model_config.model.name
            if model_name in MODEL_CLASSES:
                model = MODEL_CLASSES[model_name](model_config.model.params)

                # 加载权重
                ckpt_saver = ConfigMapper.get_object(
                    "checkpoint_savers", model_config.checkpoint_saver.name
                )(model_config.checkpoint_saver.params)
                best_ckpt = ckpt_saver.get_best_checkpoint()
                if best_ckpt is not None:
                    ckpt_saver.load_ckpt(model, best_ckpt, optimizer=None)

                if torch.cuda.is_available():
                    model.cuda()
                model.eval()
                MODELS[model_name] = model
                logger.info(f"模型 {model_name} 加载完成")

        logger.info(f"共加载 {len(MODELS)} 个Benchmark模型")
    except Exception as e:
        logger.error(f"模型加载失败: {str(e)}")
        raise

@app.on_event("startup")
async def startup_event():
    load_model_and_data()

@app.post("/models/benchmark/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    if not MODELS:
        raise HTTPException(status_code=503, detail="模型未加载")

    model_name = request.model_name
    if model_name not in MODELS:
        raise HTTPException(status_code=400, detail=f"未知模型: {model_name}")

    try:
        model = MODELS[model_name]

        # 预处理
        processed_text = preprocessor(request.text)
        tokens = processed_text.split()
        token_idxs = dataset.encode_tokens(tokens)

        if len(token_idxs) < config.demo.min_input_len:
            raise HTTPException(status_code=400, detail=f"输入文本太短 (最少{config.demo.min_input_len}个词)")

        # 预测
        batch_input = torch.tensor([token_idxs])
        if torch.cuda.is_available():
            batch_input = batch_input.cuda()

        with torch.no_grad():
            batch_output = model(batch_input)

        probs = torch.sigmoid(batch_output[0].cpu()).numpy()
        top_k_preds = np.argsort(probs)[-1 : -(request.top_k + 1) : -1]
        top_k_probs = [probs[p] for p in top_k_preds]
        top_k_codes = dataset.decode_labels(top_k_preds)

        results = [
            ICDResult(icd_code=code, probability=float(prob))
            for code, prob in zip(top_k_codes, top_k_probs)
            if prob >= request.threshold
        ]

        return PredictResponse(results=results, model_name=model_name)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"预测失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"预测失败: {str(e)}")

@app.get("/models/benchmark/health")
async def health_check():
    return {
        "status": "healthy" if MODELS else "unhealthy",
        "model": "Benchmark Models",
        "available_models": list(MODELS.keys())
    }

@app.get("/")
async def root():
    return {
        "service": "Benchmark Models Service",
        "version": "1.0.0",
        "endpoint": "/models/benchmark/predict",
        "supported_models": list(MODEL_CLASSES.keys())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)