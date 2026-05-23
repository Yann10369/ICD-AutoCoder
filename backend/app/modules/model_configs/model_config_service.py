"""模型配置存储与校验服务（基于文件的轻量实现）"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel

from app.shared.schemas.model_config import ModelConfig, ModelConfigCreate, ModelConfigUpdate
from app.shared.storage.model_repository import model_repository


def _now_iso() -> str:
    """生成当前时间的 ISO 字符串"""
    return datetime.utcnow().isoformat() + "Z"


class ModelConfigService:
    """基于 JSON 文件的配置服务"""

    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.data_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.data_path.exists():
            self.data_path.write_text("[]", encoding="utf-8")

    # 基础存取
    def _load_all(self) -> List[ModelConfig]:
        raw = self.data_path.read_text(encoding="utf-8")
        if not raw.strip():
            return []
        data = json.loads(raw)
        configs = []
        for item in data:
            try:
                # 尝试使用新结构加载
                configs.append(ModelConfig(**item))
            except Exception:
                # 兼容旧数据：将旧字段映射到新结构
                old_cfg = item.copy()
                # 根据旧字段推断分类（如果存在）
                category = old_cfg.get("category", "small")
                # 创建新结构配置
                new_cfg = {
                    "id": old_cfg.get("id", str(uuid.uuid4())),
                    "name": old_cfg.get("name", ""),
                    "category": category,
                    "status": old_cfg.get("status", "unknown"),
                    "createdAt": old_cfg.get("createdAt", _now_iso()),
                    "updatedAt": old_cfg.get("updatedAt", _now_iso()),
                    "apiKey": old_cfg.get("apiKey"),
                    "exampleCode": old_cfg.get("exampleCode"),
                    "dockerImage": old_cfg.get("dockerImage"),
                    "size": old_cfg.get("size"),
                    "description": old_cfg.get("description"),
                    "enabled": old_cfg.get("enabled", True),
                    "graphApiCode": old_cfg.get("graphApiCode"),
                    "graphApiKey": old_cfg.get("graphApiKey"),
                    # 保留旧字段用于兼容
                    "arch": old_cfg.get("arch"),
                    "weightsPath": old_cfg.get("weightsPath"),
                    "graphUri": old_cfg.get("graphUri"),
                }
                configs.append(ModelConfig(**new_cfg))
        return configs

    def _persist(self, configs: List[ModelConfig]) -> None:
        tmp_path = self.data_path.with_suffix(".tmp")
        payload = [cfg.dict() for cfg in configs]
        tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_path.replace(self.data_path)

    # CRUD
    def list_configs(self) -> List[ModelConfig]:
        configs = self._load_all()
        # 从 model_repository 导入已存在的小模型
        existing_small_models = model_repository.list_small_models()
        for small_model in existing_small_models:
            # 如果这个模型名称已经在 configs 中存在，跳过
            exists = any(cfg.name == small_model['name'] and cfg.category == 'small' for cfg in configs)
            if not exists:
                # 创建一个新的配置
                now = _now_iso()
                cfg = ModelConfig(
                    name=small_model['name'],
                    category='small',
                    status='valid',
                    dockerImage=small_model.get('full_path', ''),
                    size=small_model.get('file_size', 0) / (1024 * 1024) if small_model.get('file_size') else None,
                    description=small_model.get('description', ''),
                    enabled=True,
                    createdAt=small_model.get('registered_at', now),
                    updatedAt=now,
                )
                configs.append(cfg)
        return configs

    def get_config(self, config_id: str) -> Optional[ModelConfig]:
        for cfg in self._load_all():
            if cfg.id == config_id:
                return cfg
        return None

    def create_config(self, payload: ModelConfigCreate) -> ModelConfig:
        configs = self._load_all()
        now = _now_iso()
        cfg = ModelConfig(
            id=str(uuid.uuid4()),
            name=payload.name.strip() if payload.name else "",
            category=payload.category or "small",
            status=payload.status or "unknown",
            apiKey=payload.apiKey.strip() if payload.apiKey else None,
            exampleCode=payload.exampleCode.strip() if payload.exampleCode else None,
            dockerImage=payload.dockerImage.strip() if payload.dockerImage else None,
            size=payload.size,
            description=payload.description.strip() if payload.description else None,
            enabled=payload.enabled if payload.enabled is not None else True,
            graphApiCode=payload.graphApiCode.strip() if payload.graphApiCode else None,
            graphApiKey=payload.graphApiKey.strip() if payload.graphApiKey else None,
            # 兼容旧字段
            arch=payload.arch.strip() if payload.arch else None,
            weightsPath=payload.weightsPath.strip() if payload.weightsPath else None,
            graphUri=payload.graphUri.strip() if payload.graphUri else None,
            createdAt=now,
            updatedAt=now,
        )
        configs.append(cfg)
        self._persist(configs)
        return cfg

    def update_config(self, config_id: str, payload: ModelConfigUpdate) -> Optional[ModelConfig]:
        configs = self._load_all()
        updated = None
        new_configs: List[ModelConfig] = []
        for cfg in configs:
            if cfg.id != config_id:
                new_configs.append(cfg)
                continue
            data = cfg.dict()
            # 更新新字段
            if payload.name is not None:
                data["name"] = payload.name.strip()
            if payload.category is not None:
                data["category"] = payload.category
            if payload.status is not None:
                data["status"] = payload.status
            # 大模型字段
            if payload.apiKey is not None:
                data["apiKey"] = payload.apiKey.strip() if payload.apiKey else None
            if payload.exampleCode is not None:
                data["exampleCode"] = payload.exampleCode.strip() if payload.exampleCode else None
            # 小模型字段
            if payload.dockerImage is not None:
                data["dockerImage"] = payload.dockerImage.strip() if payload.dockerImage else None
            if payload.size is not None:
                data["size"] = payload.size
            if payload.description is not None:
                data["description"] = payload.description.strip() if payload.description else None
            if payload.enabled is not None:
                data["enabled"] = payload.enabled
            # 图谱字段
            if payload.graphApiCode is not None:
                data["graphApiCode"] = payload.graphApiCode.strip() if payload.graphApiCode else None
            if payload.graphApiKey is not None:
                data["graphApiKey"] = payload.graphApiKey.strip() if payload.graphApiKey else None
            # 兼容旧字段
            if payload.arch is not None:
                data["arch"] = payload.arch.strip() if payload.arch else None
            if payload.weightsPath is not None:
                data["weightsPath"] = payload.weightsPath.strip() if payload.weightsPath else None
            if payload.graphUri is not None:
                data["graphUri"] = payload.graphUri.strip() if payload.graphUri else None
            data["updatedAt"] = _now_iso()
            updated = ModelConfig(**data)
            new_configs.append(updated)
        if updated is None:
            return None
        self._persist(new_configs)
        return updated

    def delete_config(self, config_id: str) -> bool:
        configs = self._load_all()
        new_configs = [cfg for cfg in configs if cfg.id != config_id]
        if len(new_configs) == len(configs):
            return False
        self._persist(new_configs)
        return True

    # 校验与探测
    def validate_weights_path(self, path_str: str) -> dict:
        path_str = (path_str or "").strip()
        if not path_str:
            return {"ok": False, "message": "路径不能为空"}

        if re.match(r"^(s3|https?)://", path_str):
            return {"ok": True, "message": "远程路径格式合法（未实际探测）"}
        if re.match(r"^[A-Za-z]:\\", path_str) or re.match(r"^/|^\.", path_str):
            exists = Path(path_str).expanduser().exists()
            if exists:
                return {"ok": True, "message": "本地路径存在"}
            return {"ok": False, "message": "本地路径不存在"}
        return {"ok": False, "message": "不支持的路径格式，请使用 s3/http/本地路径"}

    def validate_graph_uri(self, uri: str) -> dict:
        uri = (uri or "").strip()
        if not uri:
            return {"ok": False, "message": "图谱地址不能为空"}
        if re.match(r"^(bolt|neo4j)://", uri):
            return {"ok": True, "message": "Neo4j URI 格式合法（未实际连接）"}
        if re.match(r"^https?://", uri):
            return {"ok": True, "message": "HTTP(S) 图谱地址格式合法（未实际探测）"}
        if re.match(r"^[A-Za-z]:\\", uri) or re.match(r"^/|^\.", uri):
            exists = Path(uri).expanduser().exists()
            return {"ok": exists, "message": "本地文件存在" if exists else "本地文件不存在"}
        return {"ok": False, "message": "不支持的图谱地址格式"}

    def test_graph_uri(self, uri: str) -> dict:
        """占位探测：目前仅返回格式校验结果"""
        validation = self.validate_graph_uri(uri)
        if not validation["ok"]:
            return {"ok": False, "message": validation["message"]}
        # TODO: 若后续集成 Neo4j/Age 驱动，可在此处进行真实连通性测试
        return {"ok": True, "message": "格式合法，未执行真实连通性测试"}


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "model_configs.json"
model_config_service = ModelConfigService(DATA_PATH)

# Re-export for backward compatibility
from app.shared.schemas.model_config import ModelConfig, ModelConfigCreate, ModelConfigUpdate
