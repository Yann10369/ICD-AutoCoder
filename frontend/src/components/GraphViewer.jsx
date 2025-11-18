import { useState, useEffect, useRef } from 'react';
import { Network, Loader2 } from 'lucide-react';

// 计算节点位置的简单力导向布局
const calculateNodePositions = (nodes, edges, width, height) => {
  const positions = {};
  const nodeMap = {};
  
  // 初始化节点映射
  nodes.forEach((node, index) => {
    nodeMap[node.id] = node;
  });
  
  // 计算节点度数（连接数）
  const degrees = {};
  nodes.forEach(node => {
    degrees[node.id] = 0;
  });
  edges.forEach(edge => {
    degrees[edge.source] = (degrees[edge.source] || 0) + 1;
    degrees[edge.target] = (degrees[edge.target] || 0) + 1;
  });
  
  // 找到中心节点（度数最大的节点）
  let centerNodeId = nodes[0]?.id;
  let maxDegree = 0;
  nodes.forEach(node => {
    if (degrees[node.id] > maxDegree) {
      maxDegree = degrees[node.id];
      centerNodeId = node.id;
    }
  });
  
  // 使用圆形布局，增大半径以增加节点间距
  const centerX = width / 2;
  const centerY = height / 2;
  // 增加半径从 0.3 到 0.4，使节点更分散
  const radius = Math.min(width, height) * 0.4;
  
  // 将中心节点放在中心
  positions[centerNodeId] = { x: centerX, y: centerY };
  
  // 其他节点按圆形分布
  const otherNodes = nodes.filter(n => n.id !== centerNodeId);
  const angleStep = (2 * Math.PI) / Math.max(otherNodes.length, 1);
  
  otherNodes.forEach((node, index) => {
    const angle = index * angleStep;
    positions[node.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });
  
  // 简单的力导向迭代
  for (let iter = 0; iter < 50; iter++) {
    const forces = {};
    nodes.forEach(node => {
      forces[node.id] = { x: 0, y: 0 };
    });
    
    // 边的吸引力 - 减少吸引力，保持节点距离
    edges.forEach(edge => {
      const source = positions[edge.source];
      const target = positions[edge.target];
      if (!source || !target) return;
      
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      // 目标距离增大到 200，减少吸引力强度
      const targetDistance = 200;
      const force = (distance - targetDistance) * 0.005; // 减少吸引力系数
      
      forces[edge.source].x += (dx / distance) * force;
      forces[edge.source].y += (dy / distance) * force;
      forces[edge.target].x -= (dx / distance) * force;
      forces[edge.target].y -= (dy / distance) * force;
    });
    
    // 节点之间的排斥力 - 增强排斥力，增大节点间距
    nodes.forEach((node1, i) => {
      nodes.slice(i + 1).forEach(node2 => {
        const pos1 = positions[node1.id];
        const pos2 = positions[node2.id];
        if (!pos1 || !pos2) return;
        
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        // 最小距离增大到 120，增强排斥力
        const minDistance = 120;
        if (distance < minDistance) {
          const force = (minDistance - distance) * 2; // 增强排斥力
          forces[node1.id].x -= (dx / distance) * force;
          forces[node1.id].y -= (dy / distance) * force;
          forces[node2.id].x += (dx / distance) * force;
          forces[node2.id].y += (dy / distance) * force;
        } else {
          // 距离较远时也保持一定的排斥力
          const force = 2000 / (distance * distance);
          forces[node1.id].x -= (dx / distance) * force;
          forces[node1.id].y -= (dy / distance) * force;
          forces[node2.id].x += (dx / distance) * force;
          forces[node2.id].y += (dy / distance) * force;
        }
      });
    });
    
    // 应用力
    nodes.forEach(node => {
      const force = forces[node.id];
      const pos = positions[node.id];
      if (!pos) return;
      
      pos.x += force.x * 0.1;
      pos.y += force.y * 0.1;
      
      // 边界约束 - 增加边距以保证节点不贴边
      const margin = 80; // 增加边距从 50 到 80
      pos.x = Math.max(margin, Math.min(width - margin, pos.x));
      pos.y = Math.max(margin, Math.min(height - margin, pos.y));
    });
  }
  
  return positions;
};

// 获取节点颜色
const getNodeColor = (node) => {
  if (node.type === 'icd') {
    return '#4f46e5'; // indigo
  }
  if (node.type === 'entity_diseases') {
    return '#dc2626'; // red
  }
  if (node.type === 'entity_symptoms') {
    return '#ea580c'; // orange
  }
  if (node.type === 'entity_procedures') {
    return '#059669'; // green
  }
  if (node.type === 'entity_medications') {
    return '#0891b2'; // cyan
  }
  return '#6b7280'; // gray
};

// 获取节点大小
const getNodeSize = (node, predictions) => {
  // 如果是ICD节点，根据概率设置大小
  if (node.id && !node.id.startsWith('entity_')) {
    const icdPred = predictions?.icdPredictions?.find(p => p.code === node.id);
    if (icdPred) {
      return 20 + icdPred.probability * 20; // 20-40 像素
    }
  }
  return 16; // 默认16像素
};

// Knowledge visualization section
const GraphViewer = ({ predictions }) => {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const fetchGraphData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/graph/visualize', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('图谱数据:', data);
        console.log('节点数量:', data.nodes?.length || 0);
        console.log('边数量:', data.edges?.length || 0);
        setGraphData(data);
      } catch (err) {
        console.error('获取图谱数据失败:', err);
        setError(err.message);
        // 如果没有API数据，使用预测结果构建简单的图谱
        if (predictions) {
          setGraphData({
            nodes: (predictions.icdPredictions || []).slice(0, 5).map(pred => ({
              id: pred.code,
              label: pred.description || pred.code,
              type: 'icd',
              level: pred.code.split('.').length,
              probability: pred.probability
            })),
            edges: [],
            paths: [],
            entities: predictions.entities || {}
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (predictions) {
      fetchGraphData();
    }
  }, [predictions]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width || 800, height: rect.height || 600 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">知识图谱可视化</h2>
        <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300 min-h-96 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
            <p className="text-gray-600">正在加载知识图谱数据...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !graphData) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">知识图谱可视化</h2>
        <div className="bg-red-50 p-8 rounded-lg border-2 border-red-300 min-h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">加载图谱数据失败: {error}</p>
            <p className="text-gray-600 text-sm">请确保已运行预测并生成预测结果</p>
          </div>
        </div>
      </div>
    );
  }

  // 如果没有图谱数据，使用预测结果构建基础图谱
  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    // 如果也没有预测结果，显示空状态
    if (!predictions || !predictions.icdPredictions || predictions.icdPredictions.length === 0) {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">知识图谱可视化</h2>
          <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300 min-h-96 flex items-center justify-center">
            <div className="text-center">
              <Network size={64} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无图谱数据</h3>
              <p className="text-gray-600">请先运行预测以生成知识图谱</p>
            </div>
          </div>
        </div>
      );
    }
    
    // 使用预测结果构建简单的图谱
    const fallbackGraphData = {
      nodes: (predictions.icdPredictions || []).slice(0, 5).map(pred => ({
        id: pred.code,
        label: pred.description || pred.code,
        type: 'icd',
        level: pred.code.split('.').length,
        probability: pred.probability
      })),
      edges: [],
      paths: [],
      entities: predictions.entities || {}
    };
    
    // 构建节点和边的连接
    const fallbackNodes = [...fallbackGraphData.nodes];
    const fallbackEdges = [];
    
    // 添加实体节点
    if (predictions.entities) {
      Object.entries(predictions.entities).forEach(([type, entities]) => {
        (entities || []).slice(0, 3).forEach(entity => {
          const nodeId = `entity_${type}_${entity}`;
          fallbackNodes.push({
            id: nodeId,
            label: entity,
            type: `entity_${type}`,
            level: 0
          });
        });
      });
    }
    
    // 构建层次关系边
    fallbackGraphData.nodes.forEach(node => {
      const parts = node.id.split('.');
      if (parts.length > 1) {
        const parentCode = parts.slice(0, -1).join('.');
        const parentNode = fallbackGraphData.nodes.find(n => n.id === parentCode);
        if (parentNode) {
          fallbackEdges.push({
            source: parentCode,
            target: node.id,
            type: 'parent-child',
            weight: node.probability || 0.5
          });
        }
      }
    });
    
    // 连接实体到ICD节点
    fallbackNodes.forEach(entityNode => {
      if (entityNode.id.startsWith('entity_')) {
        (predictions.icdPredictions || []).slice(0, 3).forEach(icdPred => {
          const icdNode = fallbackNodes.find(n => n.id === icdPred.code);
          if (icdNode) {
            let weight = 0.5;
            if (entityNode.type.includes('diseases')) {
              weight = icdPred.probability * 0.8;
            } else if (entityNode.type.includes('symptoms')) {
              weight = icdPred.probability * 0.6;
            }
            fallbackEdges.push({
              source: entityNode.id,
              target: icdNode.id,
              type: 'entity-icd',
              weight: weight
            });
          }
        });
      }
    });
    
    // 使用fallback数据
    return renderGraph(fallbackNodes, fallbackEdges, predictions);
  }

  // 渲染图谱的函数
  function renderGraph(nodes, edges, predictions) {
    // 计算节点位置
    const nodePositions = calculateNodePositions(
      nodes,
      edges,
      dimensions.width,
      dimensions.height
    );

    // 计算边的粗细范围
    const weights = edges.map(e => e.weight || 0.5);
    const minWeight = Math.min(...weights, 0.1);
    const maxWeight = Math.max(...weights, 1.0);
    const weightRange = maxWeight - minWeight || 1;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">知识图谱可视化</h2>
        <div 
          ref={containerRef}
          className="bg-white p-4 rounded-lg border-2 border-gray-200 min-h-96 overflow-hidden"
          style={{ height: '600px' }}
        >
          <svg
            ref={svgRef}
            width={dimensions.width || 800}
            height={dimensions.height || 600}
            className="w-full h-full"
            viewBox={`0 0 ${dimensions.width || 800} ${dimensions.height || 600}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
              </marker>
            </defs>
            
            {/* 绘制边 */}
            {edges.map((edge, index) => {
              const source = nodePositions[edge.source];
              const target = nodePositions[edge.target];
              if (!source || !target) return null;
              
              const weight = edge.weight || 0.5;
              const normalizedWeight = (weight - minWeight) / weightRange;
              const strokeWidth = 1 + normalizedWeight * 4; // 1-5 像素
              
              return (
                <line
                  key={`edge-${index}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#9ca3af"
                  strokeWidth={strokeWidth}
                  opacity={0.6}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            
            {/* 绘制节点 */}
            {nodes.map((node) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;
              
              const nodeSize = getNodeSize(node, predictions);
              const nodeColor = getNodeColor(node);
              
              return (
                <g key={node.id}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={nodeSize}
                    fill={nodeColor}
                    stroke="#fff"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6 transition-all"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + nodeSize + 15}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#374151"
                    className="font-medium pointer-events-none"
                    style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
                  >
                    {node.label || node.id}
                  </text>
                  {node.probability && (
                    <text
                      x={pos.x}
                      y={pos.y + nodeSize + 30}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#6b7280"
                      className="pointer-events-none"
                    >
                      {(node.probability * 100).toFixed(0)}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
          <p className="text-sm text-indigo-900 mb-2">
            <strong>可视化说明：</strong>
          </p>
          <ul className="text-sm text-indigo-900 space-y-1 list-disc list-inside">
            <li>节点颜色表示不同类型：<span className="text-indigo-600">蓝色</span>（ICD编码）、<span className="text-red-600">红色</span>（疾病）、<span className="text-orange-600">橙色</span>（症状）、<span className="text-green-600">绿色</span>（治疗）</li>
            <li>节点大小表示ICD编码的预测概率（越大表示概率越高）</li>
            <li>边的粗细表示关联强度（越粗表示关联越强）</li>
            <li>节点之间的连接形成关系网络</li>
          </ul>
        </div>
      </div>
    );
  }

  // 构建完整的节点列表（包括ICD节点和实体节点）
  const allNodes = [...graphData.nodes];
  
  // 添加实体节点
  if (graphData.entities && predictions) {
    Object.entries(graphData.entities).forEach(([type, entities]) => {
      (entities || []).slice(0, 3).forEach(entity => {
        const nodeId = `entity_${type}_${entity}`;
        if (!allNodes.find(n => n.id === nodeId)) {
          allNodes.push({
            id: nodeId,
            label: entity,
            type: `entity_${type}`,
            level: 0
          });
        }
      });
    });
  }

  // 构建边列表，包括ICD层次关系边和实体关联边
  const allEdges = [...(graphData.edges || [])];
  
  // 为ICD节点添加层次关系边（如果还没有）
  graphData.nodes.forEach(node => {
    if (node.id && !node.id.startsWith('entity_')) {
      // 查找父节点
      const parts = node.id.split('.');
      if (parts.length > 1) {
        const parentCode = parts.slice(0, -1).join('.');
        if (graphData.nodes.find(n => n.id === parentCode)) {
          if (!allEdges.find(e => e.source === parentCode && e.target === node.id)) {
            const icdPred = predictions?.icdPredictions?.find(p => p.code === node.id);
            allEdges.push({
              source: parentCode,
              target: node.id,
              type: 'parent-child',
              weight: icdPred?.probability || 0.5
            });
          }
        }
      }
    }
  });

  // 为实体节点连接到相关的ICD节点
  allNodes.forEach(entityNode => {
    if (entityNode.id.startsWith('entity_')) {
      // 找到top ICD节点并连接
      (predictions?.icdPredictions || []).slice(0, 3).forEach(icdPred => {
        const icdNode = allNodes.find(n => n.id === icdPred.code);
        if (icdNode) {
          // 根据实体类型计算关联度
          let weight = 0.5;
          if (entityNode.type.includes('diseases')) {
            weight = icdPred.probability * 0.8;
          } else if (entityNode.type.includes('symptoms')) {
            weight = icdPred.probability * 0.6;
          }
          
          allEdges.push({
            source: entityNode.id,
            target: icdNode.id,
            type: 'entity-icd',
            weight: weight
          });
        }
      });
    }
  });

  // 调试信息
  console.log('所有节点:', allNodes);
  console.log('所有边:', allEdges);
  console.log('容器尺寸:', dimensions);

  // 确保有节点和边才计算位置
  if (allNodes.length === 0) {
    console.warn('没有节点数据，无法渲染图谱');
  }

  // 使用API数据渲染
  return renderGraph(allNodes, allEdges, predictions);
};

export default GraphViewer;
