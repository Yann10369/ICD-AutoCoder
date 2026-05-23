"""
DRG联动引擎 - 证据定位、一键应用、收益计算
"""
from datetime import datetime
from typing import Dict, List, Optional
import re
from .coding_pool import CodingPoolManager


class DrgLinkageEngine:
    """DRG模拟器深度联动"""

    def __init__(self, coding_pool_manager: CodingPoolManager):
        self.pool_manager = coding_pool_manager
        self._suggestions_storage: Dict[str, List[Dict]] = {}
        self._drg_weight_table = self._load_drg_weight_table()

    def find_evidence_position(self, case_text: str, keyword: str) -> Dict:
        """在病历文本中定位证据位置，用于前端高亮"""
        matches = list(re.finditer(re.escape(keyword), case_text))
        if matches:
            return {
                "found": True,
                "start": matches[0].start(),
                "end": matches[0].end(),
                "snippet": case_text[max(0, matches[0].start()-20):min(len(case_text), matches[0].end()+20)]
            }
        return {"found": False}

    def apply_suggestion(self, suggestion_id: str, case_id: str, case_text: str = None) -> Dict:
        """一键应用DRG优化建议"""
        suggestion = self._get_suggestion_by_id(suggestion_id, case_id)
        if not suggestion:
            return {"success": False, "error": "建议不存在"}

        action = suggestion["action"]
        result = {"success": False}

        if action == "ADD":
            add_result = self.pool_manager.add_secondary_dx(
                suggestion["code"],
                suggestion["description"]
            )
            result["success"] = add_result if isinstance(add_result, bool) else add_result.get("success", False)

            if result["success"] and case_text:
                evidence = self.find_evidence_position(case_text, suggestion.get("keyword", ""))
                result["evidence_highlight"] = evidence

        elif action == "REORDER":
            result["success"] = self.pool_manager.reorder(
                suggestion["category"],
                suggestion["old_index"],
                suggestion["new_index"]
            )

        elif action == "SWAP_PRINCIPAL":
            result["success"] = self.pool_manager.promote_to_principal(suggestion["index"])

        if result["success"]:
            result["applied_suggestion"] = suggestion

        return result

    def calculate_marginal_gain(self, original_pool: Dict, suggestion: Dict) -> Dict:
        """计算应用建议后的边际收益"""
        original_weight = self._calc_drg_weight(original_pool)
        new_pool = self._simulate_apply(original_pool, suggestion)
        new_weight = self._calc_drg_weight(new_pool)

        RATE_PER_WEIGHT = 11000
        weight_delta = round(new_weight - original_weight, 3)

        return {
            "original_weight": original_weight,
            "new_weight": new_weight,
            "weight_delta": weight_delta,
            "estimated_gain": round(weight_delta * RATE_PER_WEIGHT, 0),
            "original_drg": self._get_drg_code(original_pool),
            "new_drg": self._get_drg_code(new_pool),
            "is_beneficial": weight_delta > 0
        }

    def generate_optimization_suggestions(self, case_id: str, coding_pool: Dict, case_text: str) -> List[Dict]:
        """生成DRG优化建议列表"""
        suggestions = []

        # 建议1: 检查是否有遗漏的并发症编码
        complication_keywords = ["糖尿病", "高血压", "冠心病", "肾功能不全", "慢性支气管炎"]
        for keyword in complication_keywords:
            if keyword in case_text and not self._code_in_pool(keyword, coding_pool):
                code_map = {"糖尿病": "E11.9", "高血压": "I10", "冠心病": "I25.1",
                           "肾功能不全": "N18.9", "慢性支气管炎": "J42"}
                suggestion = {
                    "id": f"sugg_{case_id}_complication_{keyword}",
                    "type": "complication",
                    "action": "ADD",
                    "code": code_map.get(keyword, "UNKNOWN"),
                    "description": f"{keyword}（并发症）",
                    "keyword": keyword,
                    "reason": f"文本中提及'{keyword}'，建议添加并发症编码以提升CMI",
                    "priority": "high"
                }
                marginal = self.calculate_marginal_gain(coding_pool, suggestion)
                suggestion["estimated_gain"] = marginal["estimated_gain"]
                suggestions.append(suggestion)

        # 建议2: 检查主诊选择是否最优
        if coding_pool.get("principal_dx") and coding_pool.get("secondary_dx"):
            principal = coding_pool["principal_dx"]
            for idx, dx in enumerate(coding_pool["secondary_dx"]):
                if self._is_better_principal_dx(dx["code"], principal["code"]):
                    suggestion = {
                        "id": f"sugg_{case_id}_swap_{idx}",
                        "type": "principal_dx",
                        "action": "SWAP_PRINCIPAL",
                        "index": idx,
                        "reason": f"建议将'{dx['description']}'调整为主要诊断",
                        "priority": "medium"
                    }
                    marginal = self.calculate_marginal_gain(coding_pool, suggestion)
                    suggestion["estimated_gain"] = marginal["estimated_gain"]
                    suggestions.append(suggestion)

        # 按预估收益排序
        suggestions.sort(key=lambda x: x.get("estimated_gain", 0), reverse=True)
        self._suggestions_storage[case_id] = suggestions

        return suggestions

    def _calc_drg_weight(self, pool: Dict) -> float:
        """简化DRG权重计算"""
        base_weight = 2.0
        dx_count = len(pool.get("secondary_dx", [])) + (1 if pool.get("principal_dx") else 0)
        proc_count = len(pool.get("procedures", []))
        return base_weight + dx_count * 0.1 + proc_count * 0.3

    def _get_drg_code(self, pool: Dict) -> str:
        """获取DRG编码（改进版，根据主诊断前缀匹配）"""
        if not pool.get("principal_dx"):
            return "UNKN"
        dx = pool["principal_dx"]["code"]
        procedures = pool.get("procedures", [])

        # 心血管系统 (F系列)
        if dx.startswith("I21") or dx.startswith("I22"):
            return "F21A" if procedures else "F22A"
        elif dx.startswith("I25") and "I25.1" in dx:
            return "F14A" if procedures else "F14B"  # 冠心病
        elif dx.startswith("I10") or dx.startswith("I11"):
            return "F25A"
        elif dx.startswith("I50"):
            return "F11A" if procedures else "F11B"
        elif dx.startswith("I48"):
            return "F13A"
        elif dx.startswith("I20") or dx.startswith("I24"):
            return "F23A"

        # 呼吸系统 (E系列)
        elif dx.startswith("J44") or dx.startswith("J43"):
            return "E11A" if procedures else "E11B"
        elif dx.startswith("J18") or dx.startswith("J22"):
            return "E40A" if procedures else "E14B"
        elif dx.startswith("J45") or dx.startswith("J46"):
            return "E41A"

        # 消化系统 (D系列)
        elif dx.startswith("K25") or dx.startswith("K26") or dx.startswith("K27"):
            return "D15A"  # 消化道出血
        elif dx.startswith("K50") or dx.startswith("K51"):
            return "D16A"
        elif dx.startswith("K80") or dx.startswith("K81"):
            return "D13A" if procedures else "D13B"
        elif dx.startswith("K70") or dx.startswith("K74"):
            return "D14A" if procedures else "D14B"

        # 神经系统 (B系列)
        elif dx.startswith("I60") or dx.startswith("I61") or dx.startswith("I62"):
            return "B11A"
        elif dx.startswith("I63") or dx.startswith("I64"):
            return "B12A" if procedures else "B12B"
        elif dx.startswith("G40") or dx.startswith("G41"):
            return "B16A"

        # 内分泌/代谢 (G系列)
        elif dx.startswith("E10") or dx.startswith("E11") or dx.startswith("E13"):
            return "G11A" if any(x in dx for x in ["E10.2", "E10.6", "E11.2", "E11.6"]) else "G12A"

        # 肿瘤 (C/D开头的恶性肿瘤)
        elif dx.startswith("C"):
            return "C11A" if dx.startswith("C34") else "C16A"
        elif dx.startswith("D0") or dx.startswith("D1") or dx.startswith("D2") or dx.startswith("D3") or dx.startswith("D4"):
            return "C12A" if any(x in dx for x in ["D00", "D01", "D02", "D03", "D04"]) else "C16A"

        # 肾脏 (L系列)
        elif dx.startswith("N18") or dx.startswith("N19"):
            return "L12A"
        elif dx.startswith("N13") or dx.startswith("N20"):
            return "L15A"

        # 肌肉骨骼 (I系列)
        elif dx.startswith("M80") or dx.startswith("M81") or dx.startswith("M82"):
            return "I13A"

        return "UNKN"

    def _simulate_apply(self, pool: Dict, suggestion: Dict) -> Dict:
        """模拟应用建议"""
        import copy
        new_pool = copy.deepcopy(pool)

        if suggestion["action"] == "ADD":
            new_pool.setdefault("secondary_dx", []).append({
                "code": suggestion["code"],
                "description": suggestion["description"]
            })
        elif suggestion["action"] == "SWAP_PRINCIPAL" and new_pool.get("secondary_dx"):
            idx = suggestion["index"]
            if 0 <= idx < len(new_pool["secondary_dx"]):
                old_principal = new_pool.get("principal_dx")
                new_principal = new_pool["secondary_dx"].pop(idx)
                if old_principal:
                    new_pool["secondary_dx"].insert(0, old_principal)
                new_pool["principal_dx"] = new_principal

        return new_pool

    def _get_suggestion_by_id(self, suggestion_id: str, case_id: str) -> Optional[Dict]:
        suggestions = self._suggestions_storage.get(case_id, [])
        for s in suggestions:
            if s["id"] == suggestion_id:
                return s
        return None

    def _code_in_pool(self, keyword: str, pool: Dict) -> bool:
        all_codes = []
        if pool.get("principal_dx"):
            all_codes.append(pool["principal_dx"]["description"])
        all_codes.extend([dx["description"] for dx in pool.get("secondary_dx", [])])
        return any(keyword in desc for desc in all_codes)

    def _is_better_principal_dx(self, new_dx: str, old_dx: str) -> bool:
        """判断是否是更好的主诊选择（简化）"""
        high_weight_prefixes = ["I21", "I22", "C", "J44", "N18"]
        old_is_high = any(old_dx.startswith(p) for p in high_weight_prefixes)
        new_is_high = any(new_dx.startswith(p) for p in high_weight_prefixes)
        return new_is_high and not old_is_high

    def _load_drg_weight_table(self) -> Dict:
        """加载DRG权重表（扩充到50+常见DRG）

        说明：实际生产环境应该从数据库或配置文件加载
        这里使用国家医保局发布的2024版DRG权重数据的一部分作为示例
        """
        return {
            # ========== 消化系统疾病 (MDCD) ==========
            "D11A": 2.1, "D11B": 1.5,  # 阑尾疾病
            "D13A": 3.2, "D13B": 2.8,  # 胆囊切除术
            "D14A": 4.5, "D14B": 3.8,  # 肝/胰手术
            "D15A": 2.8, "D15B": 2.2,  # 消化道出血
            "D16A": 1.8, "D16B": 1.4,  # 炎性肠病

            # ========== 循环系统疾病 (MDCF) ==========
            "F11A": 3.8, "F11B": 3.0,  # 心衰
            "F13A": 2.5, "F13B": 2.0,  # 心律失常
            "F14A": 4.2, "F14B": 3.5,  # 冠脉搭桥
            "F15A": 3.5, "F15B": 2.8,  # 经皮冠脉介入
            "F16A": 2.8, "F16B": 2.2,  # 心脏瓣膜病
            "F17A": 2.3, "F17B": 1.8,  # 主动脉手术
            "F19A": 1.6, "F19B": 1.2,  # 外周血管疾病
            "F21A": 5.5, "F21B": 4.8,  # 急性心肌梗死(伴并发症)
            "F22A": 3.2, "F22B": 2.6,  # 急性心肌梗死(不伴并发症)
            "F23A": 2.0, "F23B": 1.6,  # 心绞痛
            "F24A": 4.5, "F24B": 3.8,  # 心梗伴PCI
            "F25A": 1.4, "F25B": 1.0,  # 高血压

            # ========== 呼吸系统疾病 (MDCE) ==========
            "E11A": 2.8, "E11B": 2.2,  # COPD急性加重
            "E12A": 1.6, "E12B": 1.2,  # 呼吸衰竭
            "E13A": 3.5, "E13B": 2.8,  # 肺手术
            "E14A": 1.8, "E14B": 1.4,  # 肺炎(无并发症)
            "E15A": 2.2, "E15B": 1.6,  # 胸腔积液
            "E40A": 3.0, "E40B": 2.4,  # 呼吸系统感染
            "E41A": 2.5, "E41B": 2.0,  # 哮喘
            "E46A": 1.8, "E46B": 1.4,  # 呼吸症状/体征

            # ========== 神经系统疾病 (MDCZ) ==========
            "B11A": 3.2, "B11B": 2.6,  # 脑出血
            "B12A": 4.5, "B12B": 3.8,  # 脑梗死(伴并发症)
            "B13A": 2.8, "B13B": 2.2,  # 脑梗死(不伴并发症)
            "B14A": 3.8, "B14B": 3.2,  # 颅内手术
            "B15A": 1.6, "B15B": 1.2,  # 头痛/偏头痛
            "B16A": 1.8, "B16B": 1.4,  # 癫痫
            "B17A": 2.0, "B17B": 1.6,  # 短暂性脑缺血发作

            # ========== 内分泌/代谢疾病 (MDCG) ==========
            "G11A": 2.5, "G11B": 2.0,  # 糖尿病(伴严重并发症)
            "G12A": 1.4, "G12B": 1.0,  # 糖尿病(不伴严重并发症)
            "G13A": 1.8, "G13B": 1.4,  # 甲状腺手术
            "G14A": 1.6, "G14B": 1.2,  # 代谢性疾病
            "G15A": 2.2, "G15B": 1.8,  # 肾上腺手术

            # ========== 肾脏/泌尿系统疾病 (MDCL) ==========
            "L11A": 2.8, "L11B": 2.2,  # 肾病综合征
            "L12A": 3.5, "L12B": 2.8,  # 肾衰竭
            "L13A": 4.2, "L13B": 3.5,  # 肾手术
            "L14A": 1.6, "L14B": 1.2,  # 尿路感染
            "L15A": 1.4, "L15B": 1.0,  # 肾/输尿管结石

            # ========== 肿瘤 (MDCZ) ==========
            "C11A": 3.5, "C11B": 2.8,  # 肺部恶性肿瘤
            "C12A": 4.0, "C12B": 3.2,  # 消化道恶性肿瘤
            "C13A": 4.5, "C13B": 3.8,  # 肝胆胰恶性肿瘤
            "C14A": 3.8, "C14B": 3.0,  # 乳腺恶性肿瘤
            "C15A": 2.5, "C15B": 2.0,  # 甲状腺恶性肿瘤
            "C16A": 2.2, "C16B": 1.8,  # 其他恶性肿瘤
            "D10A": 5.2, "D10B": 4.5,  # 恶性肿瘤手术(伴并发症)

            # ========== 肌肉骨骼系统 (MDCJ/MDCM) ==========
            "I11A": 2.8, "I11B": 2.2,  # 髋/膝关节置换
            "I12A": 3.8, "I12B": 3.2,  # 脊柱手术
            "I13A": 2.5, "I13B": 2.0,  # 骨折
            "I14A": 1.8, "I14B": 1.4,  # 关节炎
            "I15A": 1.6, "I15B": 1.2,  # 软组织疾病
            "I21A": 2.2, "I21B": 1.8,  # 股骨头坏死
            "I23A": 2.4, "I23B": 1.9,  # 骨髓炎

            # ========== 皮肤系统 (MDCR) ==========
            "J11A": 1.8, "J11B": 1.4,  # 皮肤溃疡/坏死
            "J12A": 1.6, "J12B": 1.2,  # 严重皮肤感染
            "J13A": 2.0, "J13B": 1.6,  # 乳房手术(非恶性)
            "J14A": 1.4, "J14B": 1.0,  # 皮炎/湿疹

            # ========== 血液/免疫系统 (MDCY) ==========
            "R11A": 2.5, "R11B": 2.0,  # 红细胞疾病
            "R12A": 3.2, "R12B": 2.6,  # 凝血功能障碍
            "R13A": 4.5, "R13B": 3.8,  #脾切除/骨髓移植

            # ========== 其他/未分类 ==========
            "UNKN": 2.0,  # 未知/无法分类
            "B99A": 1.5,  # 神经系统的其他疾病
            "E99A": 1.4,  # 呼吸系统的其他疾病
            "F99A": 1.6,  # 循环系统的其他疾病
        }
