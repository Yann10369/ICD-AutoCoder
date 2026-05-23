"""知识图谱API路由 - UMLS 驱动的三层架构"""
from fastapi import APIRouter, HTTPException, Query, Body, Depends
from typing import Optional, List, Dict, Any

from app.modules.graph.graph_manager import graph_manager
from app.core.logger import logger
from app.modules.auth.schemas import TokenData
from app.modules.auth.security import require_permission

router = APIRouter()


@router.get("/")
async def graph_health_check():
    """图谱服务健康检查"""
    return {"status": "healthy", "service": "graph"}


@router.get("/query")
async def query_graph(
    icd: Optional[str] = Query(None, description="ICD 编码"),
    depth: int = Query(2, description="查询深度"),
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """
    查询 ICD 编码的完整知识图谱

    返回三层架构：
    - 第一层：垂直分类层（父节点、子节点）
    - 第二层：水平语义层（疾病关联、药物、解剖、症状）
    - 第三层：元数据层（定义、语义类型）
    """
    try:
        if not icd:
            raise HTTPException(status_code=400, detail="请提供ICD编码参数")

        # 使用 UMLS API 构建完整三层知识图谱
        result = graph_manager.build_graph(icd, depth)

        return {
            "icd_code": icd,
            "icd_info": result.get("center", {}),
            "nodes": result.get("nodes", []),
            "links": result.get("links", []),  # ECharts 标准字段名
            "edges": result.get("edges", []),  # 向后兼容
            "total_nodes": len(result.get("nodes", [])),
            "total_edges": len(result.get("edges", [])),
            "categories": result.get("categories", []),  # ECharts 分类配置
            "center": result.get("center", {}),
            "hierarchy": result.get("hierarchy", {}),
            "semantic": result.get("semantic", {}),
            "metadata": result.get("metadata", {})
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"图谱查询失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"图谱查询失败: {str(e)}")


@router.post("/visualize")
async def visualize_graph_from_predictions(
    predictions: Optional[Dict[str, Any]] = Body(None, description="预测结果数据"),
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """从预测结果生成可视化图谱数据"""
    try:
        # 如果没有提供predictions，从本地读取最新的预测结果
        if predictions is None:
            predictions = graph_manager.get_latest_predictions()
            if not predictions:
                return {
                    "nodes": [],
                    "edges": [],
                    "paths": [],
                    "entities": {},
                    "message": "暂无预测结果，请先运行预测"
                }

        # 从预测结果中提取ICD编码
        icd_predictions = predictions.get('icdPredictions', [])
        entities = predictions.get('entities', {})

        if not icd_predictions:
            return {
                "nodes": [],
                "edges": [],
                "paths": [],
                "entities": entities
            }

        # 获取 Top 3 个 ICD 编码的图谱数据
        top_icds = icd_predictions[:3]

        all_nodes = {}
        all_edges = []
        paths = []

        for pred in top_icds:
            icd_code = pred.get('code', '')
            if not icd_code:
                continue

            # 获取 ICD 编码的完整图谱信息
            graph_data = graph_manager.build_graph(icd_code, depth=1)
            hierarchy_path = graph_manager.get_hierarchy_path(icd_code)

            # 合并节点（去重）
            for node in graph_data.get('nodes', []):
                node_id = node.get('id', '')
                if node_id and node_id not in all_nodes:
                    all_nodes[node_id] = node

            # 合并边
            all_edges.extend(graph_data.get('edges', []))

            # 添加路径信息
            paths.append({
                'icd_code': icd_code,
                'icd_name': pred.get('description', '') or graph_data.get('center', {}).get('name', ''),
                'probability': pred.get('probability', 0.0),
                'hierarchy_path': hierarchy_path,
                'related_nodes_count': len(graph_data.get('nodes', []))
            })

        # 添加实体节点（从病历中提取的实体）
        for entity_type, entity_list in entities.items():
            for entity in entity_list[:5]:  # 每个类型最多5个实体
                node_id = f"entity_{entity_type}_{entity}"
                if node_id not in all_nodes:
                    all_nodes[node_id] = {
                        'id': node_id,
                        'label': entity,
                        'type': 'entity',
                        'category': entity_type,
                        'level': 99,
                        'color': '#FFD93D',
                        'symbolSize': 20
                    }

        return {
            "nodes": list(all_nodes.values()),
            "edges": all_edges,
            "paths": paths,
            "entities": entities,
            "metadata": graph_manager.get_latest_metadata()
        }

    except Exception as e:
        logger.error(f"生成图谱可视化数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"生成图谱可视化数据失败: {str(e)}")


@router.get("/visualize")
async def get_visualize_graph(
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """获取最新预测结果的知识图谱可视化数据"""
    try:
        return await visualize_graph_from_predictions(None)
    except Exception as e:
        logger.error(f"获取图谱可视化数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取图谱可视化数据失败: {str(e)}")


@router.get("/explain")
async def explain_icd_path(
    icd: str = Query(..., description="ICD 编码"),
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """
    返回 ICD 编码的完整知识路径解释

    包含：层级分类路径、语义关联节点、文字定义、语义类型等
    """
    try:
        result = graph_manager.explain_icd_path(icd)

        if not result.get('exists'):
            raise HTTPException(status_code=404, detail=result.get('message', 'ICD编码未找到'))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"知识路径解释失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"知识路径解释失败: {str(e)}")


@router.get("/hierarchy")
async def get_hierarchy_path(
    icd: str = Query(..., description="ICD 编码"),
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """获取 ICD 编码的完整分类层次路径（从根分类到该编码）"""
    try:
        path = graph_manager.get_hierarchy_path(icd)

        if not path:
            raise HTTPException(status_code=404, detail=f"ICD编码 {icd} 未找到")

        return {
            "icd_code": icd,
            "hierarchy_path": path,
            "levels": len(path),
            "path_description": " → ".join([p.get('code', '') for p in path])
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取层次路径失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取层次路径失败: {str(e)}")


@router.get("/search")
async def search_icd(
    query: str = Query(..., description="搜索关键词（疾病名称或ICD编码）"),
    limit: int = Query(10, description="返回结果数量限制"),
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """搜索 ICD 编码（本地字符串匹配 + 未来可扩展语义搜索）"""
    try:
        results = graph_manager.search_semantic_similarity(query, max_results=limit)
        return {
            "query": query,
            "results": results,
            "total": len(results),
            "search_method": "string_matching"
        }

    except Exception as e:
        logger.error(f"ICD搜索失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ICD搜索失败: {str(e)}")


@router.get("/semantic-similarity")
async def semantic_similarity_search(
    concept: str = Query(..., description="医学概念（如：heart attack, diabetes）"),
    threshold: float = Query(0.7, description="相似度阈值"),
    max_results: int = Query(10, description="最大返回结果数"),
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """
    语义相似度检索

    输入医学概念（如"心脏病"、"diabetes"），返回最相似的 ICD 编码
    （当前为简化实现：字符串匹配，未来可接入 UMLS 语义搜索）
    """
    try:
        results = graph_manager.search_semantic_similarity(
            concept=concept,
            threshold=threshold,
            max_results=max_results
        )

        return {
            "concept": concept,
            "threshold": threshold,
            "results": results,
            "total": len(results),
            "note": "当前使用字符串匹配，未来可升级为 UMLS 语义搜索"
        }

    except Exception as e:
        logger.error(f"语义相似度检索失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"语义相似度检索失败: {str(e)}")


@router.get("/parents")
async def get_icd_parents(
    icd: str = Query(..., description="ICD 编码"),
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """获取 ICD 编码的直接父节点（上一级分类）"""
    try:
        parents = graph_manager.umls.get_parents(icd)
        return {
            "icd_code": icd,
            "parents": parents,
            "count": len(parents)
        }
    except Exception as e:
        logger.error(f"获取父节点失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取父节点失败: {str(e)}")


@router.get("/children")
async def get_icd_children(
    icd: str = Query(..., description="ICD 编码"),
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """获取 ICD 编码的所有子节点（下一级亚型）"""
    try:
        children = graph_manager.umls.get_children(icd)
        return {
            "icd_code": icd,
            "children": children,
            "count": len(children)
        }
    except Exception as e:
        logger.error(f"获取子节点失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取子节点失败: {str(e)}")


@router.get("/ancestors")
async def get_icd_ancestors(
    icd: str = Query(..., description="ICD 编码"),
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """获取 ICD 编码的所有祖先节点（完整分类树路径）"""
    try:
        ancestors = graph_manager.umls.get_ancestors(icd)
        return {
            "icd_code": icd,
            "ancestors": ancestors,
            "depth": len(ancestors),
            "path": " → ".join([a.get('code', '') for a in ancestors]) + " → " + icd
        }
    except Exception as e:
        logger.error(f"获取祖先节点失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取祖先节点失败: {str(e)}")


@router.get("/relations")
async def get_icd_relations(
    icd: str = Query(..., description="ICD 编码"),
    filter_high_value: bool = Query(True, description="是否只返回高价值关系"),
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """获取 ICD 编码的语义关系（关联的药物、解剖、症状等）"""
    try:
        # 先获取 CUI
        source_info = graph_manager.umls.get_source_info(icd)
        if not source_info:
            raise HTTPException(status_code=404, detail=f"ICD编码 {icd} 未找到")

        cui = source_info.get('cui', '')
        if not cui:
            return {
                "icd_code": icd,
                "cui": None,
                "relations": [],
                "count": 0,
                "note": "该编码未映射到 UMLS CUI"
            }

        relations = graph_manager.umls.get_relations(cui, filter_high_value=filter_high_value)

        # 按关系类型统计
        relation_types = {}
        for rel in relations:
            rel_type = rel.get('relation_label', '')
            relation_types[rel_type] = relation_types.get(rel_type, 0) + 1

        return {
            "icd_code": icd,
            "icd_name": source_info.get('name', ''),
            "cui": cui,
            "relations": relations,
            "count": len(relations),
            "relation_types": relation_types,
            "filter_enabled": filter_high_value
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取语义关系失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取语义关系失败: {str(e)}")


@router.get("/definitions")
async def get_icd_definitions(
    icd: str = Query(..., description="ICD 编码"),
    max_definitions: int = Query(3, description="最大定义数量"),
    _: TokenData = Depends(require_permission("graph", "read")),
):
    """获取 ICD 编码的官方文字定义（用于前端悬停提示）"""
    try:
        source_info = graph_manager.umls.get_source_info(icd)
        if not source_info:
            raise HTTPException(status_code=404, detail=f"ICD编码 {icd} 未找到")

        cui = source_info.get('cui', '')
        if not cui:
            return {
                "icd_code": icd,
                "icd_name": source_info.get('name', ''),
                "cui": None,
                "definitions": [],
                "note": "该编码未映射到 UMLS CUI"
            }

        definitions = graph_manager.umls.get_definitions(cui, max_definitions)

        return {
            "icd_code": icd,
            "icd_name": source_info.get('name', ''),
            "cui": cui,
            "definitions": definitions,
            "count": len(definitions)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取定义失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取定义失败: {str(e)}")
