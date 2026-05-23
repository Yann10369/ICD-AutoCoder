"""
编码规则校验引擎
内置ICD编码质控规则，实时校验编码质量
"""
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum


class ValidationLevel(Enum):
    """校验级别"""
    ERROR = "error"      # 错误，必须修正
    WARNING = "warning"  # 警告，建议修正
    INFO = "info"        # 提示，仅供参考


@dataclass
class ValidationResult:
    """校验结果"""
    level: ValidationLevel
    type: str
    message: str
    related_code: Optional[str] = None
    suggestion: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "level": self.level.value,
            "type": self.type,
            "message": self.message,
            "related_code": self.related_code,
            "suggestion": self.suggestion
        }


class CodingValidator:
    """编码规则校验引擎"""

    def __init__(self):
        self.rules = [
            self._rule_principal_dx_exists,
            self._rule_dx_icd10_format,
            self._rule_dx_proc_match,
            self._rule_tumor_mcode,
            self._rule_injury_external_code,
            self._rule_duplicate_code,
            self._rule_complication_as_principal,
        ]

    def validate_all(self, coding_pool: Dict, case_text: str = None) -> Dict:
        """
        执行完整校验

        Args:
            coding_pool: get_full_pool() 返回的编码池字典
            case_text: 病历文本（可选，用于增强校验）

        Returns:
            {
                "errors": [...],
                "warnings": [...],
                "info": [...],
                "score": 0-100,
                "summary": "摘要信息"
            }
        """
        results = {
            "errors": [],
            "warnings": [],
            "info": []
        }
        score = 100

        # 执行所有规则
        for rule in self.rules:
            rule_results = rule(coding_pool)
            for r in rule_results:
                if r.level == ValidationLevel.ERROR:
                    results["errors"].append(r.to_dict())
                    score -= 15  # 每个错误扣15分
                elif r.level == ValidationLevel.WARNING:
                    results["warnings"].append(r.to_dict())
                    score -= 5  # 每个警告扣5分
                else:
                    results["info"].append(r.to_dict())

        # 确保分数不低于0
        score = max(0, score)

        # 生成摘要
        error_count = len(results["errors"])
        warning_count = len(results["warnings"])

        if error_count > 0:
            summary = f"发现 {error_count} 个错误，{warning_count} 个警告，建议修正后提交"
        elif warning_count > 0:
            summary = f"发现 {warning_count} 个警告，建议检查后提交"
        else:
            summary = "编码校验通过，质量优秀"

        results["score"] = score
        results["summary"] = summary
        results["grade"] = self._get_grade(score)

        return results

    def _rule_principal_dx_exists(self, pool: Dict) -> List[ValidationResult]:
        """规则1: 必须有主要诊断"""
        results = []
        if not pool.get("principal_dx"):
            results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                type="no_principal_dx",
                message="缺少主要诊断，请至少选择一个主要诊断",
                suggestion="从AI推荐中选择一个编码设为主诊"
            ))
        return results

    def _rule_dx_icd10_format(self, pool: Dict) -> List[ValidationResult]:
        """规则2: ICD-10格式校验"""
        import re
        pattern = r'^[A-Z]\d{2}(\.\d{1,4})?$'
        results = []

        # 检查主诊
        principal = pool.get("principal_dx")
        if principal and not re.match(pattern, principal["code"]):
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                type="invalid_icd10_format",
                message=f"主诊 {principal['code']} 格式不符合ICD-10规范",
                related_code=principal["code"],
                suggestion="请核对编码标准格式：字母+2位数字[.1-4位数字"
            ))

        # 检查副诊
        for dx in pool.get("secondary_dx", []):
            if not re.match(pattern, dx["code"]):
                results.append(ValidationResult(
                    level=ValidationLevel.WARNING,
                    type="invalid_icd10_format",
                    message=f"副诊 {dx['code']} 格式不符合ICD-10规范",
                    related_code=dx["code"]
                ))

        return results

    def _rule_dx_proc_match(self, pool: Dict) -> List[ValidationResult]:
        """规则3: 主要诊断与主要手术匹配度检查"""
        results = []
        principal = pool.get("principal_dx")
        procedures = pool.get("procedures", [])

        if not principal or not procedures:
            return results

        principal_code = principal["code"]
        first_proc = procedures[0]["code"]

        # 心血管诊断前缀对应的手术前缀
        cardio_dx_prefixes = ["I20", "I21", "I22", "I23", "I24", "I25"]
        cardio_proc_prefixes = ["36.0", "36.1", "00.66", "37.2"]

        is_cardio_dx = any(principal_code.startswith(p) for p in cardio_dx_prefixes)
        is_cardio_proc = any(first_proc.startswith(p) for p in cardio_proc_prefixes)

        if is_cardio_dx and not is_cardio_proc:
            results.append(ValidationResult(
                level=ValidationLevel.INFO,
                type="dx_proc_mismatch",
                message=f"主要诊断 {principal_code} 为心血管疾病，但主要手术 {first_proc} 并非心血管手术",
                related_code=f"{principal_code} / {first_proc}",
                suggestion="请确认诊断与手术是否匹配"
            ))

        return results

    def _rule_tumor_mcode(self, pool: Dict) -> List[ValidationResult]:
        """规则4: 肿瘤编码需要M形态学编码"""
        results = []
        tumor_prefixes = ["C", "D0", "D1", "D2", "D3", "D4"]

        # 检查是否有肿瘤编码
        has_tumor = False
        principal = pool.get("principal_dx")
        if principal and any(principal["code"].startswith(p) for p in tumor_prefixes):
            has_tumor = True

        for dx in pool.get("secondary_dx", []):
            if any(dx["code"].startswith(p) for p in tumor_prefixes):
                has_tumor = True
                break

        # 检查是否有M编码
        has_mcode = any(p["code"].startswith("M") for p in pool.get("procedures", []))

        if has_tumor and not has_mcode:
            results.append(ValidationResult(
                level=ValidationLevel.INFO,
                type="missing_mcode",
                message="存在肿瘤编码，建议补充形态学M编码",
                related_code=principal["code"] if principal else None,
                suggestion="在手术操作区添加对应的M形态学编码"
            ))

        return results

    def _rule_injury_external_code(self, pool: Dict) -> List[ValidationResult]:
        """规则5: 损伤中毒需要外部原因编码(V/W/X/Y)"""
        results = []
        injury_prefixes = ["S", "T"]

        # 检查是否有损伤编码
        has_injury = False
        principal = pool.get("principal_dx")
        if principal and any(principal["code"].startswith(p) for p in injury_prefixes):
            has_injury = True

        for dx in pool.get("secondary_dx", []):
            if any(dx["code"].startswith(p) for p in injury_prefixes):
                has_injury = True
                break

        # 检查是否有外部原因编码
        external_prefixes = ["V", "W", "X", "Y"]
        has_external = any(dx["code"][0] in external_prefixes for dx in pool.get("secondary_dx", []))

        if has_injury and not has_external:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                type="missing_external_cause",
                message="存在损伤/中毒编码，建议补充V/W/X/Y外部原因编码",
                suggestion="在其他诊断区添加外部原因编码"
            ))

        return results

    def _rule_duplicate_code(self, pool: Dict) -> List[ValidationResult]:
        """规则6: 重复编码检查"""
        results = []
        all_codes = []

        principal = pool.get("principal_dx")
        if principal:
            all_codes.append(principal["code"])

        for dx in pool.get("secondary_dx", []):
            all_codes.append(dx["code"])

        for proc in pool.get("procedures", []):
            all_codes.append(proc["code"])

        # 检查重复
        seen = set()
        duplicates = set()
        for code in all_codes:
            if code in seen:
                duplicates.add(code)
            seen.add(code)

        for code in duplicates:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                type="duplicate_code",
                message=f"编码 {code} 重复出现，请删除重复项",
                related_code=code,
                suggestion="请删除重复的编码"
            ))

        return results

    def _rule_complication_as_principal(self, pool: Dict) -> List[ValidationResult]:
        """规则7: 并发症不建议作为主诊"""
        results = []
        complication_prefixes = ["E11", "E10", "I50", "J98", "N18", "K26", "M05"]

        principal = pool.get("principal_dx")
        if principal and any(principal["code"].startswith(p) for p in complication_prefixes):
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                type="complication_as_principal",
                message=f"{principal['code']} 通常作为并发症，不建议作为主要诊断",
                related_code=principal["code"],
                suggestion="请确认主要诊断的选择，通常应选择主要治疗的疾病"
            ))

        return results

    def _get_grade(self, score: int) -> str:
        """根据分数获得等级"""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 60:
            return "C"
        else:
            return "D"

    def quick_check(self, coding_pool: Dict) -> bool:
        """快速检查是否可以提交（没有错误即可提交）"""
        result = self.validate_all(coding_pool)
        return len(result["errors"]) == 0
