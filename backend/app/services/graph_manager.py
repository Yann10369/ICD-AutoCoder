"""知识图谱管理模块"""
from typing import Dict, List, Optional, Any
from pathlib import Path
from app.core.config import settings
from app.core.logger import logger
from app.core.utils import load_json


class GraphManager:
    """知识图谱管理器"""
    
    def __init__(self):
        self.icd_hierarchy = {}
        self.umls_mappings = {}
        self.latest_predictions = {}
        self.latest_metadata = {}
        self._load_data()
    
    def _load_data(self):
        """加载知识图谱数据"""
        try:
            icd_path = Path(settings.ICD_HIERARCHY_PATH)
            if icd_path.exists():
                data = load_json(str(icd_path))
                # 检查是否是新的格式（包含predictions数据）
                if 'predictions' in data:
                    # 新格式：从predictions中提取icd_hierarchy
                    self.icd_hierarchy = data.get('icd_hierarchy', {})
                    self.latest_predictions = data.get('predictions', {})
                    self.latest_metadata = {
                        'timestamp': data.get('timestamp', ''),
                        'original_text': data.get('original_text', ''),
                        'model': data.get('model', ''),
                        'top_k': data.get('top_k', 10),
                        'threshold': data.get('threshold', 0.5)
                    }
                    logger.info(f"已加载最新预测结果（时间戳: {self.latest_metadata.get('timestamp', 'N/A')}）")
                else:
                    # 旧格式：直接使用icd_hierarchy
                    self.icd_hierarchy = data if isinstance(data, dict) else {}
                    self.latest_predictions = {}
                    self.latest_metadata = {}
                    logger.info("采用旧的格式")
            else:
                logger.warning(f"ICD层次结构文件不存在: {icd_path}")
                self.icd_hierarchy = self._init_default_icd_hierarchy()
                self.latest_predictions = {}
                self.latest_metadata = {}
            
            umls_path = Path(settings.UMLS_MAPPINGS_PATH)
            if umls_path.exists():
                self.umls_mappings = load_json(str(umls_path))
            else:
                logger.warning(f"UMLS映射文件不存在: {umls_path}")
                self.umls_mappings = {}
        except Exception as e:
            logger.error(f"加载知识图谱数据失败: {str(e)}")
            self.icd_hierarchy = self._init_default_icd_hierarchy()
            self.latest_predictions = {}
            self.latest_metadata = {}
    
    def reload_data(self):
        """重新加载数据（用于获取最新的预测结果）"""
        self._load_data()
    
    def get_latest_predictions(self) -> Dict[str, Any]:
        """获取最新的预测结果"""
        self.reload_data()
        return self.latest_predictions
    
    def get_latest_metadata(self) -> Dict[str, Any]:
        """获取最新预测的元数据"""
        return self.latest_metadata
    
    def _init_default_icd_hierarchy(self) -> Dict[str, Any]:
        return {
            "410": {
                "code": "410",
                "name": "Acute myocardial infarction",
                "parent": None,
                "children": ["410.0", "410.1", "410.7", "410.9"],
                "level": 1
            },
            "410.7": {
                "code": "410.7",
                "name": "Subendocardial infarction",
                "parent": "410",
                "children": ["410.71"],
                "level": 2
            },
            "410.71": {
                "code": "410.71",
                "name": "Subendocardial infarction, initial episode",
                "parent": "410.7",
                "children": [],
                "level": 3
            }
        }
    
    def query_icd(self, icd_code: str) -> Optional[Dict[str, Any]]:
        """查询ICD编码信息"""
        # 直接使用原始编码查询（保留点号）
        if icd_code in self.icd_hierarchy:
            return self.icd_hierarchy[icd_code]
        # 尝试移除点号查询
        icd_code_no_dot = icd_code.replace('.', '')
        if icd_code_no_dot in self.icd_hierarchy:
            return self.icd_hierarchy[icd_code_no_dot]
        # 模糊匹配
        for code, info in self.icd_hierarchy.items():
            code_normalized = code.replace('.', '')
            if code == icd_code or code_normalized == icd_code_no_dot:
                return info
            if code.startswith(icd_code) or icd_code.startswith(code):
                return info
        return None
    
    def get_hierarchy_path(self, icd_code: str) -> List[Dict[str, str]]:
        """获取ICD编码的层次路径"""
        path = []
        icd_info = self.query_icd(icd_code)
        if not icd_info:
            return path
        
        current = icd_info
        while current:
            path.insert(0, {'code': current['code'], 'name': current.get('name', '')})
            if current.get('parent'):
                current = self.query_icd(current['parent'])
            else:
                break
        return path
    
    def get_related_nodes(self, icd_code: str, depth: int = 2) -> Dict[str, List[Dict[str, Any]]]:
        """获取相关节点"""
        icd_info = self.query_icd(icd_code)
        if not icd_info:
            return {'nodes': [], 'edges': []}
        
        # 添加当前节点，包含概率信息
        current_node = {
            'id': icd_info['code'],
            'label': icd_info.get('name', icd_code) or icd_code,
            'level': icd_info.get('level', 0),
            'type': 'icd',
            'probability': icd_info.get('probability', 0.0)
        }
        nodes = [current_node]
        edges = []
        
        if icd_info.get('parent'):
            parent_info = self.query_icd(icd_info['parent'])
            if parent_info:
                parent_prob = parent_info.get('probability', 0.0)
                nodes.append({
                    'id': parent_info['code'],
                    'label': parent_info.get('name', parent_info['code']) or parent_info['code'],
                    'level': parent_info.get('level', 0),
                    'type': 'icd',
                    'probability': parent_prob
                })
                weight = max(parent_prob, icd_info.get('probability', 0.5))
                edges.append({
                    'source': parent_info['code'],
                    'target': icd_info['code'],
                    'type': 'parent-child',
                    'weight': weight if weight > 0 else 0.5
                })
        
        for child_code in icd_info.get('children', []):
            child_info = self.query_icd(child_code)
            if child_info:
                child_prob = child_info.get('probability', 0.0)
                nodes.append({
                    'id': child_info['code'],
                    'label': child_info.get('name', child_code) or child_code,
                    'level': child_info.get('level', 0),
                    'type': 'icd',
                    'probability': child_prob
                })
                weight = max(icd_info.get('probability', 0.5), child_prob)
                edges.append({
                    'source': icd_info['code'],
                    'target': child_code,
                    'type': 'parent-child',
                    'weight': weight if weight > 0 else 0.5
                })
        
        unique_nodes = {node['id']: node for node in nodes}
        return {'nodes': list(unique_nodes.values()), 'edges': edges}
    
    def filter_icd_by_constraints(self, candidates: List[Dict[str, Any]], constraints: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """根据语义约束过滤ICD编码"""
        if not constraints:
            return candidates
        
        filtered = []
        for candidate in candidates:
            icd_code = candidate.get('icd_code', '')
            icd_info = self.query_icd(icd_code)
            if not icd_info:
                continue
            
            if 'min_level' in constraints and icd_info.get('level', 0) < constraints['min_level']:
                continue
            if 'max_level' in constraints and icd_info.get('level', 0) > constraints['max_level']:
                continue
            if 'parent_code' in constraints:
                if icd_info.get('parent') != constraints['parent_code']:
                    path = self.get_hierarchy_path(icd_code)
                    parent_codes = [p['code'] for p in path]
                    if constraints['parent_code'] not in parent_codes:
                        continue
            
            filtered.append(candidate)
        return filtered
    
    def explain_icd_path(self, icd_code: str) -> Dict[str, Any]:
        """解释ICD编码的知识路径"""
        icd_info = self.query_icd(icd_code)
        if not icd_info:
            return {'icd_code': icd_code, 'exists': False, 'message': f'ICD编码 {icd_code} 未找到'}
        
        hierarchy_path = self.get_hierarchy_path(icd_code)
        related = self.get_related_nodes(icd_code)
        umls_info = self.umls_mappings.get(icd_code, {})
        
        return {
            'icd_code': icd_code,
            'icd_name': icd_info.get('name', ''),
            'exists': True,
            'hierarchy_path': hierarchy_path,
            'related_nodes': related['nodes'],
            'related_edges': related['edges'],
            'umls_mappings': umls_info,
            'level': icd_info.get('level', 0),
            'description': f"该ICD编码位于第{icd_info.get('level', 0)}层，属于{hierarchy_path[0]['name'] if hierarchy_path else '未知'}类别"
        }
    
    def search_semantic_similarity(self, concept: str, threshold: float = 0.7, max_results: int = 10) -> List[Dict[str, Any]]:
        """语义相似度检索"""
        concept_lower = concept.lower()
        results = []
        
        for icd_code, umls_data in self.umls_mappings.items():
            if isinstance(umls_data, dict):
                all_terms = umls_data.get('synonyms', []) + umls_data.get('aliases', []) + umls_data.get('concept_names', [])
                for term in all_terms:
                    if isinstance(term, str) and concept_lower in term.lower():
                        icd_info = self.query_icd(icd_code)
                        if icd_info:
                            results.append({
                                'icd_code': icd_code,
                                'icd_name': icd_info.get('name', ''),
                                'matched_term': term,
                                'similarity': 0.9,
                                'source': 'umls'
                            })
        
        for icd_code, icd_info in self.icd_hierarchy.items():
            name = icd_info.get('name', '').lower()
            similarity = self._calculate_string_similarity(concept_lower, name)
            if similarity >= threshold:
                if not any(r['icd_code'] == icd_code for r in results):
                    results.append({
                        'icd_code': icd_code,
                        'icd_name': icd_info.get('name', ''),
                        'matched_term': icd_info.get('name', ''),
                        'similarity': similarity,
                        'source': 'icd_hierarchy'
                    })
        
        medical_synonyms = self._get_medical_synonyms()
        if concept_lower in medical_synonyms:
            for synonym in medical_synonyms[concept_lower]:
                synonym_results = self.search_semantic_similarity(synonym, threshold=threshold, max_results=max_results)
                for result in synonym_results:
                    if not any(r['icd_code'] == result['icd_code'] for r in results):
                        result['matched_term'] = f"{concept} (via {synonym})"
                        result['similarity'] = min(1.0, result['similarity'] * 0.9)
                        results.append(result)
        
        seen_codes = set()
        unique_results = []
        for result in sorted(results, key=lambda x: x['similarity'], reverse=True):
            if result['icd_code'] not in seen_codes:
                seen_codes.add(result['icd_code'])
                unique_results.append(result)
                if len(unique_results) >= max_results:
                    break
        return unique_results
    
    def _calculate_string_similarity(self, str1: str, str2: str) -> float:
        """计算字符串相似度"""
        if str1 in str2 or str2 in str1:
            return 0.8
        words1 = set(str1.split())
        words2 = set(str2.split())
        if not words1 or not words2:
            return 0.0
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        return len(intersection) / len(union) if union else 0.0
    
    def _get_medical_synonyms(self) -> Dict[str, List[str]]:
        return {
            'heart attack': ['myocardial infarction', 'mi', 'acute myocardial infarction', 'cardiac infarction'],
            'myocardial infarction': ['heart attack', 'mi', 'acute myocardial infarction', 'cardiac infarction'],
            'mi': ['myocardial infarction', 'heart attack', 'acute myocardial infarction'],
            'chest pain': ['thoracic pain', 'precordial pain', 'angina'],
            'shortness of breath': ['dyspnea', 'difficulty breathing', 'breathlessness'],
            'dyspnea': ['shortness of breath', 'difficulty breathing', 'breathlessness'],
            'hypertension': ['high blood pressure', 'htn', 'elevated blood pressure'],
            'htn': ['hypertension', 'high blood pressure'],
            'diabetes': ['dm', 'diabetes mellitus', 'diabetic'],
            'dm': ['diabetes', 'diabetes mellitus'],
            'pneumonia': ['lung infection', 'pulmonary infection', 'respiratory infection'],
            'fever': ['pyrexia', 'elevated temperature', 'hyperthermia'],
            'headache': ['cephalgia', 'head pain', 'migraine'],
            'nausea': ['queasiness', 'feeling sick', 'stomach upset'],
            'vomiting': ['emesis', 'throwing up', 'regurgitation']
        }

graph_manager = GraphManager()

