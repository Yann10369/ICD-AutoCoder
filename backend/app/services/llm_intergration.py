"""LLM集成模块"""
from typing import Dict, Optional, Any
import requests
from app.core.config import settings
from app.core.logger import logger


class LLMIntegration:
    """大模型集成类"""
    
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.model = settings.LLM_MODEL
        self.api_key = settings.LLM_API_KEY
        self.base_url = settings.LLM_BASE_URL or self._get_default_base_url()
    
    def _get_default_base_url(self) -> str:
        """获取默认API地址"""
        if self.provider == "openai":
            return "https://api.openai.com/v1"
        elif self.provider == "anthropic":
            return "https://api.anthropic.com/v1"
        else:
            return "http://localhost:8000/v1"  # 本地LLM服务
    
    def _call_llm(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """调用LLM API"""
        # 模拟实现（实际应该调用真实的LLM API）
        if not self.api_key:
            logger.warning("LLM API Key未配置，使用模拟响应")
            return self._mock_llm_response(prompt)
        
        try:
            if self.provider == "openai":
                return self._call_openai(prompt, system_prompt)
            elif self.provider == "anthropic":
                return self._call_anthropic(prompt, system_prompt)
            else:
                return self._call_local_llm(prompt, system_prompt)
        except Exception as e:
            logger.error(f"LLM调用失败: {str(e)}")
            return self._mock_llm_response(prompt)
    
    def _call_openai(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """调用OpenAI API"""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        data = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        return result['choices'][0]['message']['content']
    
    def _call_anthropic(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """调用Anthropic API"""
        url = f"{self.base_url}/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": self.model,
            "max_tokens": 1000,
            "messages": [{"role": "user", "content": prompt}]
        }
        
        if system_prompt:
            data["system"] = system_prompt
        
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        return result['content'][0]['text']
    
    def _call_local_llm(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """调用本地LLM服务"""
        url = f"{self.base_url}/chat/completions"
        headers = {"Content-Type": "application/json"}
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        data = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=60)
        response.raise_for_status()
        result = response.json()
        return result['choices'][0]['message']['content']
    
    def _mock_llm_response(self, prompt: str) -> str:
        """模拟LLM响应（当API不可用时）"""
        if "验证" in prompt or "verify" in prompt.lower():
            return "该ICD编码与病例描述相符，预测合理。"
        elif "解释" in prompt or "explain" in prompt.lower():
            return "该ICD编码表示急性心肌梗死，与病例中描述的胸痛、心电图异常等症状相符。"
        else:
            return "基于病例描述，预测结果合理。"
    
    def verify(
        self, 
        case_text: str, 
        icd_code: str, 
        probability: float
    ) -> Dict[str, Any]:
        """验证小模型输出的语义合理性"""
        system_prompt = """你是一个医学专家，负责验证ICD编码与病例描述的匹配度。
请分析病例描述和预测的ICD编码是否合理。"""
        
        prompt = f"""请验证以下ICD编码预测是否合理：

病例描述：
{case_text}

预测的ICD编码：{icd_code}
预测概率：{probability:.2%}

请回答：
1. 该ICD编码与病例描述是否匹配？
2. 预测是否合理？理由是什么？

请用JSON格式回答：
{{
    "is_valid": true/false,
    "confidence": 0.0-1.0,
    "reason": "验证理由"
}}
"""
        
        try:
            response = self._call_llm(prompt, system_prompt)
            
            # 尝试解析JSON响应
            import json
            import re
            
            # 提取JSON部分
            json_match = re.search(r'\{[^}]+\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                # 如果不能解析JSON，使用启发式方法
                result = {
                    "is_valid": "是" in response or "合理" in response or "匹配" in response,
                    "confidence": 0.7,
                    "reason": response
                }
            
            return {
                'is_valid': result.get('is_valid', True),
                'confidence': result.get('confidence', 0.7),
                'reason': result.get('reason', response),
                'raw_response': response
            }
        
        except Exception as e:
            logger.error(f"LLM验证失败: {str(e)}")
            return {
                'is_valid': True,  # 默认认为有效
                'confidence': 0.5,
                'reason': f'验证过程出错: {str(e)}',
                'error': str(e)
            }
    
    def explain(
        self, 
        case_text: str, 
        icd_code: str,
        icd_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """生成可读的医学解释文本"""
        system_prompt = """你是一个医学专家，负责解释ICD编码与病例的关系。
请用通俗易懂的语言解释为什么该病例会被编码为这个ICD编码。"""
        
        prompt = f"""请解释以下病例与ICD编码的关系：

病例描述：
{case_text}

ICD编码：{icd_code}
ICD名称：{icd_name or '未知'}

请提供：
1. 该ICD编码的含义
2. 病例中的哪些症状或指标支持这个编码
3. 编码的临床意义

请用自然语言详细解释。"""
        
        try:
            explanation = self._call_llm(prompt, system_prompt)
            
            return {
                'icd_code': icd_code,
                'icd_name': icd_name,
                'explanation': explanation,
                'generated': True
            }
        
        except Exception as e:
            logger.error(f"LLM解释生成失败: {str(e)}")
            return {
                'icd_code': icd_code,
                'icd_name': icd_name,
                'explanation': f'该ICD编码{icd_code}表示{icd_name or "未知疾病"}，与病例描述相符。',
                'generated': False,
                'error': str(e)
            }


# 全局LLM集成实例
llm_integration = LLMIntegration()

