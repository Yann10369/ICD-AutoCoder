"""知识图谱管理模块 - UMLS API 驱动"""
from typing import Dict, List, Optional, Any
from pathlib import Path
import json
import requests
from app.core.config import settings
from app.core.logger import logger
from app.core.utils import load_json


class UMLSClient:
    """UMLS API 客户端 - 封装所有 UMLS 接口调用"""

    # 高价值关系类型过滤
    HIGH_VALUE_RELATIONS = {
        'RO', 'RB', 'RQ', 'CHD',  # UMLS标准关系代码
        'isa', 'associated_with', 'may_be_treated_by',
        'has_finding_site', 'due_to', 'manifestation_of',
        'site_of', 'mapped_to'
    }

    # TUI 到语义类型名称和颜色的映射
    TUI_COLOR_MAP = {
        'T047': {'name': 'Disease or Syndrome', 'color': '#FF6B6B', 'icon': 'disease'},
        'T121': {'name': 'Pharmacologic Substance', 'color': '#4ECDC4', 'icon': 'drug'},
        'T023': {'name': 'Body Part, Organ, or Organ Component', 'color': '#95E1D3', 'icon': 'anatomy'},
        'T184': {'name': 'Sign or Symptom', 'color': '#F38181', 'icon': 'symptom'},
        'T060': {'name': 'Therapeutic or Preventive Procedure', 'color': '#AA96DA', 'icon': 'treatment'},
        'T109': {'name': 'Organic Chemical', 'color': '#FCBAD3', 'icon': 'chemical'},
        'T033': {'name': 'Finding', 'color': '#A8D8EA', 'icon': 'finding'},
        'T078': {'name': 'Disease or Syndrome', 'color': '#FF6B6B', 'icon': 'disease'},
    }

    # 关系类型到可读标签的映射
    RELATION_LABEL_MAP = {
        'RO': 'related to',
        'RB': 'broader than',
        'RQ': 'related and possibly synonymous',
        'CHD': 'has child',
        'isa': 'is a',
        'associated_with': 'associated with',
        'may_be_treated_by': 'may be treated by',
        'has_finding_site': 'has finding site',
        'due_to': 'due to',
        'manifestation_of': 'manifestation of',
        'site_of': 'site of',
        'mapped_to': 'mapped to',
        'parent-child': 'classified under',
    }

    # 本地ICD层级数据（UMLS API不可用时的回退）
    LOCAL_ICD_HIERARCHY = {
        'I21': {'name': '急性心肌梗死', 'parent': 'I20-I25'},
        'I21.9': {'name': '急性心肌梗死，未特指', 'parent': 'I21'},
        'I25': {'name': '慢性缺血性心脏病', 'parent': 'I20-I25'},
        'I25.10': {'name': '动脉粥样硬化性心脏病', 'parent': 'I25'},
        'I25.2': {'name': '陈旧性心肌梗死', 'parent': 'I25'},
        'I20': {'name': '心绞痛', 'parent': 'I20-I25'},
        'I20.9': {'name': '心绞痛，未特指', 'parent': 'I20'},
        'I10': {'name': '原发性高血压', 'parent': 'I10-I16'},
        'I50': {'name': '心力衰竭', 'parent': 'I50'},
        'I50.9': {'name': '心力衰竭，未特指', 'parent': 'I50'},
        'I50.30': {'name': '舒张性心力衰竭', 'parent': 'I50'},
        'I48': {'name': '心房颤动和扑动', 'parent': 'I47-I49'},
        'I48.91': {'name': '心房颤动', 'parent': 'I48'},
        'I73': {'name': '其他外周血管疾病', 'parent': 'I70-I79'},
        'I73.9': {'name': '外周血管疾病，未特指', 'parent': 'I73'},
        '428': {'name': '心力衰竭', 'parent': '390-459'},
        '428.0': {'name': '充血性心力衰竭，未特指', 'parent': '428'},
        '401': {'name': '原发性高血压', 'parent': '401-405'},
        '401.9': {'name': '原发性高血压，未特指', 'parent': '401'},
    }

    def __init__(self):
        # 从环境变量或配置读取UMLS API Key，不使用硬编码默认值
        import os
        self.api_key = getattr(settings, 'UMLS_API_KEY', None) or os.environ.get('UMLS_API_KEY', '')
        if not self.api_key:
            logger.warning("UMLS_API_KEY未配置，图谱API调用可能失败")
        self.base_url = 'https://uts-ws.nlm.nih.gov/rest'
        self.version = 'current'
        self.source = 'ICD10CM'
        self.use_local_data = getattr(settings, 'USE_MOCK_MODE', True)
        logger.info(f"UMLS Client 初始化完成，Source: {self.source}, 本地数据模式: {self.use_local_data}")

    def _call_api(self, endpoint: str, params: Dict = None) -> Optional[Dict[str, Any]]:
        """调用 UMLS API"""
        url = f"{self.base_url}/{endpoint}"
        default_params = {'apiKey': self.api_key}
        if params:
            default_params.update(params)

        try:
            response = requests.get(url, params=default_params, timeout=60)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"UMLS API 调用失败 ({url}): {str(e)}")
            return None
        except Exception as e:
            logger.error(f"UMLS API 响应解析失败: {str(e)}")
            return None

    def _extract_cui(self, concept_uri: str) -> str:
        """从 Concept URI 中提取 CUI"""
        if not concept_uri:
            return ''
        return concept_uri.rstrip('/').split('/')[-1]

    def _search_cui_for_icd(self, icd_code: str) -> str:
        """通过搜索接口获取 ICD 编码对应的 CUI"""
        try:
            endpoint = f"search/{self.version}?string={icd_code}&sabs=ICD10CM&searchType=exact&inputType=sourceUi"
            result = self._call_api(endpoint)

            if not result or 'result' not in result:
                return ''

            results = result['result'].get('results', [])
            if results:
                # 返回第一个结果的 CUI
                return results[0].get('ui', '')

            return ''
        except Exception as e:
            logger.warning(f"搜索 CUI 失败: {e}")
            return ''

    # ============================================
    # 阶段一：获取中心节点信息与 CUI 映射
    # ============================================
    def get_source_info(self, icd_code: str) -> Optional[Dict[str, Any]]:
        """获取 ICD 编码的基础信息和 CUI"""
        endpoint = f"content/{self.version}/source/{self.source}/{icd_code}"
        result = self._call_api(endpoint)

        if not result or 'result' not in result:
            return None

        data = result['result']
        concept_uri = data.get('concepts', '')

        # 尝试从 concepts 字段获取 CUI，如果是搜索链接则调用搜索接口
        cui = ''
        if concept_uri:
            if 'search' in concept_uri.lower():
                # 需要通过搜索接口获取真实 CUI
                cui = self._search_cui_for_icd(icd_code)
            else:
                cui = self._extract_cui(concept_uri)

        return {
            'icd_code': icd_code,
            'cui': cui,
            'name': data.get('name', ''),
            'root_source': data.get('rootSource', ''),
            'atom_count': data.get('atomCount', 0),
            'obsolete': data.get('obsolete', False),
            'suppressible': data.get('suppressible', False),
            'raw_data': data
        }

    # ============================================
    # 阶段二：构建垂直分类层（ICD 本体结构）
    # ============================================
    def get_parents(self, icd_code: str) -> List[Dict[str, str]]:
        """获取父节点列表"""
        # 优先使用本地数据
        if self.use_local_data:
            return self._get_local_parents(icd_code)

        endpoint = f"content/{self.version}/source/{self.source}/{icd_code}/parents"
        result = self._call_api(endpoint)

        if not result or 'result' not in result:
            # API失败时回退到本地数据
            return self._get_local_parents(icd_code)

        parents = []
        for item in result['result']:
            parents.append({
                'id': item.get('ui', ''),
                'code': item.get('ui', ''),
                'name': item.get('name', ''),
                'concept_uri': item.get('concept', ''),
                'cui': self._extract_cui(item.get('concept', ''))
            })

        return parents

    def _get_local_parents(self, icd_code: str) -> List[Dict[str, str]]:
        """从本地数据获取父节点"""
        if icd_code not in self.LOCAL_ICD_HIERARCHY:
            return []

        parent_code = self.LOCAL_ICD_HIERARCHY[icd_code].get('parent')
        if not parent_code:
            return []

        parent_name = self.LOCAL_ICD_HIERARCHY.get(parent_code, {}).get('name', parent_code)
        return [{
            'id': parent_code,
            'code': parent_code,
            'name': parent_name,
            'concept_uri': '',
            'cui': ''
        }]

    def get_children(self, icd_code: str) -> List[Dict[str, str]]:
        """获取子节点列表"""
        # 优先使用本地数据
        if self.use_local_data:
            return self._get_local_children(icd_code)

        endpoint = f"content/{self.version}/source/{self.source}/{icd_code}/children"
        result = self._call_api(endpoint)

        if not result or 'result' not in result:
            # API失败时回退到本地数据
            return self._get_local_children(icd_code)

        children = []
        for item in result['result']:
            children.append({
                'id': item.get('ui', ''),
                'code': item.get('ui', ''),
                'name': item.get('name', ''),
                'concept_uri': item.get('concept', ''),
                'cui': self._extract_cui(item.get('concept', ''))
            })

        return children

    def _get_local_children(self, icd_code: str) -> List[Dict[str, str]]:
        """从本地数据获取子节点"""
        children = []
        for code, data in self.LOCAL_ICD_HIERARCHY.items():
            if data.get('parent') == icd_code:
                children.append({
                    'id': code,
                    'code': code,
                    'name': data.get('name', code),
                    'concept_uri': '',
                    'cui': ''
                })
        return children

    def get_ancestors(self, icd_code: str) -> List[Dict[str, str]]:
        """获取所有祖先节点（完整分类路径）"""
        # 优先使用本地数据
        if self.use_local_data:
            return self._get_local_ancestors(icd_code)

        endpoint = f"content/{self.version}/source/{self.source}/{icd_code}/ancestors"
        result = self._call_api(endpoint)

        if not result or 'result' not in result:
            # API失败时回退到本地数据
            return self._get_local_ancestors(icd_code)

        ancestors = []
        for item in result['result']:
            ancestors.append({
                'id': item.get('ui', ''),
                'code': item.get('ui', ''),
                'name': item.get('name', ''),
                'cui': self._extract_cui(item.get('concept', ''))
            })

        return ancestors

    def _get_local_ancestors(self, icd_code: str) -> List[Dict[str, str]]:
        """从本地数据获取所有祖先节点"""
        ancestors = []
        current_code = icd_code

        # 向上遍历直到没有父节点
        while True:
            parent = self._get_local_parents(current_code)
            if not parent:
                break
            parent_code = parent[0]['code']
            ancestors.append(parent[0])
            current_code = parent_code
            # 防止无限循环，最多5层
            if len(ancestors) >= 5:
                break

        return ancestors

    # ============================================
    # 阶段三：构建水平语义关系层
    # ============================================
    def get_cui_info(self, cui: str) -> Optional[Dict[str, Any]]:
        """获取 CUI 的语义类型信息"""
        if not cui:
            return None

        endpoint = f"content/{self.version}/CUI/{cui}"
        result = self._call_api(endpoint)

        if not result or 'result' not in result:
            return None

        data = result['result']
        semantic_types = data.get('semanticTypes', [])

        # 提取 TUI 和语义类型名称
        tuis = []
        for st in semantic_types:
            tui_uri = st.get('uri', '')
            tui = tui_uri.rstrip('/').split('/')[-1] if tui_uri else ''
            tuis.append({
                'name': st.get('name', ''),
                'tui': tui
            })

        return {
            'cui': cui,
            'name': data.get('name', ''),
            'semantic_types': tuis,
            'atom_count': data.get('atomCount', 0),
            'cvmember_count': data.get('cvmemberCount', 0)
        }

    def get_relations(self, cui: str, filter_high_value: bool = True) -> List[Dict[str, Any]]:
        """获取 CUI 的语义关系"""
        if not cui:
            return []

        endpoint = f"content/{self.version}/CUI/{cui}/relations"
        result = self._call_api(endpoint)

        if not result or 'result' not in result:
            return []

        relations = []
        for item in result['result']:
            rel_label = item.get('relationLabel', '')

            # 过滤高价值关系
            if filter_high_value and rel_label not in self.HIGH_VALUE_RELATIONS:
                continue

            target_uri = item.get('relatedId', '')
            target_cui = self._extract_cui(target_uri)

            relations.append({
                'id': target_cui,
                'relation_label': rel_label,
                'relation_name': self.RELATION_LABEL_MAP.get(rel_label, rel_label),
                'target_cui': target_cui,
                'target_name': item.get('relatedIdName', ''),
                'source': item.get('rootSource', ''),
                'additional_relation': item.get('additionalRelationLabel', '')
            })

        return relations

    def get_definitions(self, cui: str, max_definitions: int = 3) -> List[Dict[str, str]]:
        """获取 CUI 的文字定义（用于悬停提示）"""
        if not cui:
            return []

        endpoint = f"content/{self.version}/CUI/{cui}/definitions"
        result = self._call_api(endpoint)

        if not result or 'result' not in result:
            return []

        definitions = []
        sources_priority = ['NCI', 'MSH', 'CSP', 'MEDLINEPLUS']  # 优先来源

        # 按优先级排序
        sorted_items = sorted(
            result['result'],
            key=lambda x: sources_priority.index(x.get('rootSource', ''))
            if x.get('rootSource', '') in sources_priority else 999
        )

        for item in sorted_items[:max_definitions]:
            definitions.append({
                'source': item.get('rootSource', ''),
                'definition': item.get('value', '')
            })

        return definitions

    def get_tui_info(self, tui: str) -> Optional[Dict[str, str]]:
        """获取 TUI 的语义网络信息（用于配色）"""
        if tui in self.TUI_COLOR_MAP:
            return self.TUI_COLOR_MAP[tui]

        # 尝试调用 API 获取（通常不需要，我们有映射表）
        endpoint = f"semantic-network/{self.version}/TUI/{tui}"
        result = self._call_api(endpoint)

        if result and 'result' in result:
            return {
                'name': result['result'].get('name', ''),
                'color': '#999999',
                'icon': 'default'
            }

        return {'name': 'Unknown', 'color': '#CCCCCC', 'icon': 'default'}


