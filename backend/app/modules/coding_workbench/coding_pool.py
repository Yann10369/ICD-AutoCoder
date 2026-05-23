"""
三分区编码池管理器
负责管理主要诊断、其他诊断、手术操作三个分区的编码
支持拖拽排序、主诊提升、智能告警等功能
"""
from typing import Dict, List, Optional
from datetime import datetime
from dataclasses import dataclass, asdict


@dataclass
class CodeItem:
    """编码项数据结构"""
    code: str
    description: str
    evidence: Optional[Dict] = None
    timestamp: Optional[datetime] = None
    source: str = "ai_suggested"  # ai_suggested / manual_added / drg_suggested

    def to_dict(self) -> Dict:
        return {
            "code": self.code,
            "description": self.description,
            "evidence": self.evidence,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "source": self.source
        }


class CodingPoolManager:
    """三分区编码池管理器"""

    # 并发症编码前缀（不建议作为主诊）
    COMPLICATION_PREFIXES = ["E11", "E10", "I50", "J98", "N18", "K26", "M05"]

    # 肿瘤编码前缀（需要M码）
    TUMOR_PREFIXES = ["C", "D0", "D1", "D2", "D3", "D4"]

    # 损伤/中毒编码前缀（需要外部原因编码）
    INJURY_PREFIXES = ["S", "T"]

    # 产科编码范围（O00-O99）- 需要注意与妊娠相关的编码互斥
    OBSTETRIC_CODES = ["O00", "O01", "O02", "O03", "O04", "O05", "O06", "O07", "O08", "O09",
                       "O10", "O11", "O12", "O13", "O14", "O15", "O16", "O20", "O21", "O22",
                       "O23", "O24", "O25", "O26", "O27", "O28", "O29", "O30", "O31", "O32",
                       "O33", "O34", "O35", "O36", "O37", "O38", "O39", "O40", "O41", "O42",
                       "O43", "O44", "O45", "O46", "O47", "O48", "O60", "O61", "O62", "O63",
                       "O64", "O65", "O66", "O67", "O68", "O69", "O70", "O71", "O72", "O73",
                       "O74", "O75", "O80", "O81", "O82", "O85", "O86", "O87", "O88", "O89",
                       "O90", "O91", "O92", "O94", "O95", "O96", "O97", "O98", "O99"]

    # 外因编码前缀（V/W/X/Y开头，用于损伤和中毒的外因分类）
    EXTERNAL_CAUSE_PREFIXES = ["V", "W", "X", "Y"]

    # 糖尿病相关编码（需要检查与妊娠的互斥关系）
    DIABETES_CODES = ["E10", "E11", "E12", "E13", "E14"]

    # 先天性畸形编码（Q00-Q99）
    CONGENITAL_ANOMALY_PREFIXES = ["Q"]

    def __init__(self, case_id: str):
        self.case_id = case_id
        self.principal_dx: Optional[CodeItem] = None  # 主要诊断（唯一）
        self.secondary_dx: List[CodeItem] = []         # 其他诊断
        self.procedures: List[CodeItem] = []           # 手术及操作
        self.last_modified: Optional[datetime] = None

    def set_principal_dx(
        self,
        code: str,
        description: str,
        evidence: Dict = None,
        source: str = "ai_suggested"
    ) -> Dict:
        """
        设置主要诊断

        返回:
            {success: bool, warning: str, need_confirm: bool}
        """
        warnings = []

        # 规则1: 并发症不建议作主诊
        if self._is_complication(code):
            warnings.append({
                "type": "complication_as_principal",
                "level": "warning",
                "message": f"{code} 通常作为并发症，不建议作为主要诊断，请确认"
            })

        # 规则2: 肿瘤编码提醒M码
        if self._is_tumor_code(code):
            warnings.append({
                "type": "tumor_need_mcode",
                "level": "info",
                "message": f"{code} 为肿瘤编码，建议补充形态学M编码"
            })

        # 规则3: 外伤编码提醒外部原因
        if self._is_injury_code(code):
            warnings.append({
                "type": "injury_need_external",
                "level": "info",
                "message": f"{code} 为损伤编码，建议补充V/W/X/Y外部原因编码"
            })

        # 规则4: 产科编码需要检查是否与妊娠相关
        obstetric_warning = self._check_obstetric_conflict(code)
        if obstetric_warning:
            warnings.append(obstetric_warning)

        # 规则5: 先天性畸形编码提醒
        if self._is_congenital_anomaly(code):
            warnings.append({
                "type": "congenital_anomaly",
                "level": "info",
                "message": f"{code} 为先天性畸形编码，请确认是否为主要诊断"
            })

        self.principal_dx = CodeItem(
            code=code,
            description=description,
            evidence=evidence,
            timestamp=datetime.now(),
            source=source
        )
        self.last_modified = datetime.now()

        return {
            "success": True,
            "warnings": warnings,
            "need_confirm": len(warnings) > 0
        }

    def add_secondary_dx(
        self,
        code: str,
        description: str,
        evidence: Dict = None,
        source: str = "ai_suggested"
    ) -> Dict:
        """添加其他诊断"""
        # 去重检查
        if any(item.code == code for item in self.secondary_dx):
            return {
                "success": False,
                "error": f"编码 {code} 已存在于其他诊断列表中"
            }

        self.secondary_dx.append(CodeItem(
            code=code,
            description=description,
            evidence=evidence,
            timestamp=datetime.now(),
            source=source
        ))
        self.last_modified = datetime.now()

        return {"success": True, "index": len(self.secondary_dx) - 1}

    def add_procedure(
        self,
        code: str,
        description: str,
        evidence: Dict = None,
        source: str = "manual_added"
    ) -> Dict:
        """添加手术及操作编码"""
        # 格式校验 (ICD-9-CM-3)
        if not self._validate_icd9_format(code):
            return {
                "success": False,
                "error": f"{code} 格式不符合ICD-9-CM-3规范"
            }

        # 去重检查
        if any(item.code == code for item in self.procedures):
            return {
                "success": False,
                "error": f"编码 {code} 已存在于手术操作列表中"
            }

        self.procedures.append(CodeItem(
            code=code,
            description=description,
            evidence=evidence,
            timestamp=datetime.now(),
            source=source
        ))
        self.last_modified = datetime.now()

        return {"success": True, "index": len(self.procedures) - 1}

    def remove_code(self, category: str, index: int) -> Dict:
        """
        删除编码

        Args:
            category: principal_dx / secondary_dx / procedures
            index: 索引位置 (principal_dx时忽略)
        """
        try:
            if category == "principal_dx":
                self.principal_dx = None
            elif category == "secondary_dx":
                if 0 <= index < len(self.secondary_dx):
                    self.secondary_dx.pop(index)
                else:
                    return {"success": False, "error": "索引超出范围"}
            elif category == "procedures":
                if 0 <= index < len(self.procedures):
                    self.procedures.pop(index)
                else:
                    return {"success": False, "error": "索引超出范围"}
            else:
                return {"success": False, "error": "未知的编码分类"}

            self.last_modified = datetime.now()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def reorder(self, category: str, old_index: int, new_index: int) -> Dict:
        """拖拽排序"""
        try:
            items = None
            if category == "secondary_dx":
                items = self.secondary_dx
            elif category == "procedures":
                items = self.procedures
            else:
                return {"success": False, "error": "该分类不支持排序"}

            if not (0 <= old_index < len(items) and 0 <= new_index < len(items)):
                return {"success": False, "error": "索引超出范围"}

            item = items.pop(old_index)
            items.insert(new_index, item)
            self.last_modified = datetime.now()

            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def promote_to_principal(self, index: int) -> Dict:
        """将副诊提升为主诊（一键操作）

        原来的主诊自动降为副诊第一位
        """
        if not (0 <= index < len(self.secondary_dx)):
            return {"success": False, "error": "副诊索引超出范围"}

        # 取出要提升的编码
        new_principal = self.secondary_dx.pop(index)

        # 原来的主诊降为副诊第一位
        old_principal = self.principal_dx
        if old_principal:
            self.secondary_dx.insert(0, old_principal)

        # 设置新的主诊并返回告警
        result = self.set_principal_dx(
            code=new_principal.code,
            description=new_principal.description,
            evidence=new_principal.evidence,
            source=new_principal.source
        )

        if old_principal:
            result["old_principal_downgraded"] = {
                "code": old_principal.code,
                "description": old_principal.description
            }

        return result

    def demote_principal_to_secondary(self) -> Dict:
        """将主诊降级为副诊（清空主诊位置）"""
        if not self.principal_dx:
            return {"success": False, "error": "没有主诊可降级"}

        self.secondary_dx.insert(0, self.principal_dx)
        self.principal_dx = None
        self.last_modified = datetime.now()

        return {"success": True}

    def get_pool_summary(self) -> Dict:
        """获取编码池摘要信息"""
        return {
            "case_id": self.case_id,
            "last_modified": self.last_modified.isoformat() if self.last_modified else None,
            "summary": {
                "principal_dx": 1 if self.principal_dx else 0,
                "secondary_dx_count": len(self.secondary_dx),
                "procedure_count": len(self.procedures),
                "total_count": (1 if self.principal_dx else 0) + len(self.secondary_dx) + len(self.procedures)
            }
        }

    def get_full_pool(self) -> Dict:
        """获取完整的编码池数据"""
        return {
            "case_id": self.case_id,
            "last_modified": self.last_modified.isoformat() if self.last_modified else None,
            "principal_dx": self.principal_dx.to_dict() if self.principal_dx else None,
            "secondary_dx": [item.to_dict() for item in self.secondary_dx],
            "procedures": [item.to_dict() for item in self.procedures]
        }

    def _is_complication(self, code: str) -> bool:
        """检查是否为并发症编码"""
        return any(code.startswith(prefix) for prefix in self.COMPLICATION_PREFIXES)

    def _is_tumor_code(self, code: str) -> bool:
        """检查是否为肿瘤编码（需要M码）"""
        if code.startswith("C"):
            return True
        # D00-D49 范围内的是肿瘤原位、良性、行为未知的肿瘤
        if code.startswith("D"):
            first_char = code[1] if len(code) > 1 else ''
            return first_char in '0123456789' and int(first_char) <= 4 if first_char.isdigit() else False
        return False

    def _is_injury_code(self, code: str) -> bool:
        """检查是否为损伤编码（需要外部原因）"""
        return any(code.startswith(prefix) for prefix in self.INJURY_PREFIXES)

    def _is_congenital_anomaly(self, code: str) -> bool:
        """检查是否为先天性畸形编码"""
        return any(code.startswith(prefix) for prefix in self.CONGENITAL_ANOMALY_PREFIXES)

    def _check_obstetric_conflict(self, code: str) -> Optional[Dict]:
        """
        检查产科编码冲突

        规则：
        1. 产科编码(O00-O99)不应与妊娠相关编码共存
        2. 糖尿病编码(E10-E14)与妊娠共存时需要特定编码(O24)
        """
        # 检查是否是产科编码
        is_obstetric = any(code.startswith(prefix) for prefix in self.OBSTETRIC_CODES)

        if is_obstetric:
            # 检查是否同时存在糖尿病相关编码
            has_diabetes = any(
                item.code.startswith(prefix)
                for item in self.secondary_dx
                for prefix in self.DIABETES_CODES
            )
            if has_diabetes:
                return {
                    "type": "obstetric_diabetes_conflict",
                    "level": "warning",
                    "message": f"{code} 为产科编码，同时存在糖尿病编码，妊娠期糖尿病应使用O24编码"
                }
            return None

        # 检查是否是糖尿病编码
        is_diabetes = any(code.startswith(prefix) for prefix in self.DIABETES_CODES)
        if is_diabetes:
            # 检查是否同时存在产科编码
            has_obstetric = any(
                item.code.startswith(prefix)
                for item in self.secondary_dx
                for prefix in self.OBSTETRIC_CODES
            )
            if has_obstetric:
                return {
                    "type": "diabetes_obstetric_conflict",
                    "level": "warning",
                    "message": f"{code} 为糖尿病编码，同时存在产科编码，妊娠期糖尿病应使用O24编码"
                }

        return None

    def _validate_icd9_format(self, code: str) -> bool:
        """ICD-9-CM-3格式校验

        格式: 两位数字 + 小数点 + 1-2位数字
        例: 36.06, 88.78
        """
        import re
        pattern = r'^\d{2}\.\d{1,2}$'
        return bool(re.match(pattern, code))

    def batch_import_codes(self, predictions: List[Dict]) -> Dict:
        """批量导入AI预测结果

        将AI返回的预测结果批量导入编码池
        第一个结果作为主诊，其余作为副诊
        """
        if not predictions:
            return {"success": False, "error": "没有预测结果可导入"}

        # 第一个作为主诊
        first_item = predictions[0]
        self.set_principal_dx(
            code=first_item.get("code", ""),
            description=first_item.get("description", ""),
            evidence=first_item.get("evidence"),
            source="ai_suggested"
        )

        # 剩下的作为副诊
        for item in predictions[1:]:
            self.add_secondary_dx(
                code=item.get("code", ""),
                description=item.get("description", ""),
                evidence=item.get("evidence"),
                source="ai_suggested"
            )

        return {
            "success": True,
            "imported": len(predictions),
            "as_principal": 1,
            "as_secondary": len(predictions) - 1
        }
