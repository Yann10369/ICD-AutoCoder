import { useState, useEffect, useRef } from 'react';
import { Network, Loader2, Download } from 'lucide-react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

// 注册布局扩展
cytoscape.use(coseBilkent);

// 医疗级配色：统一使用低饱和度灰阶色系
const getNodeColor = (nodeType) => {
  const colorMap = {
    'icd': '#475569',
    'entity_diseases': '#64748b',
    'entity_symptoms': '#64748b',
    'entity_procedures': '#64748b',
    'entity_medications': '#64748b',
    'default': '#94a3b8'
  };
  return colorMap[nodeType] || colorMap.default;
};

const getNodeSize = (node, predictions) => {
  if (node.type === 'icd' || !node.id.startsWith('entity_')) {
    const icdPred = predictions?.icdPredictions?.find(p => p.code === node.id);
    if (icdPred?.probability) {
      return 30 + icdPred.probability * 50;
    }
  }
  return 25;
};

const GraphViewer = ({ predictions }) => {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const cachedGraphDataRef = useRef(null);
  const cachedPredictionsIdRef = useRef(null);
  const layoutRunningRef = useRef(false);
  const elementsCacheRef = useRef(null);
  const layoutTimeoutRef = useRef(null);

  const getPredictionsId = (predictions) => {
    if (!predictions?.icdPredictions) return null;
    return predictions.icdPredictions.map(p => `${p.code}-${p.probability}`).join('|');
  };

  useEffect(() => {
    const predictionsId = getPredictionsId(predictions);
    
    if (predictionsId === cachedPredictionsIdRef.current && cachedGraphDataRef.current) {
      setGraphData(cachedGraphDataRef.current);
      setLoading(false);
      return;
    }

    const fetchGraphData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/graph/visualize', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        cachedGraphDataRef.current = data;
        cachedPredictionsIdRef.current = predictionsId;
        setGraphData(data);
      } catch (err) {
        console.error('获取图谱数据失败:', err);
        setError(err.message);
        if (predictions) {
          const fallbackData = {
            nodes: (predictions.icdPredictions || []).slice(0, 5).map(pred => ({
              id: pred.code,
              label: pred.description || pred.code,
              type: 'icd',
              probability: pred.probability
            })),
            edges: [],
            entities: predictions.entities || {}
          };
          cachedGraphDataRef.current = fallbackData;
          cachedPredictionsIdRef.current = predictionsId;
          setGraphData(fallbackData);
        }
      } finally {
        setLoading(false);
      }
    };

    if (predictions) fetchGraphData();
  }, [predictions]);

  const buildCytoscapeData = (graphData, predictions) => {
    const nodes = [];
    const edges = [];

    if (!graphData?.nodes?.length) {
      if (!predictions?.icdPredictions) return { nodes, edges };

      // 过滤掉code为空的预测结果，避免空ID崩溃
      const validPredictions = (predictions.icdPredictions || []).filter(p => p.code && p.code.trim());

      validPredictions.slice(0, 10).forEach(pred => {
        nodes.push({
          data: { id: pred.code, label: pred.description || pred.code, type: 'icd', probability: pred.probability }
        });
      });

      if (predictions.entities) {
        Object.entries(predictions.entities).forEach(([type, entities]) => {
          (entities || []).slice(0, 5).forEach(entity => {
            nodes.push({
              data: { id: `entity_${type}_${entity}`, label: entity, type: `entity_${type}`, probability: 0 }
            });
          });
        });
      }

      nodes.forEach(node => {
        if (node.data.id.startsWith('entity_')) {
          const entityType = node.data.type;
          (predictions.icdPredictions || []).slice(0, 3).forEach(icdPred => {
            const weight = entityType.includes('diseases') ? icdPred.probability * 0.8 :
                          entityType.includes('symptoms') ? icdPred.probability * 0.6 : 0.5;
            edges.push({
              data: { id: `${node.data.id}-${icdPred.code}`, source: node.data.id, target: icdPred.code, weight, type: 'entity-icd' }
            });
          });
        }
        if (node.data.type === 'icd') {
          const parts = node.data.id.split('.');
          if (parts.length > 1) {
            const parentCode = parts.slice(0, -1).join('.');
            if (nodes.find(n => n.data.id === parentCode)) {
              edges.push({
                data: { id: `${parentCode}-${node.data.id}`, source: parentCode, target: node.data.id, weight: node.data.probability || 0.5, type: 'parent-child' }
              });
            }
          }
        }
      });
    } else {
      graphData.nodes.forEach(node => {
        // 跳过ID为空的节点
        if (node.id && node.id.trim()) {
          nodes.push({
            data: { id: node.id, label: node.label || node.id, type: node.type || 'default', probability: node.probability || 0 }
          });
        }
      });

      if (graphData.entities && predictions) {
        Object.entries(graphData.entities).forEach(([type, entities]) => {
          (entities || []).slice(0, 5).forEach(entity => {
            const nodeId = `entity_${type}_${entity}`;
            if (!nodes.find(n => n.data.id === nodeId)) {
              nodes.push({
                data: { id: nodeId, label: entity, type: `entity_${type}`, probability: 0 }
              });
            }
          });
        });
      }

      if (graphData.edges?.length) {
        graphData.edges.forEach(edge => {
          // 跳过source或target为空的边
          if (edge.source && edge.target && edge.source.trim() && edge.target.trim()) {
            edges.push({
              data: {
                id: edge.id || `${edge.source}-${edge.target}`,
                source: edge.source,
                target: edge.target,
                weight: edge.weight || 0.5,
                type: edge.type || 'default'
              }
            });
          }
        });
      }

      nodes.forEach(node => {
        if (node.data.id.startsWith('entity_')) {
          (predictions?.icdPredictions || []).slice(0, 3).forEach(icdPred => {
            const icdNode = nodes.find(n => n.data.id === icdPred.code);
            if (icdNode) {
              const weight = node.data.type.includes('diseases') ? icdPred.probability * 0.8 :
                            node.data.type.includes('symptoms') ? icdPred.probability * 0.6 : 0.5;
              const edgeId = `${node.data.id}-${icdPred.code}`;
              if (!edges.find(e => e.data.id === edgeId)) {
                edges.push({
                  data: { id: edgeId, source: node.data.id, target: icdPred.code, weight, type: 'entity-icd' }
                });
              }
            }
          });
        }
      });
    }

    return { nodes, edges };
  };

  useEffect(() => {
    if (!containerRef.current || !graphData || loading) return;

    const { nodes, edges } = buildCytoscapeData(graphData, predictions);
    if (nodes.length === 0) return;

    const currentDataId = JSON.stringify({ 
      nodes: nodes.map(n => n.data.id).sort(), 
      edges: edges.map(e => `${e.data.source}-${e.data.target}`).sort() 
    });

    if (cyRef.current) {
      if (currentDataId === elementsCacheRef.current) {
        cyRef.current.resize();
        return;
      }
      cyRef.current.destroy();
      cyRef.current = null;
    }

    elementsCacheRef.current = currentDataId;

    // 防御性处理：如果节点过少，直接显示提示而不渲染
    if (nodes.length === 0) {
      setError('图谱数据为空');
      setLoading(false);
      return;
    }

    try {
      const weights = edges.map(e => e.data.weight || 0.5);
      const minWeight = Math.min(...weights, 0.1);
      const maxWeight = Math.max(...weights, 1.0);
      const weightRange = maxWeight - minWeight || 1;

      const nodeSizes = new Map();
      nodes.forEach(node => {
        nodeSizes.set(node.data.id, getNodeSize(node.data, predictions));
      });

      // 最终过滤：只保留ID有效的节点和边
      const validNodes = nodes.filter(n => n.data.id && n.data.id.trim());
      const validEdges = edges.filter(e =>
        e.data.source && e.data.source.trim() &&
        e.data.target && e.data.target.trim() &&
        // 确保边的source和target都在节点中存在
        validNodes.some(n => n.data.id === e.data.source) &&
        validNodes.some(n => n.data.id === e.data.target)
      );

      // 如果没有有效节点，不渲染图谱
      if (validNodes.length === 0) {
        setError('图谱数据无效，已跳过显示');
        setLoading(false);
        return;
      }

      cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [...validNodes, ...validEdges],
      userPanningEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: true,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => getNodeColor(ele.data('type')),
            'width': (ele) => nodeSizes.get(ele.data('id')) || 25,
            'height': (ele) => nodeSizes.get(ele.data('id')) || 25,
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
            'line-color': '#9ca3af',
            'opacity': 0.6,
            'curve-style': 'bezier',
            'target-arrow-color': '#9ca3af',
            'target-arrow-shape': 'triangle'
          }
        },
        {
          selector: 'node:selected',
          style: { 'border-width': 4, 'border-color': '#3b82f6' }
        }
      ]
    });

    layoutRunningRef.current = true;
    
    // 确保所有节点初始状态可拖动
    cyRef.current.nodes().forEach(node => {
      node.unlock();
      node.grabify();
    });

    // 根据节点数量选择合适的布局
    const nodeCount = nodes.length;
    const animate = nodeCount < 100;

    // 性能优化：节点多时自动切换快速布局
    // - <= 100 节点：使用 cose-bilkent 高质量力导向布局
    // - > 100 节点：使用 grid 快速布局，保证性能
    let layoutOptions;
    if (nodeCount <= 100) {
      // 使用 cose-bilkent 高质量布局
      // 这是改进的力导向布局，比原生 cose 更美观
      layoutOptions = {
        name: 'cose-bilkent',
        animate: animate,
        animationDuration: nodeCount < 50 ? 1000 : 500,
        randomize: false,
        fit: true,
        padding: 50,
        idealEdgeLength: 100,
        nodeRepulsion: 20000,
        edgeElasticity: 0.45,
        gravity: 0.25,
        tile: true,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10,
        nodeDimensionsIncludeLabels: true,
      };
    } else {
      // 节点多时使用 grid 快速布局
      layoutOptions = {
        name: 'grid',
        animate: false,
        fit: true,
        padding: 20,
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
        cyRef.current.userPanningEnabled(true);
        cyRef.current.userZoomingEnabled(true);
      }
    });

    // 双击节点居中放大
    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      console.log('双击节点:', node.id());
      // 居中并放大
      cyRef.current.animate({
        center: {
          eles: node,
        },
        zoom: 1.5,
        duration: 500,
      });
    });

    // 布局事件处理已在gridLayout.one('layoutstop')中处理
    
    // 可选：保留超时保护，但要小心处理
    /*
    layoutTimeoutRef.current = setTimeout(() => {
      if (cyRef.current && layoutRunningRef.current) {
        console.warn('布局超过10秒仍未完成，强制停止');
        try {
          layout.stop(); // 尝试停止主布局实例
          // 尝试停止 cy 内部可能引用的布局
          const currentLayout = cyRef.current.layout();
          if (currentLayout && typeof currentLayout.stop === 'function') {
             currentLayout.stop();
          }
        } catch (e) {
          console.error('强制停止布局出错:', e);
        }
        layoutRunningRef.current = false; 
        
        // 强制解锁节点
        if (cyRef.current) {
          cyRef.current.nodes().forEach(node => {
            node.unlock();
            node.grabify();
          });
        }
        layoutTimeoutRef.current = null;
      }
    }, 10000); 
    */

    // 核心修复：在用户尝试拖动节点时立即停止布局
    cyRef.current.on('grab', 'node', (evt) => {
      const node = evt.target;
      console.log("用户尝试拖动节点:", node.id());

      // 最关键的一步：如果布局在运行，则立即停止
      if (layoutRunningRef.current) {
        console.log('检测到用户拖动，立即停止正在进行的力导向布局计算');
        try {
          // 1. 停止你创建的布局实例
          layout.stop(); 
          console.log('主布局实例已停止');

          // 2. 尝试停止 Cytoscape 内部可能仍在引用的布局实例 (双重保险)
          // 注意：直接调用 cy.layout().stop() 可能会启动一个新的默认布局，
          // 所以最好只对明确的实例调用 stop()
          // const currentLayout = cyRef.current.layout(); 
          // if (currentLayout && currentLayout !== layout && typeof currentLayout.stop === 'function') {
          //    console.log('尝试停止 Cytoscape 内部布局实例');
          //    currentLayout.stop();
          // }

        } catch (e) {
          console.error('停止布局时发生错误:', e);
        }
        // 3. 更新标志位
        layoutRunningRef.current = false; 

        // 4. 清理超时（如果保留了上面的 setTimeout）
        // if (layoutTimeoutRef.current) {
        //   clearTimeout(layoutTimeoutRef.current);
        //   layoutTimeoutRef.current = null;
        //   console.log('已清理布局超时计时器');
        // }
      }
      
      // 确保被抓取的节点本身是可拖动的
      if (node.locked()) {
        console.log("被抓取的节点是锁定状态，正在解锁");
        node.unlock();
      }
      // 确保节点可以被抓取（虽然 grab 事件触发时通常已经 grabify，但再调用一次更保险）
      node.grabify(); 
      console.log("节点", node.id(), "已准备好供用户拖动");
    });
    
    // 可选：监听拖动过程
    cyRef.current.on('drag', 'node', (evt) => {
      const node = evt.target;
      // 可以在这里添加拖动过程中的逻辑
      // console.log("节点正在被拖动:", node.id());
    });
    
    cyRef.current.on('tap', 'node', (evt) => {
      console.log('点击节点:', evt.target.data());
    });

    const handleResize = () => {
      if (cyRef.current && !layoutRunningRef.current) {
        cyRef.current.resize();
      }
    };

    let resizeTimer = null;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 300);
    };

    window.addEventListener('resize', debouncedResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimer);
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
        layoutTimeoutRef.current = null;
      }
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
      // 清理可能存在的半初始化对象
      if (cyRef.current) {
        try { cyRef.current.destroy(); } catch (e) {}
        cyRef.current = null;
      }
      return;
    }
  }, [graphData, loading, predictions]);

  if (loading) {
    return (
      <div className="bg-slate-50 p-8 rounded-lg border-2 border-dashed border-slate-300 min-h-96 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-slate-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600">正在加载知识图谱数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 p-8 rounded-lg border-2 border-dashed border-slate-300 min-h-96 flex items-center justify-center">
        <div className="text-center">
          <Network size={64} className="text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-2">知识图谱暂不可用</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!graphData || !predictions) {
    return (
      <div className="bg-slate-50 p-8 rounded-lg border-2 border-dashed border-slate-300 min-h-96 flex items-center justify-center">
        <div className="text-center">
          <Network size={64} className="text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">暂无图谱数据</h3>
          <p className="text-slate-600">请先运行预测以生成知识图谱</p>
        </div>
      </div>
    );
  }

  // 导出PNG
  const exportPNG = () => {
    if (!cyRef.current) return;
    try {
      // 获取PNG数据
      const png = cyRef.current.png({ scale: 2 });
      // 创建下载链接
      const a = document.createElement('a');
      a.download = `icd-graph-${Date.now()}.png`;
      a.href = png;
      a.click();
    } catch (err) {
      console.error('导出PNG失败:', err);
      alert('导出失败');
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div
        ref={containerRef}
        className="flex-1 bg-white border border-slate-200 overflow-hidden min-h-0"
        style={{ width: '100%' }}
      />
      <div className="bg-slate-50 p-3 rounded-t-lg border-t border-slate-300 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-700 mb-1"><strong>可视化说明：</strong></p>
            <ul className="text-xs text-slate-600 space-y-0.5 list-disc list-inside">
              <li>节点颜色表示不同类型：
                <span className="text-slate-700 font-semibold"> 深灰</span>（ICD编码）、
                <span className="text-slate-500 font-semibold"> 中灰</span>（疾病/症状/操作/药物）
              </li>
              <li>节点大小表示ICD编码的预测概率</li>
              <li>可以拖拽节点调整位置、滚轮缩放，<span className="font-semibold">双击节点居中放大</span></li>
              <li>自动选择布局：节点少使用美观的力导向布局，节点多使用快速网格布局</li>
            </ul>
          </div>
          <button
            onClick={exportPNG}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs rounded-lg hover:bg-slate-700 transition-colors"
            title="导出图谱为PNG图片"
          >
            <Download size={14} />
            导出PNG
          </button>
        </div>
      </div>
    </div>
  );
};

export default GraphViewer;
