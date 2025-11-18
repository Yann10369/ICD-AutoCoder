"""知识图谱API路由"""
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, List, Dict, Any

from app.services.graph_manager import graph_manager
from app.core.logger import logger

router = APIRouter()


@router.get("/query")
async def query_graph(
    icd: Optional[str] = Query(None, description="ICD编码"),
    depth: int = Query(2, description="查询深度")
):

    try:
        if not icd:
            raise HTTPException(status_code=400, detail="请提供ICD编码参数")
        
        # 获取相关节点和边
        result = graph_manager.get_related_nodes(icd, depth)
        
        # 获取ICD编码基本信息
        icd_info = graph_manager.query_icd(icd)
        
        return {
            "icd_code": icd,
            "icd_info": icd_info,
            "nodes": result["nodes"],
            "edges": result["edges"],
            "total_nodes": len(result["nodes"]),
            "total_edges": len(result["edges"])
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"图谱查询失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"图谱查询失败: {str(e)}")


@router.post("/visualize")
async def visualize_graph_from_predictions(
    predictions: Optional[Dict[str, Any]] = Body(None, description="预测结果数据")
):

    try:
        # 如果没有提供predictions，从icd_hierarchy.json读取最新的预测结果
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
        
        # 重新加载数据以获取最新的层次结构
        graph_manager.reload_data()
        
        # 获取top-3个ICD编码的图谱数据
        top_icds = icd_predictions[:3]
        
        all_nodes = {}
        all_edges = []
        paths = []
        
        for pred in top_icds:
            icd_code = pred.get('code', '')
            if not icd_code:
                continue
            
            # 获取ICD编码的图谱信息
            related = graph_manager.get_related_nodes(icd_code, depth=2)
            hierarchy_path = graph_manager.get_hierarchy_path(icd_code)
            
            # 合并节点
            for node in related.get('nodes', []):
                node_id = node.get('id', '')
                if node_id:
                    all_nodes[node_id] = node
            
            # 合并边
            all_edges.extend(related.get('edges', []))
            
            # 添加路径
            paths.append({
                'icd_code': icd_code,
                'icd_name': pred.get('description', ''),
                'probability': pred.get('probability', 0.0),
                'hierarchy_path': hierarchy_path,
                'related_nodes': related.get('nodes', [])
            })
        
        # 添加实体节点
        for entity_type, entity_list in entities.items():
            for entity in entity_list[:5]:  # 每个类型最多5个实体
                node_id = f"entity_{entity_type}_{entity}"
                if node_id not in all_nodes:
                    all_nodes[node_id] = {
                        'id': node_id,
                        'label': entity,
                        'type': entity_type,
                        'level': 0
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
async def get_visualize_graph():
    """获取最新的知识图谱可视化数据（从icd_hierarchy.json读取）"""
    try:
        predictions = graph_manager.get_latest_predictions()
        if not predictions:
            return {
                "nodes": [],
                "edges": [],
                "paths": [],
                "entities": {},
                "message": "暂无预测结果，请先运行预测"
            }
        
        # 使用与POST接口相同的逻辑
        icd_predictions = predictions.get('icdPredictions', [])
        entities = predictions.get('entities', {})
        
        if not icd_predictions:
            return {
                "nodes": [],
                "edges": [],
                "paths": [],
                "entities": entities
            }
        
        # 重新加载数据以获取最新的层次结构
        graph_manager.reload_data()
        
        # 获取top-3个ICD编码的图谱数据
        top_icds = icd_predictions[:3]
        
        all_nodes = {}
        all_edges = []
        paths = []
        
        for pred in top_icds:
            icd_code = pred.get('code', '')
            if not icd_code:
                continue
            
            # 获取ICD编码的图谱信息
            related = graph_manager.get_related_nodes(icd_code, depth=2)
            hierarchy_path = graph_manager.get_hierarchy_path(icd_code)
            
            # 合并节点
            for node in related.get('nodes', []):
                node_id = node.get('id', '')
                if node_id:
                    all_nodes[node_id] = node
            
            # 合并边
            all_edges.extend(related.get('edges', []))
            
            # 添加路径
            paths.append({
                'icd_code': icd_code,
                'icd_name': pred.get('description', ''),
                'probability': pred.get('probability', 0.0),
                'hierarchy_path': hierarchy_path,
                'related_nodes': related.get('nodes', [])
            })
        
        # 添加实体节点
        for entity_type, entity_list in entities.items():
            for entity in entity_list[:5]:  # 每个类型最多5个实体
                node_id = f"entity_{entity_type}_{entity}"
                if node_id not in all_nodes:
                    all_nodes[node_id] = {
                        'id': node_id,
                        'label': entity,
                        'type': entity_type,
                        'level': 0
                    }
        
        return {
            "nodes": list(all_nodes.values()),
            "edges": all_edges,
            "paths": paths,
            "entities": entities,
            "metadata": graph_manager.get_latest_metadata()
        }
    
    except Exception as e:
        logger.error(f"获取图谱可视化数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取图谱可视化数据失败: {str(e)}")


@router.get("/explain")
async def explain_graph_path(
    icd: str = Query(..., description="ICD编码")
):
    """返回知识路径
    
    返回ICD编码的层次路径和相关知识，用于解释预测结果
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
    icd: str = Query(..., description="ICD编码")
):
    """获取ICD编码的层次路径"""
    try:
        path = graph_manager.get_hierarchy_path(icd)
        
        if not path:
            raise HTTPException(status_code=404, detail=f"ICD编码 {icd} 未找到")
        
        return {
            "icd_code": icd,
            "hierarchy_path": path,
            "levels": len(path)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取层次路径失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取层次路径失败: {str(e)}")


@router.get("/search")
async def search_icd(
    query: str = Query(..., description="搜索关键词"),
    limit: int = Query(10, description="返回结果数量限制")
):
    """搜索ICD编码"""
    try:
        results = []
        query_lower = query.lower()
        
        # 在ICD层次结构中搜索
        for code, info in graph_manager.icd_hierarchy.items():
            name = info.get('name', '').lower()
            if query_lower in code or query_lower in name:
                results.append({
                    'code': code,
                    'name': info.get('name', ''),
                    'level': info.get('level', 0)
                })
                if len(results) >= limit:
                    break
        
        return {
            "query": query,
            "results": results,
            "total": len(results)
        }
    
    except Exception as e:
        logger.error(f"ICD搜索失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ICD搜索失败: {str(e)}")


@router.get("/semantic-similarity")
async def semantic_similarity_search(
    concept: str = Query(..., description="医学概念（如：heart attack, myocardial infarction）"),
    threshold: float = Query(0.7, description="相似度阈值（0.0-1.0）"),
    max_results: int = Query(10, description="最大返回结果数")
):
    """语义相似度检索
    
    例如：heart attack ≈ myocardial infarction
    根据医学概念查找相似的ICD编码
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
            "total": len(results)
        }
    
    except Exception as e:
        logger.error(f"语义相似度检索失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"语义相似度检索失败: {str(e)}")
