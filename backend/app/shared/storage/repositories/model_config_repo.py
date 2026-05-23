"""模型配置Repository"""
import json
from pathlib import Path
from typing import List, Optional
from uuid import uuid4
from datetime import datetime

from .base import BaseRepository
from app.shared.schemas.model_config import ModelConfig


class ModelConfigRepository(BaseRepository[ModelConfig]):
    """基于JSON文件的模型配置存储"""

    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.data_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.data_path.exists():
            self.data_path.write_text("[]", encoding="utf-8")

    def _now_iso(self) -> str:
        return datetime.utcnow().isoformat() + "Z"

    def _load_all(self) -> List[dict]:
        raw = self.data_path.read_text(encoding="utf-8")
        if not raw.strip():
            return []
        return json.loads(raw)

    def _persist(self, data: List[dict]) -> None:
        tmp_path = self.data_path.with_suffix(".tmp")
        tmp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_path.replace(self.data_path)

    def list_all(self) -> List[ModelConfig]:
        raw_list = self._load_all()
        result = []
        for item in raw_list:
            try:
                result.append(ModelConfig(**item))
            except Exception:
                # 跳过无效数据
                continue
        return result

    def get_by_id(self, entity_id: str) -> Optional[ModelConfig]:
        for cfg in self.list_all():
            if cfg.id == entity_id:
                return cfg
        return None

    def save(self, entity: ModelConfig) -> ModelConfig:
        """保存（新建或更新）"""
        all_configs = self._load_all()
        if not entity.id:
            entity.id = str(uuid4())
            entity.createdAt = self._now_iso()
            entity.updatedAt = self._now_iso()
            all_configs.append(entity.dict())
        else:
            # 更新
            for i, existing in enumerate(all_configs):
                if existing.get("id") == entity.id:
                    entity_dict = entity.dict()
                    entity_dict["updatedAt"] = self._now_iso()
                    all_configs[i] = entity_dict
                    break
        self._persist(all_configs)
        return entity

    def delete(self, entity_id: str) -> bool:
        all_configs = self._load_all()
        new_list = [cfg for cfg in all_configs if cfg.get("id") != entity_id]
        if len(new_list) == len(all_configs):
            return False
        self._persist(new_list)
        return True
