/**
 * 知识图谱大厅 - 复用GraphViewer已验证的Cytoscape逻辑
 */
import { useState, useEffect, useRef } from 'react';
import { Network, Search, Filter, ZoomIn, ZoomOut, Maximize, Download, Layers, RotateCcw, ChevronRight, ChevronDown, Info, Loader2 } from 'lucide-react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

// 注册布局扩展
cytoscape.use(coseBilkent);

// ============================================
// 复用GraphViewer的成熟配色方案
// ============================================
const getNodeColor = (nodeType) => {
  const colorMap = {
    'icd': '#4f46e5',
    'disease': '#dc2626',
    'symptom': '#ea580c',
    'procedure': '#059669',
    'medication': '#0891b2',
    'category': '#7c3aed',
    'complication': '#dc2626',
    'comorbidity': '#ea580c',
    'entity_diseases': '#dc2626',
    'entity_symptoms': '#ea580c',
    'entity_procedures': '#059669',
    'entity_medications': '#0891b2',
    'default': '#6b7280'
  };
  return colorMap[nodeType] || colorMap.default;
};

const getNodeTypeLabel = (nodeType) => {
  const labelMap = {
    'icd': 'ICD编码',
    'disease': '疾病',
    'symptom': '症状',
    'procedure': '手术/操作',
    'medication': '药物',
    'category': '分类',
    'complication': '并发症',
    'comorbidity': '合并症'
  };
  return labelMap[nodeType] || nodeType;
};

