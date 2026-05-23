"""预测结果存储Repository"""
import json
from pathlib import Path
from typing import List, Optional, Dict
from uuid import uuid4
from datetime import datetime

from .base import BaseRepository


class PredictionRecord:
    """预测记录"""
    id: str
    caseText: str
    predictions: List[Dict]
    entities: Optional[Dict]
    modelUsed: str
    createdAt: str
    executionTimeMs: float

    def __init__(self, **kwargs):
        self.id = kwargs.get("id", str(uuid4()))
        self.caseText = kwargs.get("caseText", "")
        self.predictions = kwargs.get("predictions", [])
        self.entities = kwargs.get("entities")
        self.modelUsed = kwargs.get("modelUsed", "")
        self.createdAt = kwargs.get("createdAt", datetime.utcnow().isoformat() + "Z")
        self.executionTimeMs = kwargs.get("executionTimeMs", 0.0)

    def dict(self):
        return {
            "id": self.id,
            "caseText": self.caseText,
            "predictions": self.predictions,
            "entities": self.entities,
            "modelUsed": self.modelUsed,
            "createdAt": self.createdAt,
            "executionTimeMs": self.executionTimeMs,
        }


class PredictionRepository(BaseRepository[PredictionRecord]):
    """预测结果存储（JSON文件实现）"""

    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.data_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.data_path.exists():
            self.data_path.write_text("[]", encoding="utf-8")

    def _load_all(self) -> List[dict]:
        raw = self.data_path.read_text(encoding="utf-8")
        if not raw.strip():
            return []
        return json.loads(raw)

    def _persist(self, data: List[dict]) -> None:
        tmp_path = self.data_path.with_suffix(".tmp")
        tmp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_path.replace(self.data_path)

    def list_all(self) -> List[PredictionRecord]:
        raw_list = self._load_all()
        return [PredictionRecord(**item) for item in raw_list]

    def get_by_id(self, entity_id: str) -> Optional[PredictionRecord]:
        for record in self.list_all():
            if record.id == entity_id:
                return record
        return None

    def save(self, entity: PredictionRecord) -> PredictionRecord:
        all_records = self._load_all()
        if not entity.id:
            entity.id = str(uuid4())
            all_records.insert(0, entity.dict())
        else:
            for i, existing in enumerate(all_records):
                if existing.get("id") == entity.id:
                    all_records[i] = entity.dict()
                    break
        self._persist(all_records)
        return entity

    def delete(self, entity_id: str) -> bool:
        all_records = self._load_all()
        new_list = [r for r in all_records if r.get("id") != entity_id]
        if len(new_list) == len(all_records):
            return False
        self._persist(new_list)
        return True

    def list_recent(self, limit: int = 50) -> List[PredictionRecord]:
        """获取最近的预测记录"""
        records = self.list_all()
        records.sort(key=lambda x: x.createdAt, reverse=True)
        return records[:limit]
