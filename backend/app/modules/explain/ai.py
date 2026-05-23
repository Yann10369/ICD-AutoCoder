"""AI模块 - 大模型集成、解释生成和预测功能"""
from typing import Dict, Optional, Any, List
import os
import json
import re
from openai import OpenAI
from app.core.config import settings
from app.core.logger import logger
from app.modules.model_configs.model_config_service import model_config_service


def _build_explanation_prompt(predictions: List[Dict[str, Any]], original_text: str) -> str:
    """
    构建解释生成的prompt（只生成解释，不修改预测结果）
    
    Args:
        predictions: ICD编码预测结果列表，每个元素包含code, description, probability
        original_text: 原始病例文本
        
    Returns:
        构建好的prompt字符串
    """
    if not predictions or len(predictions) == 0:
        return f"""你是一位专业的医疗诊断专家，擅长根据病例文本进行ICD编码解释。

病例文本：
{original_text}

请为上述病例文本生成一个综合性的医疗诊断解释，说明该病例的主要特征和可能的诊断方向。"""
    
    # 构建预测结果文本
    predictions_text = "\n".join([
        f"- {pred.get('code', '')}: {pred.get('description', '')} (概率: {pred.get('probability', 0):.2%})"
        for pred in predictions
    ])
    
    prompt = f"""你是一位专业的医疗诊断专家，擅长根据病例文本和ICD编码预测结果进行解释分析。

病例文本：
{original_text}

ICD编码预测结果：
{predictions_text}

请根据上述病例文本和ICD编码预测结果，生成详细的解释说明：
1. 分析病例文本中的关键症状、体征和检查结果
2. 解释为什么这些ICD编码适用于该病例
3. 说明每个ICD编码与病例文本的关联性
4. 提供综合性的诊断解释

请返回一个清晰、专业的解释文本，不需要返回JSON格式，直接返回解释内容。"""
    
    return prompt


def _build_prediction_prompt(original_text: str, top_k: int = 10) -> str:
    """
    构建预测功能的prompt（AI模型直接预测ICD编码）
    
    Args:
        original_text: 原始病例文本
        top_k: 返回前k个结果
        
    Returns:
        构建好的prompt字符串
    """
    prompt = f"""你是一位专业的医疗诊断专家，擅长根据病例文本进行ICD编码预测。

请根据以下病例文本，预测该病例的ICD编码（ICD-9格式），按概率从高到低排序，返回前{top_k}个最可能的编码。

病例文本：
{original_text}

请严格按照以下JSON格式返回结果，不要添加任何其他文字：
{{
    "icdPredictions": [
        {{
            "code": "410.71",
            "description": "Subendocardial infarction, initial episode",
            "probability": 0.85
        }},
        {{
            "code": "410.7",
            "description": "Subendocardial infarction",
            "probability": 0.75
        }}
    ]
}}

要求：
- icdPredictions数组中的每个元素必须包含code（ICD编码）、description（描述）、probability（概率0-1之间）
- 按probability从高到低排序
- 只返回JSON，不要添加任何其他文字或markdown格式"""
    
    return prompt


