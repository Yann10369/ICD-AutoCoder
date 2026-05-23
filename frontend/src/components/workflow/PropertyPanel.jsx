import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

const PropertyPanel = ({ node, onUpdate, onDelete }) => {
  const [data, setData] = useState(node.data);

  useEffect(() => {
    setData(node.data);
  }, [node]);

  const handleChange = (field, value) => {
    setData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    onUpdate(node.id, data);
  };

  const nodeTypes = {
    startNode: '开始节点',
    endNode: '结束节点',
    smallModelNode: '小模型预测',
    graphQueryNode: '图谱查询',
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">属性配置</h3>
        <span className="text-xs text-slate-500">
          {nodeTypes[node.type] || node.type}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            节点名称
          </label>
          <input
            type="text"
            value={data.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            onBlur={handleSave}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            placeholder="输入节点名称"
          />
        </div>

        {/* 小模型节点特有配置 */}
        {node.type === 'smallModelNode' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                选择小模型
              </label>
              <select
                value={data.modelId || ''}
                onChange={(e) => handleChange('modelId', e.target.value)}
                onBlur={handleSave}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              >
                <option value="">请选择模型</option>
                {/* 选项会动态加载，这里占位 */}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Top-K
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={data.topK || 5}
                onChange={(e) => handleChange('topK', parseInt(e.target.value))}
                onBlur={handleSave}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </>
        )}

        {/* 图谱查询节点特有配置 */}
        {node.type === 'graphQueryNode' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                选择图谱配置
              </label>
              <select
                value={data.graphConfigId || ''}
                onChange={(e) => handleChange('graphConfigId', e.target.value)}
                onBlur={handleSave}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              >
                <option value="">请选择图谱配置</option>
                {/* 选项会动态加载，这里占位 */}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cypher 查询模板
              </label>
              <textarea
                value={data.cypher || ''}
                onChange={(e) => handleChange('cypher', e.target.value)}
                onBlur={handleSave}
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono resize-none"
                placeholder="MATCH (n)-[r]->(m) RETURN n, r, m"
              />
            </div>
          </>
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-200">
        <button
          onClick={onDelete}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
          删除节点
        </button>
      </div>
    </div>
  );
};

export default PropertyPanel;
