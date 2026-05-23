"""
字典版本管理器 - 多版本ICD字典 + 院内术语映射
"""
from enum import Enum
from datetime import datetime
from typing import Dict, List, Optional
import re


class DictionaryVersion(Enum):
    """ICD字典版本"""
    ICD10_GUOJIA_2016 = "icd10_cn_2016"    # 国家临床版
    ICD10_YIBAO_2021 = "icd10_yb_2021"     # 医保版
    ICD10_BEIJING_2023 = "icd10_bj_2023"   # 北京版


class DictionaryManager:
    """多版本字典与术语映射管理器"""

    def __init__(self, active_version: str = None):
        self.active_version = active_version or DictionaryVersion.ICD10_YIBAO_2021.value
        self._mapping_cache = {}
        self._local_mappings = self._load_local_mappings()

    def switch_version(self, version: str) -> dict:
        """切换字典版本"""
        if version not in [v.value for v in DictionaryVersion]:
            return {"success": False, "error": f"不支持的版本: {version}"}

        old_version = self.active_version
        self.active_version = version
        self._mapping_cache.clear()

        return {
            "success": True,
            "old_version": old_version,
            "new_version": version
        }

    def map_term_to_code(self, clinical_term: str) -> dict:
        """院内临床术语 → 标准ICD编码映射"""
        # 1. 精确匹配
        if clinical_term in self._local_mappings:
            return {
                "found": True,
                "exact_match": True,
                **self._local_mappings[clinical_term]
            }

        # 2. 模糊匹配
        fuzzy_matches = self._fuzzy_match(clinical_term)
        if fuzzy_matches:
            return {
                "found": True,
                "exact_match": False,
                "suggestions": fuzzy_matches[:3],
                "need_manual_confirm": True
            }

        return {"found": False, "need_manual_input": True}

    def normalize_case_text(self, text: str) -> str:
        """病历文本术语标准化预处理"""
        normalized = text
        for term, standard in self._local_mappings.items():
            if term in normalized:
                normalized = normalized.replace(term, standard["description"])
        return normalized

    def add_mapping(self, clinical_term: str, standard_code: str,
                    standard_description: str, user_id: int) -> dict:
        """添加新的术语映射"""
        if clinical_term in self._local_mappings:
            return {"success": False, "error": "该术语映射已存在"}

        mapping = {
            "term": clinical_term,
            "code": standard_code,
            "description": standard_description,
            "created_by": user_id,
            "created_at": datetime.now().isoformat(),
            "usage_count": 0
        }
        self._local_mappings[clinical_term] = mapping
        self._mapping_cache.clear()
        return {"success": True, "mapping": mapping}

    def get_mapping_stats(self) -> dict:
        """获取映射统计"""
        all_mappings = list(self._local_mappings.values())
        return {
            "total_mappings": len(all_mappings),
            "top_used": sorted(all_mappings, key=lambda x: x.get("usage_count", 0), reverse=True)[:10],
            "recent_added": sorted(all_mappings, key=lambda x: x.get("created_at", ""), reverse=True)[:10]
        }

    def _load_local_mappings(self) -> Dict:
        """加载内置术语映射"""
        return {
            "老慢支": {"code": "J44.9", "description": "慢性阻塞性肺疾病"},
            "甲流": {"code": "J10.1", "description": "甲型流感病毒感染"},
            "心梗": {"code": "I21.9", "description": "急性心肌梗死"},
            "心衰": {"code": "I50.9", "description": "心力衰竭"},
            "糖尿病": {"code": "E11.9", "description": "2型糖尿病"},
            "高血压": {"code": "I10", "description": "原发性高血压"},
            "冠心病": {"code": "I25.1", "description": "冠状动脉粥样硬化性心脏病"},
            "脑梗": {"code": "I63.9", "description": "脑梗死"},
            "肺炎": {"code": "J18.9", "description": "肺炎"},
            "慢阻肺": {"code": "J44.9", "description": "慢性阻塞性肺疾病"}
        }

    def _fuzzy_match(self, term: str) -> List[Dict]:
        """模糊匹配术语"""
        matches = []
        for clinical_term, mapping in self._local_mappings.items():
            if term in clinical_term or clinical_term in term:
                matches.append({
                    "term": clinical_term,
                    "similarity": len(set(term) & set(clinical_term)) / max(len(term), len(clinical_term)),
                    **mapping
                })
        return sorted(matches, key=lambda x: x["similarity"], reverse=True)
