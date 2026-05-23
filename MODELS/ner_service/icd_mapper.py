"""ICD代码映射工具"""
from typing import Dict, List
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ICDMapper:
    """ICD代码映射器"""
    
    def __init__(self, codes_file: str = "/app/models/plm-icd/param/ALL_CODES.txt"):
        """
        初始化ICD映射器
        
        Args:
            codes_file: ICD代码列表文件路径
        """
        self.codes_file = codes_file
        self.label_to_code: Dict[int, str] = {}
        self.code_to_label: Dict[str, int] = {}
        self._load_codes()
    
    def _load_codes(self):
        """从文件加载ICD代码列表"""
        try:
            codes_path = Path(self.codes_file)
            if not codes_path.exists():
                # 尝试相对路径
                codes_path = Path(__file__).parent.parent.parent / "param" / "ALL_CODES.txt"
            
            if codes_path.exists():
                with open(codes_path, 'r', encoding='utf-8') as f:
                    codes = [line.strip() for line in f if line.strip()]
                
                # 建立label_id到ICD代码的映射
                for label_id, code in enumerate(codes):
                    self.label_to_code[label_id] = code
                    self.code_to_label[code] = label_id
                
                logger.info(f"加载了 {len(codes)} 个ICD代码")
            else:
                logger.warning(f"ICD代码文件不存在: {self.codes_file}")
        except Exception as e:
            logger.error(f"加载ICD代码失败: {str(e)}")
    
    def label_to_icd_code(self, label_id: int) -> str:

        return self.label_to_code.get(label_id, f"UNKNOWN_{label_id}")
    
    def icd_code_to_label(self, code: str) -> int:

        return self.code_to_label.get(code, -1)
    
    def get_all_codes(self) -> List[str]:
        """获取所有ICD代码列表"""
        return list(self.code_to_label.keys())
    
    def get_num_labels(self) -> int:
        """获取标签数量"""
        return len(self.label_to_code)