class GraphManager:
    """知识图谱管理器 - UMLS 驱动的三层架构"""

    def __init__(self):
        self.umls = UMLSClient()
        self.icd_hierarchy = {}
        self.latest_predictions = {}
        self.latest_metadata = {}
        self._load_local_data()

    def _load_local_data(self):
        """从 JSON 文件加载本地数据作为回退方案"""
        try:
            icd_path = Path(settings.ICD_HIERARCHY_PATH)
            if icd_path.exists():
                data = load_json(str(icd_path))
                if 'predictions' in data:
                    self.icd_hierarchy = data.get('icd_hierarchy', {})
                    self.latest_predictions = data.get('predictions', {})
                    self.latest_metadata = {
                        'timestamp': data.get('timestamp', ''),
                        'original_text': data.get('original_text', ''),
                        'model': data.get('model', ''),
                        'top_k': data.get('top_k', 10),
                        'threshold': data.get('threshold', 0.5)
                    }
                    logger.info("已加载本地 ICD 层次数据")
                else:
                    self.icd_hierarchy = data if isinstance(data, dict) else {}
        except Exception as e:
            logger.warning(f"加载本地数据失败: {str(e)}，将完全依赖 UMLS API")

    def reload_data(self):
        """重新加载本地数据"""
        self._load_local_data()

    def get_latest_predictions(self) -> Dict[str, Any]:
        """获取最新预测结果"""
        return self.latest_predictions

    def get_latest_metadata(self) -> Dict[str, Any]:
        """获取最新预测元数据"""
        return self.latest_metadata

    # ============================================
    # 三层架构图谱构建核心方法
    # ============================================
    def build_graph(self, icd_code: str, depth: int = 2) -> Dict[str, Any]:
        """
        构建完整的三层知识图谱

        第一层: 垂直分类层（ICD 本体结构）- parents/children/ancestors
        第二层: 水平语义关系层（医学知识）- relations（疾病/药物/解剖/症状）
        第三层: 元数据层（定义/语义类型）

        返回: ECharts 兼容的 {nodes: [], edges: []} 格式
        """
        logger.info(f"开始构建 ICD {icd_code} 的知识图谱")

        # 第一步：获取中心节点信息（阶段一）
        center_info = self.umls.get_source_info(icd_code)
        if not center_info:
            # 回退到本地数据
            return self._build_local_graph(icd_code)

        cui = center_info.get('cui', '')
        center_name = center_info.get('name', icd_code)

        # 并发获取层级关系（阶段二）
        parents = self.umls.get_parents(icd_code)
        children = self.umls.get_children(icd_code)

        # 获取语义信息（阶段三）
        cui_info = self.umls.get_cui_info(cui) if cui else None
        relations = self.umls.get_relations(cui) if cui else []
        definitions = self.umls.get_definitions(cui) if cui else []

        # 组装图谱数据
        return self._assemble_graph(
            center_info,
            parents,
            children,
            relations,
            cui_info,
            definitions
        )

    def _assemble_graph(
        self,
        center_info: Dict,
        parents: List[Dict],
        children: List[Dict],
        relations: List[Dict],
        cui_info: Optional[Dict],
        definitions: List[Dict]
    ) -> Dict[str, Any]:
        """组装成 ECharts 兼容的图谱格式"""
        nodes = []
        edges = []
        categories = []  # ECharts 分类列表

        icd_code = center_info.get('icd_code', '')
        cui = center_info.get('cui', '')
        center_name = center_info.get('name', icd_code)

        # 定义分类（用于 ECharts 配色和图例）
        category_map = {
            'center': {'name': '中心疾病', 'color': '#FF6B6B', 'index': 0},
            'parent': {'name': '上级分类', 'color': '#FF8888', 'index': 1},
            'child': {'name': '亚型疾病', 'color': '#FFAAAA', 'index': 2},
            'related': {'name': '相关概念', 'color': '#95E1D3', 'index': 3},
            'drug': {'name': '治疗药物', 'color': '#4ECDC4', 'index': 4},
            'anatomy': {'name': '解剖部位', 'color': '#6BCB77', 'index': 5},
            'symptom': {'name': '症状体征', 'color': '#F38181', 'index': 6},
        }

        # 构建 ECharts categories 数组
        for cat_name, cat_info in category_map.items():
            categories.append({
                'name': cat_info['name'],
                'itemStyle': {'color': cat_info['color']}
            })

        # 获取中心节点的语义类型和颜色
        semantic_types = cui_info.get('semantic_types', []) if cui_info else []

        # 第一层：添加中心节点（ECharts 兼容格式）
        center_node = {
            'id': icd_code,
            'name': center_name,  # ECharts 用 name 显示标签
            'value': 100,  # ECharts 用 value 决定节点大小
            'category': 0,  # 分类索引
            'cui': cui,
            'type': 'center',
            'level': 0,
            'color': category_map['center']['color'],
            'definitions': definitions,
            'semantic_types': semantic_types,
            'symbolSize': 50,
            'itemStyle': {'color': category_map['center']['color']},
            'label': {'show': True, 'fontSize': 14, 'fontWeight': 'bold'},
        }
        nodes.append(center_node)

        # 第一层：添加父节点（垂直分类层）
        for parent in parents:
            parent_code = parent.get('code', '')
            parent_name = parent.get('name', '')

            nodes.append({
                'id': parent_code,
                'name': parent_name,  # ECharts 兼容字段
                'value': 80,
                'category': 1,
                'cui': parent.get('cui', ''),
                'type': 'parent',
                'level': -1,
                'color': category_map['parent']['color'],
                'symbolSize': 40,
                'itemStyle': {'color': category_map['parent']['color']},
                'label': {'show': True, 'fontSize': 12},
            })

            edges.append({
                'source': parent_code,
                'target': icd_code,
                'label': {'show': True, 'formatter': '属于', 'fontSize': 10},
                'lineStyle': {'width': 3, 'color': '#FF9999', 'curveness': 0},
                'type': 'parent-child',
            })

        # 第一层：添加子节点（垂直分类层）
        for child in children:
            child_code = child.get('code', '')
            child_name = child.get('name', '')

            nodes.append({
                'id': child_code,
                'name': child_name,  # ECharts 兼容字段
                'value': 70,
                'category': 2,
                'cui': child.get('cui', ''),
                'type': 'child',
                'level': 1,
                'color': category_map['child']['color'],
                'symbolSize': 35,
                'itemStyle': {'color': category_map['child']['color']},
                'label': {'show': True, 'fontSize': 11},
            })

            edges.append({
                'source': icd_code,
                'target': child_code,
                'label': {'show': True, 'formatter': '包含', 'fontSize': 10},
                'lineStyle': {'width': 2, 'color': '#FFBBBB', 'curveness': 0.1},
                'type': 'parent-child',
            })

        # 第二层：添加语义关系节点（水平关联层）
        added_targets = set()
        for rel in relations:
            target_cui = rel.get('target_cui', '')
            target_name = rel.get('target_name', '')
            rel_label = rel.get('relation_name', rel.get('relation_label', ''))

            if not target_cui or target_cui in added_targets:
                continue

            # 根据关系类型确定节点分类
            rel_lower = rel_label.lower()
            if 'treat' in rel_lower or 'drug' in rel_lower:
                cat_type = 'drug'
                edge_label = '治疗'
            elif 'site' in rel_lower or 'anatomy' in rel_lower:
                cat_type = 'anatomy'
                edge_label = '发病部位'
            elif 'symptom' in rel_lower or 'finding' in rel_lower:
                cat_type = 'symptom'
                edge_label = '相关症状'
            else:
                cat_type = 'related'
                edge_label = '相关'

            cat_index = category_map[cat_type]['index']

            nodes.append({
                'id': target_cui,
                'name': target_name,  # ECharts 兼容字段
                'value': 50,
                'category': cat_index,
                'cui': target_cui,
                'type': cat_type,
                'level': 2,
                'color': category_map[cat_type]['color'],
                'symbolSize': 25,
                'itemStyle': {'color': category_map[cat_type]['color']},
                'label': {'show': True, 'fontSize': 10},
            })

            edges.append({
                'source': icd_code,
                'target': target_cui,
                'label': {'show': True, 'formatter': edge_label, 'fontSize': 9},
                'lineStyle': {
                    'width': 1.5,
                    'color': category_map[cat_type]['color'],
                    'type': 'dashed',
                    'curveness': 0.2
                },
                'type': 'semantic',
                'relation_type': rel_label,
            })

            added_targets.add(target_cui)
            if len(added_targets) >= 15:
                break

        return {
            'center': {
                'icd_code': icd_code,
                'cui': cui,
                'name': center_name,
                'definitions': definitions,
                'semantic_types': semantic_types
            },
            'nodes': nodes,
            'links': edges,  # ECharts 用 links（同时保留 edges 向后兼容）
            'edges': edges,
            'categories': categories,  # ECharts 分类配置
            'hierarchy': {
                'parents': parents,
                'children': children,
                'total_hierarchy_nodes': len(parents) + len(children) + 1
            },
            'semantic': {
                'relations_count': len(relations),
                'displayed_relations': len(added_targets)
            },
            'metadata': {
                'source': 'UMLS API',
                'echarts_compatible': True
            }
        }

    def _build_local_graph(self, icd_code: str) -> Dict[str, Any]:
        """本地数据回退方案（当 UMLS API 不可用时）- ECharts 兼容格式"""
        logger.warning(f"使用本地数据构建 {icd_code} 的图谱")

        icd_info = self.icd_hierarchy.get(icd_code, {
            'name': icd_code,
            'level': 0,
            'parent': None,
            'children': []
        })

        # 分类配置（与 UMLS 方案保持一致）
        categories = [
            {'name': '中心疾病', 'itemStyle': {'color': '#FF6B6B'}},
            {'name': '上级分类', 'itemStyle': {'color': '#FF8888'}},
            {'name': '亚型疾病', 'itemStyle': {'color': '#FFAAAA'}},
            {'name': '相关概念', 'itemStyle': {'color': '#95E1D3'}},
        ]

        # 中心节点
        nodes = [{
            'id': icd_code,
            'name': icd_info.get('name', icd_code),  # ECharts 用 name
            'value': 100,
            'category': 0,
            'type': 'center',
            'level': 0,
            'color': '#FF6B6B',
            'symbolSize': 50,
            'itemStyle': {'color': '#FF6B6B'},
            'label': {'show': True, 'fontSize': 14, 'fontWeight': 'bold'},
        }]

        edges = []

        # 添加父节点
        parent = icd_info.get('parent')
        if parent and parent in self.icd_hierarchy:
            parent_info = self.icd_hierarchy[parent]
            nodes.append({
                'id': parent,
                'name': parent_info.get('name', parent),
                'value': 80,
                'category': 1,
                'type': 'parent',
                'level': -1,
                'color': '#FF8888',
                'symbolSize': 40,
                'itemStyle': {'color': '#FF8888'},
                'label': {'show': True, 'fontSize': 12},
            })
            edges.append({
                'source': parent,
                'target': icd_code,
                'label': {'show': True, 'formatter': '属于', 'fontSize': 10},
                'lineStyle': {'width': 3, 'color': '#FF9999'},
                'type': 'parent-child',
            })

        # 添加子节点
        for child_code in icd_info.get('children', [])[:5]:
            if child_code in self.icd_hierarchy:
                child_info = self.icd_hierarchy[child_code]
                nodes.append({
                    'id': child_code,
                    'name': child_info.get('name', child_code),
                    'value': 70,
                    'category': 2,
                    'type': 'child',
                    'level': 1,
                    'color': '#FFAAAA',
                    'symbolSize': 35,
                    'itemStyle': {'color': '#FFAAAA'},
                    'label': {'show': True, 'fontSize': 11},
                })
                edges.append({
                    'source': icd_code,
                    'target': child_code,
                    'label': {'show': True, 'formatter': '包含', 'fontSize': 10},
                    'lineStyle': {'width': 2, 'color': '#FFBBBB'},
                    'type': 'parent-child',
                })

        return {
            'center': {'icd_code': icd_code, 'name': icd_info.get('name', icd_code)},
            'nodes': nodes,
            'links': edges,  # ECharts 标准字段名
            'edges': edges,  # 向后兼容
            'categories': categories,
            'hierarchy': {'parents': [parent] if parent else [], 'children': icd_info.get('children', [])},
            'metadata': {'source': 'Local JSON', 'echarts_compatible': True}
        }

    # ============================================
    # 兼容原有 API 接口的方法
    # ============================================
    def query_icd(self, icd_code: str) -> Optional[Dict[str, Any]]:
        """查询 ICD 编码信息（兼容原有接口）"""
        # 先查 UMLS
        info = self.umls.get_source_info(icd_code)
        if info:
            return {
                'code': icd_code,
                'name': info.get('name', ''),
                'cui': info.get('cui', ''),
                'level': len(self.umls.get_ancestors(icd_code)),
                'parent': info.get('raw_data', {}).get('parents', ''),
            }

        # 回退本地
        if icd_code in self.icd_hierarchy:
            return self.icd_hierarchy[icd_code]

        return None

    def get_related_nodes(self, icd_code: str, depth: int = 2) -> Dict[str, List[Dict]]:
        """获取相关节点（兼容原有接口）"""
        graph = self.build_graph(icd_code, depth)
        return {
            'nodes': graph.get('nodes', []),
            'edges': graph.get('edges', [])
        }

    def get_hierarchy_path(self, icd_code: str) -> List[Dict[str, str]]:
        """获取层次路径（兼容原有接口）"""
        ancestors = self.umls.get_ancestors(icd_code)
        center = self.umls.get_source_info(icd_code)

        path = []
        for ancestor in ancestors:
            path.append({
                'code': ancestor.get('code', ''),
                'name': ancestor.get('name', '')
            })

        if center:
            path.append({
                'code': icd_code,
                'name': center.get('name', icd_code)
            })

        return path

    def explain_icd_path(self, icd_code: str) -> Dict[str, Any]:
        """解释 ICD 知识路径（兼容原有接口）"""
        graph = self.build_graph(icd_code)

        return {
            'icd_code': icd_code,
            'icd_name': graph.get('center', {}).get('name', ''),
            'exists': len(graph.get('nodes', [])) > 0,
            'hierarchy_path': self.get_hierarchy_path(icd_code),
            'related_nodes': graph.get('nodes', []),
            'related_edges': graph.get('edges', []),
            'level': len(self.get_hierarchy_path(icd_code)),
            'description': f"该疾病属于 ICD-10 分类体系，包含 {len(graph.get('nodes', [])) - 1} 个关联概念"
        }

    def search_semantic_similarity(self, concept: str, threshold: float = 0.7, max_results: int = 10) -> List[Dict]:
        """语义相似度搜索（简化版）"""
        # 本地字符串匹配作为回退
        concept_lower = concept.lower()
        results = []

        for code, info in self.icd_hierarchy.items():
            name = info.get('name', '').lower()
            if concept_lower in name or name in concept_lower:
                results.append({
                    'icd_code': code,
                    'icd_name': info.get('name', ''),
                    'matched_term': info.get('name', ''),
                    'similarity': 0.8,
                    'source': 'local'
                })

        return sorted(results, key=lambda x: x['similarity'], reverse=True)[:max_results]


# 全局实例
graph_manager = GraphManager()
