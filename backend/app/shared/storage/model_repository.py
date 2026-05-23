"""模型权重仓库模块"""
from typing import Dict, List, Optional, Any
from pathlib import Path
import json
import shutil
from datetime import datetime
from app.core.config import settings
from app.core.logger import logger


class ModelRepository:
    """模型权重仓库"""
    
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or settings.MODEL_DIR)
        self.small_models_dir = self.base_dir / "small_models"
        self.llm_models_dir = self.base_dir / "llm_models"
        self.metadata_file = self.base_dir / "metadata.json"
        self.small_models_dir.mkdir(parents=True, exist_ok=True)
        self.llm_models_dir.mkdir(parents=True, exist_ok=True)
        self.metadata = self._load_metadata()
    
    def _load_metadata(self) -> Dict[str, Any]:
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"加载模型元数据失败: {str(e)}")
                return {}
        return {
            'small_models': {},
            'llm_models': {},
            'last_updated': datetime.now().isoformat()
        }
    
    def _save_metadata(self) -> bool:
        """保存模型元数据"""
        try:
            self.metadata['last_updated'] = datetime.now().isoformat()
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.metadata, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"保存模型元数据失败: {str(e)}")
            return False
    
    def register_small_model(self, model_name: str, model_path: str, version: str = "1.0.0", description: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """注册小模型权重"""
        try:
            model_file = Path(model_path)
            if not model_file.exists():
                logger.error(f"模型文件不存在: {model_path}")
                return False
            
            # 创建模型目录
            model_dir = self.small_models_dir / model_name / version
            model_dir.mkdir(parents=True, exist_ok=True)
            
            # 复制模型文件
            dest_path = model_dir / model_file.name
            shutil.copy2(model_file, dest_path)
            
            # 记录元数据
            if 'small_models' not in self.metadata:
                self.metadata['small_models'] = {}
            
            self.metadata['small_models'][model_name] = {
                'name': model_name,
                'version': version,
                'path': str(dest_path.relative_to(self.base_dir)),
                'full_path': str(dest_path),
                'description': description or f"{model_name} model",
                'registered_at': datetime.now().isoformat(),
                'file_size': model_file.stat().st_size,
                'metadata': metadata or {}
            }
            
            self._save_metadata()
            logger.info(f"注册小模型: {model_name} v{version}")
            return True
        
        except Exception as e:
            logger.error(f"注册小模型失败: {str(e)}")
            return False
    
    def register_llm_model(
        self,
        model_name: str,
        model_path: Optional[str] = None,
        provider: str = "openai",
        version: str = "latest",
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """注册LLM模型
        
        Args:
            model_name: LLM模型名称（如 gpt-4, gpt-3.5-turbo）
            model_path: 本地模型权重文件路径（可选）
            provider: LLM提供者（openai, anthropic, local）
            version: 模型版本
            description: 模型描述
            metadata: 额外的元数据
            
        Returns:
            bool: 注册是否成功
        """
        try:
            model_info = {
                'name': model_name,
                'provider': provider,
                'version': version,
                'description': description or f"{model_name} LLM model",
                'registered_at': datetime.now().isoformat(),
                'metadata': metadata or {}
            }
            
            # 如果有本地模型文件，保存它
            if model_path:
                model_file = Path(model_path)
                if model_file.exists():
                    model_dir = self.llm_models_dir / model_name / version
                    model_dir.mkdir(parents=True, exist_ok=True)
                    
                    dest_path = model_dir / model_file.name
                    shutil.copy2(model_file, dest_path)
                    
                    model_info['path'] = str(dest_path.relative_to(self.base_dir))
                    model_info['full_path'] = str(dest_path)
                    model_info['file_size'] = model_file.stat().st_size
            
            # 记录元数据
            if 'llm_models' not in self.metadata:
                self.metadata['llm_models'] = {}
            
            self.metadata['llm_models'][model_name] = model_info
            self._save_metadata()
            logger.info(f"注册LLM模型: {model_name} ({provider})")
            return True
        
        except Exception as e:
            logger.error(f"注册LLM模型失败: {str(e)}")
            return False
    
    def get_small_model_path(
        self,
        model_name: str,
        version: Optional[str] = None
    ) -> Optional[str]:
        """获取小模型权重文件路径
        
        Args:
            model_name: 模型名称
            version: 模型版本，如果不指定则返回最新版本
            
        Returns:
            str: 模型文件路径，如果不存在返回None
        """
        if model_name not in self.metadata.get('small_models', {}):
            return None
        
        model_info = self.metadata['small_models'][model_name]
        
        if version and model_info.get('version') != version:
            return None
        
        full_path = model_info.get('full_path')
        if full_path and Path(full_path).exists():
            return full_path
        
        # 尝试从相对路径构建
        relative_path = model_info.get('path')
        if relative_path:
            full_path = self.base_dir / relative_path
            if full_path.exists():
                return str(full_path)
        
        return None
    
    def get_llm_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """获取LLM模型信息
        
        Args:
            model_name: LLM模型名称
            
        Returns:
            Dict: LLM模型信息，如果不存在返回None
        """
        return self.metadata.get('llm_models', {}).get(model_name)
    
    def list_small_models(self) -> List[Dict[str, Any]]:
        """列出所有已注册的小模型"""
        return list(self.metadata.get('small_models', {}).values())
    
    def list_llm_models(self) -> List[Dict[str, Any]]:
        """列出所有已注册的LLM模型"""
        return list(self.metadata.get('llm_models', {}).values())
    
    def remove_small_model(self, model_name: str, version: Optional[str] = None) -> bool:
        """删除小模型
        
        Args:
            model_name: 模型名称
            version: 模型版本，如果不指定则删除所有版本
            
        Returns:
            bool: 删除是否成功
        """
        try:
            if model_name not in self.metadata.get('small_models', {}):
                return False
            
            model_info = self.metadata['small_models'][model_name]
            
            if version and model_info.get('version') != version:
                return False
            
            # 删除模型文件
            model_dir = self.small_models_dir / model_name
            if model_dir.exists():
                if version:
                    version_dir = model_dir / version
                    if version_dir.exists():
                        shutil.rmtree(version_dir)
                else:
                    shutil.rmtree(model_dir)
            
            # 删除元数据
            del self.metadata['small_models'][model_name]
            self._save_metadata()
            
            logger.info(f"删除小模型: {model_name}")
            return True
        
        except Exception as e:
            logger.error(f"删除小模型失败: {str(e)}")
            return False
    
    def get_model_info(self, model_name: str, model_type: str = "small") -> Optional[Dict[str, Any]]:
        """获取模型信息
        
        Args:
            model_name: 模型名称
            model_type: 模型类型 ("small" 或 "llm")
            
        Returns:
            Dict: 模型信息
        """
        if model_type == "small":
            return self.metadata.get('small_models', {}).get(model_name)
        elif model_type == "llm":
            return self.metadata.get('llm_models', {}).get(model_name)
        return None


# 全局模型仓库实例
model_repository = ModelRepository()

