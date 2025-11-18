"""可解释性模块"""
from typing import Dict, List, Optional, Any
from app.core.logger import logger
from app.services.graph_manager import graph_manager


class Explainer:
    """解释器"""
    
    def __init__(self):
        pass
    
    def explain_with_gradients(
        self,
        text: str,
        tokens: List[str],
        icd_code: str,
        attention_weights: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """使用Integrated Gradients/Attention进行解释"""
        # 模拟实现（实际应该计算真实的梯度/注意力权重）
        
        if attention_weights is None:
            # 生成模拟的注意力权重
            attention_weights = self._generate_mock_attention(tokens, icd_code)
        
        # 将注意力权重与tokens对应
        token_importances = []
        for i, token in enumerate(tokens):
            weight = attention_weights[i] if i < len(attention_weights) else 0.0
            token_importances.append({
                'token': token,
                'weight': weight,
                'importance': 'high' if weight > 0.7 else 'medium' if weight > 0.4 else 'low'
            })
        
        # 排序
        token_importances.sort(key=lambda x: x['weight'], reverse=True)
        
        # 提取关键词（权重最高的前N个）
        keywords = [item['token'] for item in token_importances[:10]]
        
        return {
            'icd_code': icd_code,
            'method': 'attention',
            'keywords': keywords,
            'token_importances': token_importances,
            'top_keywords': keywords[:5],
            'explanation': f"关键词 {', '.join(keywords[:5])} 对预测ICD编码 {icd_code} 贡献最大。"
        }
    
    def _generate_mock_attention(
        self, 
        tokens: List[str],
        icd_code: str
    ) -> List[float]:
        """生成模拟注意力权重"""
        weights = []
        
        # 根据token与ICD编码的相关性分配权重
        medical_keywords = {
            'heart', 'cardiac', 'myocardial', 'infarction', 'chest', 'pain',
            'acute', 'coronary', 'artery', 'disease', 'attack'
        }
        
        for token in tokens:
            if token in medical_keywords:
                weights.append(0.8)
            elif token.isdigit():
                weights.append(0.3)
            else:
                weights.append(0.1)
        
        # 归一化
        max_weight = max(weights) if weights else 1.0
        weights = [w / max_weight if max_weight > 0 else 0.1 for w in weights]
        
        return weights
    
    def explain_with_graph_path(
        self,
        icd_code: str,
        case_entities: Dict[str, List[str]]
    ) -> Dict[str, Any]:
        """结合知识图谱生成知识路径解释"""
        # 获取ICD编码的图谱信息
        graph_info = graph_manager.explain_icd_path(icd_code)
        
        # 构建解释
        explanation_parts = []
        
        # 1. ICD编码的基本信息
        explanation_parts.append(f"ICD编码 {icd_code} 表示 {graph_info.get('icd_name', '未知疾病')}。")
        
        # 2. 层次路径
        hierarchy_path = graph_info.get('hierarchy_path', [])
        if hierarchy_path:
            path_names = [p['name'] for p in hierarchy_path]
            explanation_parts.append(f"该编码属于 {' → '.join(path_names)} 类别。")
        
        # 3. 实体关联
        if case_entities:
            entities_text = []
            if case_entities.get('symptoms'):
                entities_text.append(f"症状: {', '.join(case_entities['symptoms'][:3])}")
            if case_entities.get('diseases'):
                entities_text.append(f"疾病: {', '.join(case_entities['diseases'][:3])}")
            
            if entities_text:
                explanation_parts.append(f"病例中的 {'; '.join(entities_text)} 支持该诊断。")
        
        # 4. 相关节点
        related_nodes = graph_info.get('related_nodes', [])
        if len(related_nodes) > 1:
            related_names = [n['label'] for n in related_nodes[1:3]]  # 取前2个相关节点
            explanation_parts.append(f"相关的ICD编码包括: {', '.join(related_names)}。")
        
        explanation = ' '.join(explanation_parts)
        
        return {
            'icd_code': icd_code,
            'method': 'graph_path',
            'explanation': explanation,
            'hierarchy_path': hierarchy_path,
            'related_nodes': related_nodes,
            'graph_structure': {
                'nodes': graph_info.get('related_nodes', []),
                'edges': graph_info.get('related_edges', [])
            }
        }
    
    def generate_comprehensive_explanation(
        self,
        text: str,
        preprocessed: Dict[str, Any],
        icd_code: str,
        probability: float,
        use_attention: bool = True,
        use_graph: bool = True
    ) -> Dict[str, Any]:
        """生成综合解释"""
        explanations = {}
        
        # 1. 注意力/梯度解释
        if use_attention:
            attention_exp = self.explain_with_gradients(
                text,
                preprocessed.get('tokens', []),
                icd_code
            )
            explanations['attention'] = attention_exp
        
        # 2. 知识图谱路径解释
        if use_graph:
            graph_exp = self.explain_with_graph_path(
                icd_code,
                preprocessed.get('entities', {})
            )
            explanations['graph'] = graph_exp
        
        # 3. 综合解释文本
        explanation_text_parts = []
        
        if use_attention and 'attention' in explanations:
            exp = explanations['attention']
            explanation_text_parts.append(
                f"基于注意力机制分析，关键词 {', '.join(exp['top_keywords'])} 对预测贡献最大。"
            )
        
        if use_graph and 'graph' in explanations:
            exp = explanations['graph']
            explanation_text_parts.append(exp['explanation'])
        
        explanation_text_parts.append(f"预测概率为 {probability:.2%}。")
        
        return {
            'icd_code': icd_code,
            'probability': probability,
            'explanations': explanations,
            'comprehensive_explanation': ' '.join(explanation_text_parts),
            'methods_used': ['attention' if use_attention else None, 'graph' if use_graph else None]
        }


# 全局解释器实例
explainer = Explainer()

