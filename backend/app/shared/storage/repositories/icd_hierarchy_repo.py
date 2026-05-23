"""ICD层次结构Repository"""
import json
from pathlib import Path
from typing import List, Dict, Optional

from .base import BaseRepository


class ICDHierarchyRepository(BaseRepository[Dict]):
    """ICD层次结构存储（从静态JSON文件读取）"""

    def __init__(self, data_path: Path):
        self.data_path = data_path
        self._cached_data: Optional[List[Dict]] = None

    def _load_data(self) -> List[Dict]:
        if self._cached_data is not None:
            return self._cached_data
        if not self.data_path.exists():
            self._cached_data = []
            return []
        raw = self.data_path.read_text(encoding="utf-8")
        data = json.loads(raw)
        self._cached_data = data if isinstance(data, list) else []
        return self._cached_data

    def list_all(self) -> List[Dict]:
        return self._load_data()

    def get_by_id(self, entity_id: str) -> Optional[Dict]:
        data = self._load_data()
        for item in data:
            if item.get("code") == entity_id:
                return item
        return None

    def find_by_prefix(self, prefix: str) -> List[Dict]:
        """根据编码前缀查找"""
        data = self._load_data()
        return [item for item in data if item.get("code", "").startswith(prefix)]

    def search_by_description(self, keyword: str) -> List[Dict]:
        """根据描述搜索"""
        data = self._load_data()
        keyword = keyword.lower()
        return [
            item for item in data
            if keyword in item.get("description", "").lower()
        ]

    # 以下方法不支持修改（静态数据）
    def save(self, entity: Dict) -> Dict:
        raise NotImplementedError("ICD层次结构是静态数据，不支持修改")

    def delete(self, entity_id: str) -> bool:
        raise NotImplementedError("ICD层次结构是静态数据，不支持删除")
