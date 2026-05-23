"""知识图谱相关Schema"""
from typing import List, Optional
from pydantic import BaseModel


class GraphNode(BaseModel):
    """图谱节点"""
    id: str
    label: Optional[str] = None
    type: Optional[str] = "default"
    probability: Optional[float] = 0.0


class GraphEdge(BaseModel):
    """图谱边"""
    id: Optional[str] = None
    source: str
    target: str
    weight: Optional[float] = 0.5
    type: Optional[str] = "default"


class GraphVisualizationResponse(BaseModel):
    """图谱可视化响应"""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    entities: Optional[dict] = None
