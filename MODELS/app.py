from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import requests
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SAMLL_MODELS", version="1.0.0")

DEFAULT_BASE_URL = os.getenv("DEFAULT_BASE_URL", "http://localhost:8001")


class SmallModelRequest(BaseModel):
    text: str
    models: List[Dict[str, Any]] = Field(..., description="小模型配置列表")
    top_k: int = 10
    threshold: float = 0.5
    base_url: Optional[str] = None


class ModelResult(BaseModel):
    model_name: str
    results: List[Dict[str, Any]] = []


class SmallModelsResponse(BaseModel):
    total: int
    results: List[ModelResult]


def call_model(model_name: str, base_url: str, text: str, top_k: int = 10, threshold: float = 0.5) -> List[Dict[str, Any]]:
    """调用单个模型的API，返回预测结果"""
    api_url = f"{base_url.rstrip('/')}/models/{model_name.lower().replace('_', '-')}/predict"
    logger.info(f"Calling model {model_name} at URL: {api_url}")

    try:
        response = requests.post(api_url, json={"text": text, "top_k": top_k, "threshold": threshold}, timeout=60)
        logger.info(f"Response status: {response.status_code}")
        result = response.json()
        logger.info(f"Response received, has results: {'results' in result}, count: {len(result.get('results', []))}")
        # 返回结果列表
        if isinstance(result, dict) and "results" in result:
            return result["results"]
        else:
            logger.warning(f"No 'results' field in response: {result}")
            return []
    except requests.exceptions.RequestException as e:
        error_msg = f"调用失败 ({model_name}): {str(e)}"
        logger.error(error_msg)
        return []
    except Exception as e:
        error_msg = f"调用模型API失败 ({model_name}): {e}"
        logger.error(error_msg)
        return []


@app.get("/")
def root():
    return {"message": "MODELS_GATEWAY", "version": "1.0.0", "endpoints": {"gateway": "/gateway"}}


@app.post("/gateway", response_model=SmallModelsResponse)
async def gateway(request: SmallModelRequest):
    """批量调用小模型，返回预测结果"""
    if not request.models:
        return SmallModelsResponse(total=0, results=[])
    
    base_url = request.base_url or DEFAULT_BASE_URL
    results = []
    
    for cfg in request.models:
        model_name = cfg.get("name")
        if not model_name:
            continue
        
        # 调用模型API，获取预测结果
        model_results = call_model(model_name, base_url, request.text, request.top_k, request.threshold)
        results.append(ModelResult(model_name=model_name, results=model_results))
    
    return SmallModelsResponse(
        total=len(results),
        results=results
    )
