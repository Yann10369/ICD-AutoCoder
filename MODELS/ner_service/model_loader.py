"""PLM-ICD模型加载器和预测器"""
import torch
import sys
from pathlib import Path
from typing import Dict, List, Any
import logging

# 确保当前目录在 Python 路径中（Docker 容器中工作目录是 /app）
current_dir = Path(__file__).parent.absolute()
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

# 导入模型类
from modeling_roberta import RobertaForMultilabelClassification
from transformers import AutoConfig, RobertaTokenizer
from icd_mapper import ICDMapper

logger = logging.getLogger(__name__)


class PLMICDModelLoader:
    """PLM-ICD模型加载器和预测器"""
    
    def __init__(self, model_path: str = "/app/models/plm-icd/param"):
        """
        初始化并加载模型
        
        Args:
            model_path: 模型参数文件路径
        """
        self.model_path = Path(model_path)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self._load_model()
    
    def _load_model(self):
        """加载模型参数、tokenizer和ICD映射器"""
        # 加载配置
        config_path = self.model_path / "config.json"
        logger.info(f"加载模型配置: {config_path}")
        config = AutoConfig.from_pretrained(str(config_path))
        
        # 加载ICD代码映射器
        codes_file = self.model_path / "ALL_CODES.txt"
        self.icd_mapper = ICDMapper(str(codes_file))
        config.num_labels = self.icd_mapper.get_num_labels()
        
        # 加载tokenizer
        vocab_path = self.model_path / "vocab.json"
        merges_path = self.model_path / "merges.txt"
        logger.info(f"加载tokenizer: {vocab_path}")
        if merges_path.exists():
            self.tokenizer = RobertaTokenizer(
                vocab_file=str(vocab_path),
                merges_file=str(merges_path)
            )
        else:
            self.tokenizer = RobertaTokenizer(vocab_file=str(vocab_path))
        
        # 加载模型权重
        logger.info(f"加载模型权重: {self.model_path}")
        self.model = RobertaForMultilabelClassification.from_pretrained(
            str(self.model_path),
            config=config,
            torch_dtype=torch.float32
        )
        self.model.to(self.device)
        self.model.eval()
        
        logger.info(f"模型加载成功，设备: {self.device}, 标签数: {config.num_labels}")
    
    def predict(
        self, 
        text: str, 
        threshold: float = 0.5,
        top_k: int = 10, 
        max_length: int = 3072,
        chunk_size: int = 256
    ) -> List[Dict[str, Any]]:
        # Tokenize文本
        encoded = self.tokenizer(
            text,
            max_length=max_length,
            padding=True,
            truncation=True,
            return_tensors="pt"
        )
        
        input_ids = encoded['input_ids'].to(self.device)
        attention_mask = encoded['attention_mask'].to(self.device)
        
        # 处理长文本分块
        seq_length = input_ids.size(1)
        if seq_length > chunk_size:
            num_chunks = (seq_length + chunk_size - 1) // chunk_size
            input_ids = input_ids.view(1, num_chunks, chunk_size)
            attention_mask = attention_mask.view(1, num_chunks, chunk_size)
        else:
            input_ids = input_ids.view(1, 1, seq_length)
            attention_mask = attention_mask.view(1, 1, seq_length)
        
        # 模型推理
        with torch.no_grad():
            outputs = self.model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                return_dict=True
            )
            probs = torch.sigmoid(outputs.logits).cpu().numpy()[0]
        
        # 获取top_k结果
        top_indices = probs.argsort()[::-1][:top_k]
        
        # 构建结果
        results = []
        for idx in top_indices:
            prob = float(probs[idx])
            if prob >= threshold:
                icd_code = self.icd_mapper.label_to_icd_code(int(idx))
                results.append({
                    'icd_code': icd_code,
                    'probability': prob
                })
        
        return results

