"""性能指标API路由"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from app.core.logger import logger

router = APIRouter()


@router.get("/metrics")
async def get_performance_metrics():
    """获取模型性能指标
    
    返回Micro-F1、Top-k Precision等指标（模拟数据，实际应从数据库或评估结果中获取）
    """
    try:
        # 模拟性能指标数据（实际应从数据库或评估结果中获取）
        metrics = {
            "models": [
                {
                    "name": "CAML",
                    "micro_f1": 0.82,
                    "macro_f1": 0.78,
                    "top_k_precision": {
                        "top_1": 0.85,
                        "top_3": 0.92,
                        "top_5": 0.95,
                        "top_10": 0.98
                    },
                    "average_precision": 0.87
                },
                {
                    "name": "DCAN",
                    "micro_f1": 0.84,
                    "macro_f1": 0.80,
                    "top_k_precision": {
                        "top_1": 0.87,
                        "top_3": 0.93,
                        "top_5": 0.96,
                        "top_10": 0.99
                    },
                    "average_precision": 0.89
                },
                {
                    "name": "Fusion",
                    "micro_f1": 0.86,
                    "macro_f1": 0.82,
                    "top_k_precision": {
                        "top_1": 0.89,
                        "top_3": 0.94,
                        "top_5": 0.97,
                        "top_10": 0.99
                    },
                    "average_precision": 0.91
                },
                {
                    "name": "TransICD",
                    "micro_f1": 0.85,
                    "macro_f1": 0.81,
                    "top_k_precision": {
                        "top_1": 0.88,
                        "top_3": 0.94,
                        "top_5": 0.96,
                        "top_10": 0.99
                    },
                    "average_precision": 0.90
                }
            ],
            "overall": {
                "average_micro_f1": 0.84,
                "average_macro_f1": 0.80,
                "average_top_1_precision": 0.87,
                "average_top_3_precision": 0.93
            }
        }
        
        return metrics
    
    except Exception as e:
        logger.error(f"获取性能指标失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取性能指标失败: {str(e)}")


@router.get("/chart-data")
async def get_chart_data(
    metric_type: Optional[str] = "micro_f1",
    models: Optional[str] = None
):
    try:
        # 获取性能指标
        metrics_response = await get_performance_metrics()
        all_models = metrics_response.get("models", [])
        
        # 过滤模型
        if models:
            model_names = [m.strip() for m in models.split(",")]
            filtered_models = [m for m in all_models if m["name"] in model_names]
        else:
            filtered_models = all_models
        
        # 根据指标类型构建图表数据
        chart_data = {
            "labels": [m["name"] for m in filtered_models],
            "datasets": []
        }
        
        if metric_type == "micro_f1":
            chart_data["datasets"].append({
                "label": "Micro-F1",
                "data": [m["micro_f1"] for m in filtered_models],
                "backgroundColor": "rgba(99, 102, 241, 0.5)",
                "borderColor": "rgba(99, 102, 241, 1)",
                "borderWidth": 2
            })
        elif metric_type == "macro_f1":
            chart_data["datasets"].append({
                "label": "Macro-F1",
                "data": [m["macro_f1"] for m in filtered_models],
                "backgroundColor": "rgba(168, 85, 247, 0.5)",
                "borderColor": "rgba(168, 85, 247, 1)",
                "borderWidth": 2
            })
        elif metric_type == "top_k_precision":
            # Top-k Precision 折线图
            top_ks = ["top_1", "top_3", "top_5", "top_10"]
            for model in filtered_models:
                chart_data["datasets"].append({
                    "label": model["name"],
                    "data": [model["top_k_precision"][k] for k in top_ks],
                    "borderColor": f"rgba({hash(model['name']) % 255}, {(hash(model['name']) * 2) % 255}, {(hash(model['name']) * 3) % 255}, 1)",
                    "borderWidth": 2,
                    "fill": False
                })
            chart_data["labels"] = ["Top-1", "Top-3", "Top-5", "Top-10"]
        
        return chart_data
    
    except Exception as e:
        logger.error(f"获取图表数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取图表数据失败: {str(e)}")

