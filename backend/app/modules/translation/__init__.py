"""
医学病例翻译服务
将中文病例翻译为符合国际标准的英文病例，用于提升ICD编码分类效果
"""
from typing import Dict, Optional, Any
from openai import OpenAI
from app.core.config import settings
from app.core.logger import logger
from app.modules.model_configs.model_config_service import model_config_service


# 医学病例翻译提示词 - 专业设计用于ICD编码优化
TRANSLATION_SYSTEM_PROMPT = """You are a professional medical documentation translator specializing in ICD coding classification.

Your expertise includes:
- Medical terminology in both Chinese and English
- ICD-10-CM/ICD-9-CM coding standards and conventions
- Clinical documentation best practices
- Medical record structure and formatting

Key principles for translation:
1. Preserve ALL clinical facts, symptoms, signs, lab values, and diagnostic information
2. Use standardized medical terminology following WHO ICD guidelines
3. Maintain the logical structure of clinical reasoning (chief complaint → history → findings → diagnosis)
4. Ensure terminology consistency with international medical coding standards
5. Include all relevant details that affect ICD code selection (laterality, acuity, etiology, manifestations)
6. Use proper medical abbreviations and symbols where internationally recognized
7. Format in a clinically coherent narrative style suitable for AI-assisted coding

CRITICAL REQUIREMENTS:
- NEVER omit or generalize clinical details that could affect code selection
- ALWAYS include specific values, durations, and quantitative data
- ALWAYS specify body site, laterality, and severity when mentioned
- Use proper anatomical and pathological terminology"""


def _build_translation_prompt(chinese_text: str, case_type: str = "general") -> str:
    """
    构建医学病例翻译prompt

    Args:
        chinese_text: 中文病例文本
        case_type: 病例类型 (general/cardiovascular/respiratory/neurological/etc.)

    Returns:
        翻译prompt字符串
    """
    case_type_hints = {
        "cardiovascular": "This appears to be a cardiovascular case. Pay special attention to: heart disease classifications, MI types and locations, hypertension stages, cardiac procedures, and complication specifiers.",
        "respiratory": "This appears to be a respiratory case. Pay special attention to: COPD classifications, pneumonia types, respiratory failure types, and procedure codes for respiratory treatments.",
        "neurological": "This appears to be a neurological case. Pay special attention to: stroke classifications (ischemic/hemorrhagic), seizure types, neurological deficit descriptions, and CNS infection types.",
        "gastrointestinal": "This appears to be a gastrointestinal case. Pay special attention to: GI bleeding locations, pancreatitis types, liver disease stages, and GI malignancy classifications.",
        "endocrine": "This appears to be an endocrine case. Pay special attention to: diabetes types and complications, thyroid disorders, adrenal disorders, and obesity classifications.",
        "musculoskeletal": "This appears to be a musculoskeletal case. Pay special attention to: fracture types and locations, arthritis classifications, back pain codes, and orthopedic procedure codes.",
        "oncology": "This appears to be an oncology case. Pay special attention to: tumor staging, morphology codes (M-codes), primary vs secondary malignancies, and metastasis locations.",
        "trauma": "This appears to be a trauma case. Pay special attention to: external cause codes (V/W/X/Y codes), injury sites and types, trauma complication codes, and poisoning classifications.",
        "general": "This is a general medical case. Ensure all clinical details are accurately translated using appropriate ICD terminology."
    }

    hint = case_type_hints.get(case_type, case_type_hints["general"])

    prompt = f"""Translate the following Chinese medical case document into professional English suitable for ICD coding classification.

{hint}

IMPORTANT FORMATTING REQUIREMENTS:
1. Structure the translation in clinical narrative format:
   - Chief Complaint
   - Present Illness (History of Present Illness)
   - Physical Examination
   - Laboratory and Imaging Findings
   - Diagnosis/Impressions
   - Treatment/Procedures

2. Use these formatting conventions:
   - Separate major sections with line breaks
   - Use standard medical abbreviations (BP, HR, WBC, etc.)
   - Preserve all numerical values with units
   - Use "×" for "times" in symptoms (e.g., "coughing × 3 days")
   - Use "→" to indicate progression or results
   - Use "+" for positive findings, "-" for negative findings

3. Preserve ALL original information without omission, including:
   - Exact drug names and dosages
   - Specific anatomical locations
   - Precise timeframes and durations
   - All laboratory values and reference ranges
   - Specific diagnostic criteria mentioned

Original Chinese Text:
---
{chinese_text}
---

Translation:"""

    return prompt


class MedicalTranslator:
    """医学病例翻译器"""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """
        初始化翻译器

        Args:
            api_key: 大模型API Key
            base_url: 大模型API Base URL
        """
        # 从 model_configs.json 获取大模型配置
        configs = model_config_service.list_configs()
        llm_configs = [
            cfg for cfg in configs
            if cfg.category == "large" and cfg.status == "valid" and cfg.enabled and cfg.name
        ]

        if api_key is None and llm_configs and llm_configs[0].apiKey:
            api_key = llm_configs[0].apiKey

        if api_key is None:
            api_key = settings.ALI_API_KEY or None

        if base_url is None:
            base_url = settings.ALI_BASE_URL or "https://dashscope.aliyuncs.com/compatible-mode/v1"

        self.api_key = api_key
        self.base_url = base_url
        self.model_name = llm_configs[0].name if llm_configs else "qwen-plus"

        if api_key:
            self.client = OpenAI(api_key=api_key, base_url=base_url)
        else:
            self.client = None
            logger.warning("未配置API Key，翻译功能不可用")

    def translate(
        self,
        chinese_text: str,
        case_type: str = "general"
    ) -> Dict[str, Any]:
        """
        翻译中文病例为英文

        Args:
            chinese_text: 中文病例文本
            case_type: 病例类型

        Returns:
            翻译结果字典：
            {
                "english_text": "翻译后的英文文本",
                "original_length": 原文本长度,
                "translated_length": 翻译后长度,
                "model_used": "使用的模型",
                "success": 是否成功
            }
        """
        if not self.client:
            return {
                "success": False,
                "error": "翻译服务未配置API Key",
                "english_text": None,
                "original_length": len(chinese_text),
                "translated_length": 0,
                "model_used": None
            }

        try:
            logger.info(f"开始翻译病例，类型: {case_type}, 原文长度: {len(chinese_text)}")

            prompt = _build_translation_prompt(chinese_text, case_type)

            completion = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": TRANSLATION_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,  # 较低温度保证翻译一致性
                max_tokens=4000
            )

            english_text = completion.choices[0].message.content.strip()

            logger.info(f"翻译完成，译文长度: {len(english_text)}")

            return {
                "success": True,
                "english_text": english_text,
                "original_length": len(chinese_text),
                "translated_length": len(english_text),
                "model_used": self.model_name
            }

        except Exception as e:
            logger.error(f"翻译失败: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "english_text": None,
                "original_length": len(chinese_text),
                "translated_length": 0,
                "model_used": self.model_name
            }


# 全局翻译器实例
_translator: Optional[MedicalTranslator] = None


def get_translator() -> MedicalTranslator:
    """获取翻译器实例（单例）"""
    global _translator
    if _translator is None:
        _translator = MedicalTranslator()
    return _translator


def translate_medical_case(
    chinese_text: str,
    case_type: str = "general"
) -> Dict[str, Any]:
    """
    翻译医学病例（便捷函数）

    Args:
        chinese_text: 中文病例文本
        case_type: 病例类型

    Returns:
        翻译结果
    """
    translator = get_translator()
    return translator.translate(chinese_text, case_type)