def _parse_json_response(response_text: str, fallback_predictions: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    解析AI模型返回的JSON响应
    
    Args:
        response_text: AI模型返回的文本
        fallback_predictions: 如果解析失败，使用的备用预测结果（可选）
        
    Returns:
        解析后的结果字典
    """
    try:
        # 尝试提取JSON部分（可能被markdown代码块包裹）
        json_text = response_text.strip()
        
        # 移除可能的markdown代码块标记
        if json_text.startswith("```json"):
            json_text = json_text[7:]
        elif json_text.startswith("```"):
            json_text = json_text[3:]
        
        if json_text.endswith("```"):
            json_text = json_text[:-3]
        
        json_text = json_text.strip()
        
        # 尝试直接解析JSON
        result = json.loads(json_text)
        
        # 验证结果格式
        if not isinstance(result, dict):
            raise ValueError("返回结果不是字典格式")
        
        # 验证icdPredictions格式（如果存在）
        if "icdPredictions" in result and isinstance(result["icdPredictions"], list):
            validated_predictions = []
            for pred in result["icdPredictions"]:
                if isinstance(pred, dict):
                    validated_pred = {
                        "code": pred.get("code", ""),
                        "description": pred.get("description", ""),
                        "probability": float(pred.get("probability", 0.0))
                    }
                    if validated_pred["code"]:  # 只添加有效的预测
                        validated_predictions.append(validated_pred)
            result["icdPredictions"] = validated_predictions
        
        logger.info(f"成功解析JSON响应")
        return result
        
    except json.JSONDecodeError as e:
        logger.warning(f"JSON解析失败: {str(e)}")
        if fallback_predictions is not None:
            return {"icdPredictions": fallback_predictions}
        return {"icdPredictions": []}
    except Exception as e:
        logger.error(f"解析响应时发生错误: {str(e)}")
        if fallback_predictions is not None:
            return {"icdPredictions": fallback_predictions}
        return {"icdPredictions": []}


class LLMExplainer:
    """大模型解释器"""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """
        初始化大模型解释器

        Args:
            api_key: 大模型API Key（如果为None，使用配置中的值）
            base_url: 大模型API Base URL（如果为None，使用配置中的值）
        """
        # 从 model_configs.json 获取大模型配置
        configs = model_config_service.list_configs()
        llm_configs = [
            cfg for cfg in configs
            if cfg.category == "large" and cfg.status == "valid" and cfg.enabled and cfg.name
        ]

        # 优先从第一个启用的大模型配置读取 API Key
        if api_key is None and llm_configs and llm_configs[0].apiKey:
            api_key = llm_configs[0].apiKey

        # 如果 model_config 没有配置，再尝试从 settings/环境变量 获取
        if api_key is None:
            api_key = settings.ALI_API_KEY or os.getenv("ALI_API_KEY")

        if base_url is None:
            base_url = settings.ALI_BASE_URL or os.getenv("ALI_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")

        self.api_key = api_key
        self.base_url = base_url
        # 默认使用第一个可用的大模型
        self.model_name = llm_configs[0].name if llm_configs else "qwen-plus"
        
        # 初始化OpenAI客户端
        if api_key:
            # OpenAI 客户端初始化参数
            client_kwargs = {
                "api_key": api_key,
            }
            if base_url:
                client_kwargs["base_url"] = base_url
            
            self.client = OpenAI(**client_kwargs)
        else:
            self.client = None
            logger.warning("未配置API Key")
    
    def call_llm(self, prompt: str, system_prompt: str = "You are a helpful assistant.") -> str:
        """
        调用大模型API
        
        Args:
            prompt: 用户prompt
            system_prompt: 系统prompt
            
        Returns:
            大模型返回的文本
        """
        if not self.client:
            raise ValueError("未配置API Key，无法调用大模型")
        
        try:
            completion = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ]
            )
            return completion.choices[0].message.content
        except Exception as e:
            logger.error(f"调用大模型失败: {str(e)}")
            raise


def generate_explanation(
    text: str,
    predictions: List[Dict[str, Any]],
    api_key: Optional[str] = None,
    base_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    生成解释（只产生解释，不修改预测结果）
    
    针对传入的ICD编码和text文本，进行解析产生解释。
    
    Args:
        text: 原始病例文本
        predictions: ICD编码预测结果列表，格式为[{'code': ..., 'description': ..., 'probability': ...}]
        api_key: 大模型API Key（可选）
        base_url: 大模型API Base URL（可选）
        
    Returns:
        包含解释结果的字典，格式为：
        {
            "explanation": "解释文本",
            "model_used": "模型名称"
        }
    """
    try:
        logger.info(f"开始生成解释，预测结果数量: {len(predictions)}")
        
        # 构建解释prompt（只生成解释，不修改预测结果）
        prompt = _build_explanation_prompt(predictions, text)
        logger.info("解释Prompt构建完成")
        
        # 调用大模型API
        explainer = LLMExplainer(api_key=api_key, base_url=base_url)
        response_text = explainer.call_llm(
            prompt=prompt,
            system_prompt="你是一位专业的医疗诊断专家，擅长根据病例文本和ICD编码预测结果进行解释分析。请提供清晰、专业的解释说明。"
        )
        logger.info("大模型响应接收完成")
        
        # 返回解释结果（不修改预测结果）
        return {
            "explanation": response_text.strip(),
            "model_used": explainer.model_name
        }
    except Exception as e:
        logger.error(f"生成解释失败: {str(e)}")
        return {
            "explanation": f"解释生成失败: {str(e)}",
            "model_used": "error",
            "error": str(e)
        }


def generate_prediction(
    text: str,
    top_k: int = 10,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    AI模型预测功能
    
    要求AI模型根据文本直接预测ICD编码。
    
    Args:
        text: 原始病例文本
        top_k: 返回前k个结果（默认10）
        api_key: 大模型API Key（可选）
        base_url: 大模型API Base URL（可选）
        
    Returns:
        包含预测结果的字典，格式为：
        {
            "icdPredictions": [{"code": ..., "description": ..., "probability": ...}],
            "model_used": "模型名称",
            "total": 预测结果数量
        }
    """
    try:
        logger.info(f"开始AI模型预测，top_k: {top_k}")
        
        # 构建预测prompt
        prompt = _build_prediction_prompt(text, top_k)
        logger.info("预测Prompt构建完成")
        
        # 调用大模型API
        explainer = LLMExplainer(api_key=api_key, base_url=base_url)
        response_text = explainer.call_llm(
            prompt=prompt,
            system_prompt="你是一位专业的医疗诊断专家，擅长根据病例文本进行ICD编码预测。请严格按照JSON格式返回结果，不要添加任何其他文字。"
        )
        logger.info("大模型响应接收完成")
        
        # 解析JSON响应
        parsed_result = _parse_json_response(response_text)
        icd_predictions = parsed_result.get("icdPredictions", [])
        
        logger.info(f"AI模型预测完成，返回 {len(icd_predictions)} 个ICD编码")
        
        return {
            "icdPredictions": icd_predictions,
            "model_used": explainer.model_name,
            "total": len(icd_predictions)
        }
    except Exception as e:
        logger.error(f"AI模型预测失败: {str(e)}")
        return {
            "icdPredictions": [],
            "model_used": "error",
            "total": 0,
            "error": str(e)
        }


def compare_small_models(
    text: str,
    model_results: List[Dict[str, Any]],
    api_key: Optional[str] = None,
    base_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    小模型结果评比（预留函数）
    
    该功能用于比较多个小模型的预测结果，评估其准确性和一致性。
    
    Args:
        text: 原始病例文本
        model_results: 多个小模型的预测结果列表，格式为：
            [
                {
                    "model_name": "模型名称",
                    "predictions": [{"code": ..., "description": ..., "probability": ...}]
                },
                ...
            ]
        api_key: 大模型API Key（可选）
        base_url: 大模型API Base URL（可选）
        
    Returns:
        评比结果字典（预留，当前返回空结果）
        {
            "comparison": "评比结果",
            "model_used": "模型名称"
        }
    """
    # TODO: 实现小模型结果评比逻辑
    logger.info(f"小模型结果评比功能（预留），模型数量: {len(model_results)}")
    
    return {
        "comparison": "小模型结果评比功能尚未实现",
        "model_used": "N/A",
        "status": "not_implemented"
    }
