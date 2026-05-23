"""
特殊编码检测器 - 肿瘤M码、外伤外部原因、星剑号配对
支持从数据库加载规则（可选），也保留内存默认值
"""
from enum import Enum
from typing import Dict, List, Optional
import re
from app.core.logger import logger


class SpecialCodingType(Enum):
    TUMOR_M_CODE = "tumor_m_code"
    EXTERNAL_CAUSE = "external_cause"
    STAR_DAGGER = "star_dagger"


class SpecialCodingDetector:
    """特殊编码智能检测与配对推荐"""

    # 默认星剑号配对规则（当数据库不可用时使用）
    DEFAULT_STAR_DAGGER_PAIRS = {
        # 糖尿病相关
        "E10.2*": ["E10.9†"],
        "E11.0*": ["E11.9†"],
        "E13.1*": ["E13.9†"],
        # 心血管相关
        "I25.10*": ["I51.8†"],
        "I48.91*": ["I48.92†"],
        # 肾脏相关
        "N18.3*": ["N18.9†"],
        "N18.4*": ["N18.9†"],
        # 神经相关
        "G63.2*": ["E10.4†"],
        "G40.0*": ["G40.9†"],
        # 其他常见配对
        "J44.0*": ["J44.9†"],
        "K50.1*": ["K50.9†"],
        "K70.3*": ["K70.9†"],
        "K74.6*": ["K74.9†"],
        # 感染相关
        "A41.9*": ["A49.9†"],
        # 肿瘤相关
        "C34.9*": ["C78.0†"],
        "C50.9*": ["C79.3†"],
        # 更多心血管配对
        "I21.0*": ["I21.9†", "I25.10†"],
        "I21.1*": ["I21.9†", "I25.10†"],
        "I21.2*": ["I21.9†", "I25.10†"],
        "I21.3*": ["I21.9†", "I25.10†"],
        "I21.9*": ["I25.10†"],
        # 高血压相关
        "I10*": ["I11.9†"],
        "I11.0*": ["I11.9†"],
        # 心力衰竭相关
        "I50.0*": ["I50.9†"],
        "I50.1*": ["I50.9†"],
        # 慢阻肺相关
        "J43.0*": ["J44.9†"],
        "J44.0*": ["J44.9†"],
        "J44.1*": ["J44.9†"],
        # 肝硬化相关
        "K70.0*": ["K70.9†"],
        "K70.1*": ["K70.9†"],
        "K70.2*": ["K70.9†"],
        "K74.0*": ["K74.9†"],
        "K74.1*": ["K74.9†"],
        "K74.2*": ["K74.9†"],
        "K74.3*": ["K74.9†"],
        "K74.4*": ["K74.9†"],
        "K74.5*": ["K74.9†"],
        # 肾炎相关
        "N03.0*": ["N03.9†"],
        "N03.1*": ["N03.9†"],
        "N03.2*": ["N03.9†"],
        "N18.1*": ["N18.9†"],
        "N18.2*": ["N18.9†"],
        # 类风湿关节炎
        "M05.0*": ["M05.9†"],
        "M05.1*": ["M05.9†"],
        "M05.2*": ["M05.9†"],
        "M06.0*": ["M06.9†"],
        # 系统性红斑狼疮
        "M32.0*": ["M32.9†"],
        "M32.1*": ["M32.9†"],
    }

    # 默认M码形态学关键词
    DEFAULT_MORPHOLOGY_KEYWORDS = {
        "腺癌": {"code": "M8140/3", "desc": "腺癌"},
        "鳞状细胞癌": {"code": "M8070/3", "desc": "鳞状细胞癌"},
        "鳞癌": {"code": "M8070/3", "desc": "鳞状细胞癌"},
        "小细胞癌": {"code": "M8041/3", "desc": "小细胞癌"},
        "小细胞肺癌": {"code": "M8041/3", "desc": "小细胞癌"},
        "浸润性导管癌": {"code": "M8500/3", "desc": "浸润性导管癌"},
        "导管内癌": {"code": "M8500/2", "desc": "导管原位癌"},
        "导管原位癌": {"code": "M8500/2", "desc": "导管原位癌"},
        "肝细胞癌": {"code": "M8170/3", "desc": "肝细胞癌"},
        "透明细胞癌": {"code": "M8310/3", "desc": "透明细胞癌"},
        "转移性腺癌": {"code": "M8490/3", "desc": "转移性腺癌"},
        "腺鳞癌": {"code": "M8560/3", "desc": "腺鳞癌"},
        "恶性黑色素瘤": {"code": "M8720/3", "desc": "恶性黑色素瘤"},
        "平滑肌肉瘤": {"code": "M8890/3", "desc": "平滑肌肉瘤"},
        "胃腺癌": {"code": "M8140/3", "desc": "腺癌"},
        "结肠腺癌": {"code": "M8140/3", "desc": "腺癌"},
        "肺腺癌": {"code": "M8140/3", "desc": "腺癌"},
        "乳腺癌": {"code": "M8500/3", "desc": "浸润性导管癌"},
    }

    # 默认外部原因关键词
    DEFAULT_EXTERNAL_CAUSE_KEYWORDS = {
        "跌倒": {"code": "W19", "desc": "同一平面跌倒"},
        "摔伤": {"code": "W19", "desc": "同一平面跌倒"},
        "绊倒": {"code": "W19", "desc": "同一平面跌倒"},
        "车祸": {"code": "V49", "desc": "机动车交通事故"},
        "交通事故": {"code": "V49", "desc": "机动车交通事故"},
        "驾乘事故": {"code": "V49", "desc": "机动车交通事故"},
        "高处坠落": {"code": "W17", "desc": "从高处坠落"},
        "坠落": {"code": "W17", "desc": "从高处坠落"},
        "利器伤": {"code": "X99", "desc": "利器伤"},
        "刀砍伤": {"code": "X99", "desc": "刀砍伤"},
        "刺伤": {"code": "X99", "desc": "利器伤"},
        "烫伤": {"code": "X19", "desc": "热液烫伤"},
        "灼伤": {"code": "X19", "desc": "热液烫伤"},
        "电击伤": {"code": "T75.4", "desc": "电击伤"},
        "触电": {"code": "T75.4", "desc": "电击伤"},
        "楼梯跌落": {"code": "W10", "desc": "楼梯跌落"},
        "运动损伤": {"code": "W18", "desc": "运动损伤"},
        "扭伤": {"code": "W18", "desc": "扭伤"},
        "挤压伤": {"code": "W26", "desc": "挤压伤"},
        "切割伤": {"code": "W25", "desc": "切割伤"},
    }

    def __init__(self):
        self._morphology_keywords = self.DEFAULT_MORPHOLOGY_KEYWORDS.copy()
        self._external_cause_keywords = self.DEFAULT_EXTERNAL_CAUSE_KEYWORDS.copy()
        self._star_dagger_pairs = self.DEFAULT_STAR_DAGGER_PAIRS.copy()
        self._load_rules_from_db()

    def _load_rules_from_db(self) -> None:
        """尝试从数据库加载规则（如果可用）"""
        try:
            from app.core.database import check_db_connection
            if check_db_connection():
                from app.core.database import execute_query
                # 从special_coding_rules表加载规则
                result = execute_query("""
                    SELECT rule_type, code, paired_code, description, keywords
                    FROM special_coding_rules
                    WHERE is_active = TRUE
                """)
                for row in result:
                    rule_type = row.get('rule_type')
                    code = row.get('code')
                    paired_code = row.get('paired_code')
                    keywords = row.get('keywords') or []

                    if rule_type == 'star_dagger' and paired_code:
                        if code not in self._star_dagger_pairs:
                            self._star_dagger_pairs[code] = []
                        if paired_code not in self._star_dagger_pairs[code]:
                            self._star_dagger_pairs[code].append(paired_code)

                    elif rule_type == 'm_code':
                        desc = row.get('description', '')
                        self._morphology_keywords[code] = {"code": code, "desc": desc}

                    elif rule_type == 'external_cause':
                        desc = row.get('description', '')
                        self._external_cause_keywords[code] = {"code": code, "desc": desc}

                logger.info(f"从数据库加载了 {len(self._star_dagger_pairs)} 个星剑号配对规则")
        except Exception as e:
            logger.debug(f"从数据库加载规则失败，使用默认规则: {e}")

    def detect_tumor_need_mcode(self, code: str, text: str) -> Dict:
        """检测肿瘤是否需要M码形态学编码"""
        TUMOR_PREFIXES = ["C", "D0", "D1", "D2", "D3", "D4"]

        if not any(code.startswith(prefix) for prefix in TUMOR_PREFIXES):
            return {"need": False, "type": "tumor_m_code"}

        # 从文本中提取形态学信息
        text_lower = text.lower()
        for keyword, m_code_info in self._morphology_keywords.items():
            if keyword.lower() in text_lower:
                return {
                    "need": True,
                    "type": "tumor_m_code",
                    "recommended_mcode": m_code_info["code"],
                    "recommended_desc": m_code_info["desc"],
                    "evidence": f"文本中提及'{keyword}'",
                    "need_manual_input": False
                }

        return {
            "need": True,
            "type": "tumor_m_code",
            "need_manual_input": True,
            "hint": "检测到肿瘤编码，请补充形态学M编码"
        }

    def detect_injury_need_external_code(self, code: str, text: str) -> Dict:
        """检测外伤是否需要V/W/X/Y外部原因编码"""
        INJURY_PREFIXES = ["S", "T"]

        if not any(code.startswith(prefix) for prefix in INJURY_PREFIXES):
            return {"need": False, "type": "external_cause"}

        text_lower = text.lower()
        for keyword, ext_code_info in self._external_cause_keywords.items():
            if keyword.lower() in text_lower:
                return {
                    "need": True,
                    "type": "external_cause",
                    "recommended_code": ext_code_info["code"],
                    "recommended_desc": ext_code_info["desc"],
                    "evidence": f"文本中提及'{keyword}'",
                    "need_manual_input": False
                }

        return {
            "need": True,
            "type": "external_cause",
            "need_manual_input": True,
            "hint": "检测到外伤编码，请补充外部原因编码(V/W/X/Y)"
        }

    def check_star_dagger_pairing(self, code_list: List[str]) -> List[Dict]:
        """检查星剑号配对完整性"""
        missing_pairs = []

        for code in code_list:
            # 检查星剑号标记
            code_clean = code.replace('†', '').replace('*', '')
            is_star = '*' in code or code_clean != code

            if is_star and code in self._star_dagger_pairs:
                required_daggers = self._star_dagger_pairs[code]
                found = any(dagger in code_list for dagger in required_daggers)
                if not found:
                    missing_pairs.append({
                        "star_code": code,
                        "missing_dagger": required_daggers[0],
                        "description": f"建议补充剑号码 {required_daggers[0]}",
                        "type": "star_dagger"
                    })

        return missing_pairs

    def detect_all(self, code_list: List[str], case_text: str) -> Dict:
        """批量检测所有特殊编码"""
        results = {
            "tumor_mcodes": [],
            "external_causes": [],
            "star_dagger_missing": [],
            "warnings": []
        }

        for code in code_list:
            # 肿瘤M码检测
            tumor_result = self.detect_tumor_need_mcode(code, case_text)
            if tumor_result.get("need"):
                results["tumor_mcodes"].append({"code": code, **tumor_result})

            # 外部原因检测
            injury_result = self.detect_injury_need_external_code(code, case_text)
            if injury_result.get("need"):
                results["external_causes"].append({"code": code, **injury_result})

        # 星剑号配对检测
        results["star_dagger_missing"] = self.check_star_dagger_pairing(code_list)

        total_issues = len(results["tumor_mcodes"]) + len(results["external_causes"]) + len(results["star_dagger_missing"])
        if total_issues > 0:
            results["warnings"].append(f"检测到 {total_issues} 个特殊编码需要补充")

        return results

    def get_available_star_dagger_pairs(self) -> Dict[str, List[str]]:
        """获取所有可用的星剑号配对规则（用于前端显示）"""
        return self._star_dagger_pairs.copy()

    def get_m_code_suggestions(self, tumor_type: str) -> Optional[Dict]:
        """根据肿瘤类型获取M码建议"""
        return self._morphology_keywords.get(tumor_type)

    def get_external_cause_suggestions(self, injury_type: str) -> Optional[Dict]:
        """根据损伤类型获取外部原因编码建议"""
        return self._external_cause_keywords.get(injury_type)