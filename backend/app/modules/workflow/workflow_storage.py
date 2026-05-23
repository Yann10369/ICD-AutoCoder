"""工作流存储"""
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "workflows.json"


class WorkflowStorage:
    """基于JSON文件的工作流存储"""

    def __init__(self):
        DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not DATA_PATH.exists():
            DATA_PATH.write_text("[]", encoding="utf-8")

    def _now_iso(self) -> str:
        return datetime.utcnow().isoformat() + "Z"

    def _load_all(self) -> List[Dict]:
        raw = DATA_PATH.read_text(encoding="utf-8")
        if not raw.strip():
            return []
        return json.loads(raw)

    def _persist(self, data: List[Dict]) -> None:
        tmp_path = DATA_PATH.with_suffix(".tmp")
        tmp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_path.replace(DATA_PATH)

    def list_workflows(self) -> List[Dict]:
        """列出所有工作流"""
        workflows = self._load_all()
        # 返回简化信息，不包含nodes/edges大json
        return [
            {
                "id": wf.get("id"),
                "name": wf.get("name"),
                "createdAt": wf.get("createdAt"),
                "updatedAt": wf.get("updatedAt"),
            }
            for wf in workflows
        ]

    def get_workflow(self, workflow_id: str) -> Optional[Dict]:
        """获取完整工作流"""
        workflows = self._load_all()
        for wf in workflows:
            if wf.get("id") == workflow_id:
                return wf
        return None

    def create_workflow(self, payload: Dict) -> Dict:
        """创建工作流"""
        workflows = self._load_all()
        workflow_id = str(uuid.uuid4())
        now = self._now_iso()
        workflow = {
            "id": workflow_id,
            "name": payload.get("name", "untitled"),
            "nodes": payload.get("nodes", []),
            "edges": payload.get("edges", []),
            "createdAt": now,
            "updatedAt": now,
        }
        workflows.append(workflow)
        self._persist(workflows)
        return workflow

    def update_workflow(self, workflow_id: str, payload: Dict) -> Optional[Dict]:
        """更新工作流"""
        workflows = self._load_all()
        updated = None
        new_workflows = []
        for wf in workflows:
            if wf.get("id") == workflow_id:
                updated = {
                    **wf,
                    "name": payload.get("name", wf.get("name")),
                    "nodes": payload.get("nodes", wf.get("nodes")),
                    "edges": payload.get("edges", wf.get("edges")),
                    "updatedAt": self._now_iso(),
                }
                new_workflows.append(updated)
            else:
                new_workflows.append(wf)
        if updated is None:
            return None
        self._persist(new_workflows)
        return updated

    def delete_workflow(self, workflow_id: str) -> bool:
        """删除工作流"""
        workflows = self._load_all()
        new_workflows = [wf for wf in workflows if wf.get("id") != workflow_id]
        if len(new_workflows) == len(workflows):
            return False
        self._persist(new_workflows)
        return True


# 全局实例
workflow_storage = WorkflowStorage()