export default function GraphHallPage() {
  // ============================================
  // 状态管理 - 复用GraphViewer的Ref模式
  // ============================================
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    icd: true,
    disease: true,
    symptom: true,
    procedure: true,
    medication: true
  });

  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const layoutRunningRef = useRef(false);
  const elementsCacheRef = useRef(null);

  // ============================================
  // 加载图谱数据 - 调用后端API
  // ============================================
  useEffect(() => {
    const loadGraphData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/graph/query', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setGraphData(data);
      } catch (err) {
        console.error('加载图谱失败:', err);
        setError(err.message);
        // 回退到模拟数据
        const mockData = generateMockGraphData();
        setGraphData(mockData);
      } finally {
        setLoading(false);
      }
    };

    loadGraphData();
  }, []);

  // ============================================
  // 生成模拟图谱数据 - 用于演示和兜底
  // ============================================
  const generateMockGraphData = () => {
    const nodes = [];
    const edges = [];

    // 主要疾病分类
    const categories = [
      { id: 'I', label: '循环系统疾病', type: 'category' },
      { id: 'J', label: '呼吸系统疾病', type: 'category' },
      { id: 'E', label: '内分泌、营养和代谢疾病', type: 'category' },
      { id: 'K', label: '消化系统疾病', type: 'category' },
    ];

    // ICD编码
    const icdCodes = [
      { id: 'I21', label: '急性心肌梗死', type: 'icd', category: 'I', probability: 0.95 },
      { id: 'I25', label: '慢性缺血性心脏病', type: 'icd', category: 'I', probability: 0.87 },
      { id: 'I50', label: '心力衰竭', type: 'icd', category: 'I', probability: 0.82 },
      { id: 'J44', label: '慢性阻塞性肺疾病', type: 'icd', category: 'J', probability: 0.79 },
      { id: 'E11', label: '2型糖尿病', type: 'icd', category: 'E', probability: 0.91 },
      { id: 'K25', label: '胃溃疡', type: 'icd', category: 'K', probability: 0.75 },
    ];

    // 并发症/合并症
    const complications = [
      { id: 'COMP_001', label: '心律失常', type: 'complication', related: ['I21', 'I50'] },
      { id: 'COMP_002', label: '心源性休克', type: 'complication', related: ['I21'] },
      { id: 'COMP_003', label: '呼吸衰竭', type: 'complication', related: ['J44', 'I50'] },
      { id: 'COMP_004', label: '糖尿病肾病', type: 'complication', related: ['E11'] },
    ];

    // 症状
    const symptoms = [
      { id: 'SYMP_001', label: '胸痛', type: 'symptom', related: ['I21', 'I25'] },
      { id: 'SYMP_002', label: '呼吸困难', type: 'symptom', related: ['I50', 'J44'] },
      { id: 'SYMP_003', label: '心悸', type: 'symptom', related: ['I21', 'I50', 'COMP_001'] },
      { id: 'SYMP_004', label: '咳嗽', type: 'symptom', related: ['J44', 'COMP_003'] },
      { id: 'SYMP_005', label: '多饮多尿', type: 'symptom', related: ['E11'] },
    ];

    // 药物
    const medications = [
      { id: 'MED_001', label: '阿司匹林', type: 'medication', related: ['I21', 'I25'] },
      { id: 'MED_002', label: '二甲双胍', type: 'medication', related: ['E11'] },
      { id: 'MED_003', label: '利尿剂', type: 'medication', related: ['I50'] },
      { id: 'MED_004', label: '支气管扩张剂', type: 'medication', related: ['J44'] },
    ];

    // 合并所有节点
    nodes.push(...categories, ...icdCodes, ...complications, ...symptoms, ...medications);

    // 构建边
    icdCodes.forEach(icd => {
      edges.push({
        id: `${icd.category}-${icd.id}`,
        source: icd.category,
        target: icd.id,
        type: 'category-subtype',
        label: '包含',
        weight: 0.9
      });
    });

    complications.forEach(comp => {
      comp.related.forEach(relatedId => {
        edges.push({
          id: `${relatedId}-${comp.id}`,
          source: relatedId,
          target: comp.id,
          type: 'complication',
          label: '并发',
          weight: 0.7
        });
      });
    });

    symptoms.forEach(symptom => {
      symptom.related.forEach(relatedId => {
        edges.push({
          id: `${relatedId}-${symptom.id}`,
          source: relatedId,
          target: symptom.id,
          type: 'symptom',
          label: '症状',
          weight: 0.6
        });
      });
    });

    medications.forEach(med => {
      med.related.forEach(relatedId => {
        edges.push({
          id: `${relatedId}-${med.id}`,
          source: relatedId,
          target: med.id,
          type: 'treatment',
          label: '治疗用药',
          weight: 0.5
        });
      });
    });

    // 合并症关系
    edges.push({ id: 'I21-E11', source: 'I21', target: 'E11', type: 'comorbidity', label: '常见合并症', weight: 0.65 });
    edges.push({ id: 'I50-J44', source: 'I50', target: 'J44', type: 'comorbidity', label: '常见合并症', weight: 0.6 });

    return { nodes, edges };
  };

  // ============================================
  // 构建Cytoscape数据 - 复用GraphViewer的健壮逻辑
  // ============================================
  const buildCytoscapeData = (graphData, activeFilters) => {
    const nodes = [];
    const edges = [];

    if (!graphData?.nodes?.length) {
      return { nodes, edges };
    }

    // 应用过滤器
    const filteredNodes = graphData.nodes.filter(node => {
      if (node.type === 'category' || node.type === 'complication') return true;
      return activeFilters[node.type] !== false;
    });

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

    // 转换为Cytoscape格式
    filteredNodes.forEach(node => {
      // 跳过ID为空的节点（防御性编程）
      if (node.id && node.id.trim()) {
        nodes.push({
          data: {
            id: node.id,
            label: node.label || node.id,
            type: node.type || 'default',
            probability: node.probability || 0
          }
        });
      }
    });

    // 过滤边
    if (graphData.edges?.length) {
      graphData.edges.forEach(edge => {
        // 跳过source或target为空的边，且两端节点都在过滤后的集合中
        if (edge.source && edge.target &&
            edge.source.trim() &&
            edge.target.trim() &&
            filteredNodeIds.has(edge.source) &&
            filteredNodeIds.has(edge.target)) {
          edges.push({
            data: {
              id: edge.id || `${edge.source}-${edge.target}`,
              source: edge.source,
              target: edge.target,
              weight: edge.weight || 0.5,
              type: edge.type || 'default',
              label: edge.label || ''
            }
          });
        }
      });
    }

    return { nodes, edges };
  };

  // ============================================
  // Cytoscape初始化 - 完全复用GraphViewer的成熟逻辑
  // ============================================
  useEffect(() => {
    if (!containerRef.current || !graphData || loading) return;

    const { nodes, edges } = buildCytoscapeData(graphData, filters);

    // 防御性处理：如果节点过少，直接显示提示而不渲染
    if (nodes.length === 0) {
      setError('图谱数据为空');
      setLoading(false);
      return;
    }

    const currentDataId = JSON.stringify({
      nodes: nodes.map(n => n.data.id).sort(),
      edges: edges.map(e => `${e.data.source}-${e.data.target}`).sort()
    });

    // 如果数据没变，只调整大小而不重新渲染
    if (cyRef.current && currentDataId === elementsCacheRef.current) {
      cyRef.current.resize();
      return;
    }

    // 销毁旧实例
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    elementsCacheRef.current = currentDataId;

    try {
      const weights = edges.map(e => e.data.weight || 0.5);
      const minWeight = Math.min(...weights, 0.1);
      const maxWeight = Math.max(...weights, 1.0);
      const weightRange = maxWeight - minWeight || 1;

      // 根据概率计算节点大小
      const getNodeSize = (nodeData) => {
        const baseSize = 25;
        const prob = nodeData.probability || 0.5;
        return baseSize + prob * 25;
      };

      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: [...nodes, ...edges],
        userPanningEnabled: true,
        userZoomingEnabled: true,
        boxSelectionEnabled: true,
        wheelSensitivity: 0.3,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': (ele) => getNodeColor(ele.data('type')),
              'width': (ele) => getNodeSize(ele.data()),
              'height': (ele) => getNodeSize(ele.data()),
              'label': 'data(label)',
              'font-size': '12px',
              'font-weight': 'bold',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 8,
              'color': '#374151',
              'text-outline-width': 2,
              'text-outline-color': '#ffffff',
              'border-width': 2,
              'border-color': '#ffffff'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': (ele) => {
                const weight = ele.data('weight') || 0.5;
                return 1 + ((weight - minWeight) / weightRange) * 3;
              },
              'line-color': (ele) => {
                const type = ele.data('type');
                if (type === 'complication') return '#ef4444';
                if (type === 'comorbidity') return '#f59e0b';
                if (type === 'symptom') return '#8b5cf6';
                if (type === 'treatment') return '#10b981';
                return '#9ca3af';
              },
              'opacity': 0.7,
              'curve-style': 'bezier',
              'target-arrow-color': '#9ca3af',
              'target-arrow-shape': 'triangle',
              'arrow-scale': 0.6,
              'label': 'data(label)',
              'font-size': '10px',
              'text-background-color': '#ffffff',
              'text-background-opacity': 0.8,
              'text-background-padding': '2px'
            }
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 4,
              'border-color': '#3b82f6',
              'shadow-blur': 20,
              'shadow-color': '#3b82f6',
              'shadow-opacity': 0.6
            }
          }
        ]
      });

      layoutRunningRef.current = true;

      // 确保所有节点初始状态可拖动
      cyRef.current.nodes().forEach(node => {
        node.unlock();
        node.grabify();
      });

      // 根据节点数量选择合适的布局 - 复用GraphViewer的性能优化
      const nodeCount = nodes.length;
      let layoutOptions;

      if (nodeCount <= 100) {
        // 使用 cose-bilkent 高质量力导向布局
        layoutOptions = {
          name: 'cose-bilkent',
          animate: nodeCount > 20,
          animationDuration: nodeCount < 50 ? 1000 : 500,
          randomize: false,
          fit: true,
          padding: 60,
          idealEdgeLength: 120,
          nodeRepulsion: 25000,
          edgeElasticity: 0.45,
          gravity: 0.3,
          tile: true,
          tilingPaddingVertical: 15,
          tilingPaddingHorizontal: 15,
          nodeDimensionsIncludeLabels: true,
        };
      } else {
        // 节点多时使用 grid 快速布局
        layoutOptions = {
          name: 'grid',
          animate: false,
          fit: true,
          padding: 50,
          rows: Math.ceil(Math.sqrt(nodeCount)),
          nodeDimensionsIncludeLabels: true,
        };
      }

      const layout = cyRef.current.layout(layoutOptions);

      layout.run();

      // 布局完成后解锁节点
      layout.one('layoutstop', () => {
        console.log("Cytoscape cose-bilkent 布局完成");
        layoutRunningRef.current = false;

        if (cyRef.current) {
          cyRef.current.nodes().forEach(node => {
            node.unlock();
            node.grabify();
          });
        }
      });

      // ============================================
      // 核心修复：用户拖动时立即停止布局 - 来自GraphViewer的验证逻辑
      // ============================================
      cyRef.current.on('grab', 'node', (evt) => {
        const node = evt.target;
        console.log("用户尝试拖动节点:", node.id());

        if (layoutRunningRef.current) {
          console.log('检测到用户拖动，立即停止正在进行的力导向布局计算');
          try {
            layout.stop();
            console.log('主布局实例已停止');
          } catch (e) {
            console.error('停止布局时发生错误:', e);
          }
          layoutRunningRef.current = false;
        }

        if (node.locked()) {
          console.log("被抓取的节点是锁定状态，正在解锁");
          node.unlock();
        }
        node.grabify();
        console.log("节点", node.id(), "已准备好供用户拖动");
      });

      // ============================================
      // 节点点击事件 - 显示详情面板
      // ============================================
      cyRef.current.on('tap', 'node', (evt) => {
        const node = evt.target;
        setSelectedNode({
          id: node.id(),
          label: node.data('label'),
          type: node.data('type'),
          degree: node.degree(),
          probability: node.data('probability'),
          connectedNodes: node.neighborhood().nodes().map(n => ({
            id: n.id(),
            label: n.data('label'),
            type: n.data('type')
          }))
        });

        // 居中显示选中节点
        cyRef.current.animate({
          center: { eles: node },
          zoom: 1.3,
          duration: 500
        });
      });

      // 点击空白处取消选中
      cyRef.current.on('tap', (evt) => {
        if (evt.target === cyRef.current) {
          setSelectedNode(null);
        }
      });

      const handleResize = () => {
        if (cyRef.current && !layoutRunningRef.current) {
          cyRef.current.resize();
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (cyRef.current) {
          try {
            const currentLayout = cyRef.current.layout();
            if (currentLayout) {
              currentLayout.stop();
            }
          } catch (e) {}
          cyRef.current.destroy();
          cyRef.current = null;
        }
        layoutRunningRef.current = false;
      };
    } catch (err) {
      console.error('图谱渲染失败:', err);
      setError('图谱渲染失败，已自动跳过显示');
      setLoading(false);
      if (cyRef.current) {
        try { cyRef.current.destroy(); } catch (e) {}
        cyRef.current = null;
      }
      return;
    }
  }, [graphData, loading, filters]);

  // ============================================
  // 搜索高亮功能
  // ============================================
  useEffect(() => {
    if (!cyRef.current || !searchQuery) {
      cyRef.current?.nodes().removeClass('highlighted');
      return;
    }

    const matchedNodes = cyRef.current.nodes().filter(node =>
      node.data('label').toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.id().toLowerCase().includes(searchQuery.toLowerCase())
    );

    matchedNodes.addClass('highlighted');
    cyRef.current.style()
      .selector('.highlighted')
      .style({
        'border-width': 5,
        'border-color': '#f59e0b',
        'shadow-blur': 25,
        'shadow-color': '#f59e0b',
        'shadow-opacity': 0.8
      })
      .update();

    if (matchedNodes.length > 0) {
      cyRef.current.animate({
        center: { eles: matchedNodes },
        zoom: 1.2,
        duration: 500
      });
    }
  }, [searchQuery]);

  // ============================================
  // 缩放控制
  // ============================================
  const handleZoomIn = () => cyRef.current?.animate({ zoom: cyRef.current.zoom() * 1.3, duration: 300 });
  const handleZoomOut = () => cyRef.current?.animate({ zoom: cyRef.current.zoom() / 1.3, duration: 300 });
  const handleFit = () => cyRef.current?.animate({ fit: { padding: 50 }, duration: 500 });
  const handleReset = () => {
    setSearchQuery('');
    setSelectedNode(null);
    cyRef.current?.animate({ fit: { padding: 50 }, zoom: 1, duration: 500 });
  };

  // 导出PNG
  const exportPNG = () => {
    if (!cyRef.current) return;
    try {
      const png = cyRef.current.png({ scale: 2 });
      const a = document.createElement('a');
      a.download = `icd-graph-hall-${Date.now()}.png`;
      a.href = png;
      a.click();
    } catch (err) {
      console.error('导出PNG失败:', err);
      alert('导出失败');
    }
  };

  const toggleFilter = (type) => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // ============================================
  // 加载状态
  // ============================================
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
          <p className="text-lg text-gray-600">正在加载知识图谱...</p>
          <p className="text-sm text-gray-400 mt-2">构建ICD-10编码关系网络</p>
        </div>
      </div>
    );
  }

  // ============================================
  // 错误状态
  // ============================================
  if (error && !graphData) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <Network size={64} className="text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-600 mb-2">知识图谱暂不可用</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // ============================================
  // 主界面
  // ============================================
  return (
    <div className="h-full flex bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* 左侧控制面板 */}
      <div className={`w-72 bg-white shadow-xl flex flex-col transition-all duration-300 border-r border-gray-200 ${showFilters ? '' : '-ml-72'}`}>
        {/* 搜索栏 */}
        <div className="p-4 border-b border-gray-100">
          <label className="text-sm font-medium text-gray-700 mb-2 block">搜索节点</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入ICD编码或疾病名称..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* 过滤器 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">节点类型筛选</h3>
          </div>

          <div className="space-y-2">
            {[
              { key: 'icd', label: 'ICD编码', color: 'bg-indigo-500' },
              { key: 'disease', label: '疾病', color: 'bg-red-500' },
              { key: 'symptom', label: '症状', color: 'bg-orange-500' },
              { key: 'procedure', label: '手术操作', color: 'bg-green-500' },
              { key: 'medication', label: '药物', color: 'bg-cyan-500' },
            ].map(item => (
              <label
                key={item.key}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  filters[item.key] ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={filters[item.key]}
                  onChange={() => toggleFilter(item.key)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>

          {/* 图例 */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Layers size={14} /> 关系类型图例
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-blue-400 rounded" />
                <span className="text-gray-600">分类包含关系</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-red-400 rounded" />
                <span className="text-gray-600">并发症关系</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-amber-400 rounded" />
                <span className="text-gray-600">合并症关系</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-purple-400 rounded" />
                <span className="text-gray-600">症状关联</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-green-400 rounded" />
                <span className="text-gray-600">治疗用药</span>
              </div>
            </div>
          </div>
        </div>

        {/* 快捷统计 */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <div className="text-2xl font-bold text-indigo-600">{graphData?.nodes?.length || 0}</div>
              <div className="text-xs text-gray-500">节点总数</div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <div className="text-2xl font-bold text-green-600">{graphData?.edges?.length || 0}</div>
              <div className="text-xs text-gray-500">关系总数</div>
            </div>
          </div>
        </div>
      </div>

      {/* 折叠/展开按钮 */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg p-2 rounded-r-lg hover:bg-gray-50 transition-all border border-l-0 border-gray-200"
        style={{ marginLeft: showFilters ? '288px' : '0' }}
      >
        {showFilters ? <ChevronRight size={18} className="text-gray-600" /> : <ChevronDown size={18} className="text-gray-600" />}
      </button>

      {/* 主图谱区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="bg-white/80 backdrop-blur-sm shadow-sm px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Network className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-800">ICD-10 知识图谱大厅</h2>
              <p className="text-xs text-gray-500">疾病、症状、药物的语义关系网络</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="放大"
            >
              <ZoomIn size={18} className="text-gray-600" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="缩小"
            >
              <ZoomOut size={18} className="text-gray-600" />
            </button>
            <button
              onClick={handleFit}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="适应屏幕"
            >
              <Maximize size={18} className="text-gray-600" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="重置视图"
            >
              <RotateCcw size={18} className="text-gray-600" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2" />
            <button
              onClick={exportPNG}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all text-sm font-medium shadow-sm"
            >
              <Download size={16} />
              导出图谱
            </button>
          </div>
        </div>

        {/* 图谱画布 */}
        <div
          ref={containerRef}
          className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50"
          style={{ minHeight: 0 }}
        />

        {/* 底部提示栏 */}
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>🖱️ 拖拽平移</span>
            <span>🔍 滚轮缩放</span>
            <span>📍 点击节点查看详情</span>
            <span>⚡ 拖动节点时自动停止布局计算</span>
          </div>
          <div className="flex items-center gap-2">
            <Info size={14} />
            <span>当前显示 {filters.icd ? 'ICD编码' : ''} {filters.symptom ? '症状' : ''} {filters.disease ? '疾病' : ''} {filters.procedure ? '手术' : ''} {filters.medication ? '药物' : ''}</span>
          </div>
        </div>
      </div>

      {/* 右侧节点详情面板 */}
      {selectedNode && (
        <div className="w-80 bg-white shadow-xl border-l border-gray-200 flex flex-col animate-fadeIn">
          <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                style={{ backgroundColor: getNodeColor(selectedNode.type) }}
              >
                {selectedNode.label.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg">{selectedNode.label}</h3>
                <p className="text-indigo-200 text-sm">{getNodeTypeLabel(selectedNode.type)} · {selectedNode.id}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* 基本信息 */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Info size={14} /> 基本信息
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">节点类型</span>
                  <span className="font-medium text-gray-800">{getNodeTypeLabel(selectedNode.type)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">关联节点数</span>
                  <span className="font-medium text-gray-800">{selectedNode.degree}</span>
                </div>
                {selectedNode.probability > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">置信度</span>
                    <span className="font-medium text-indigo-600">{(selectedNode.probability * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* 关联节点 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Network size={14} /> 关联节点
              </h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {selectedNode.connectedNodes.map(node => (
                  <div
                    key={node.id}
                    className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-gray-100"
                    onClick={() => {
                      const targetNode = cyRef.current?.getElementById(node.id);
                      if (targetNode) {
                        targetNode.emit('tap');
                      }
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getNodeColor(node.type) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{node.label}</div>
                      <div className="text-xs text-gray-400">{node.id}</div>
                    </div>
                    <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 底部操作 */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => setSelectedNode(null)}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              关闭面板
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
