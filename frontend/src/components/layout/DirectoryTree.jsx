import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, File, Plus } from 'lucide-react';
import { listConfigs } from '../../api/modelConfigs';

const DirectoryTree = ({ rootNodes, selectedItem, onSelectItem, onAddNew }) => {
  const [expandedNodes, setExpandedNodes] = useState({
    'graph-root': true,
    'large-root': true,
    'small-root': true
  });
  const [itemsByRoot, setItemsByRoot] = useState({
    graph: [],
    large: [],
    small: []
  });
  const [loading, setLoading] = useState(false);

  // 当 props.onAddNew 变化时更新
  React.useEffect(() => {
    // 保持引用
  }, [onAddNew]);

  // 加载配置数据，按分类分组
  const loadItems = async () => {
    setLoading(true);
    try {
      const configs = await listConfigs();
      if (!Array.isArray(configs)) {
        setItemsByRoot({ graph: [], large: [], small: [] });
        return;
      }

      const grouped = {
        graph: [],
        large: [],
        small: []
      };

      configs.forEach(cfg => {
        let category = cfg.category || 'small';
        // 确保 category 在分组中存在（兼容大小写问题）
        if (grouped[category] === undefined) {
          // 尝试小写匹配
          const catLower = category.toLowerCase();
          if (grouped[catLower] !== undefined) {
            category = catLower;
          } else {
            category = 'small';  // 默认归类到小模型
          }
        }
        grouped[category].push({
          id: cfg.id,
          name: cfg.name,
          category: category,
          data: cfg
        });
      });

      setItemsByRoot(grouped);
    } catch (err) {
      console.error('加载配置列表失败:', err);
      setItemsByRoot({ graph: [], large: [], small: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const toggleExpand = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const handleSelectItem = (item) => {
    onSelectItem(item);
  };

  const handleAddNew = (category, e) => {
    e.stopPropagation();
    if (onAddNew) {
      onAddNew(category);
    }
  };

  // 递归渲染节点
  const renderNode = (rootNode) => {
    const isExpanded = expandedNodes[rootNode.id];
    const items = itemsByRoot[rootNode.category] || [];
    const Icon = rootNode.icon;

    return (
      <div key={rootNode.id} className="mb-1">
        {/* 根节点 */}
        <div
          className={`
            flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-slate-100 transition-colors
            ${isExpanded ? 'bg-slate-50' : ''}
          `}
          onClick={() => toggleExpand(rootNode.id)}
        >
          {isExpanded ? (
            <FolderOpen size={16} className="text-blue-600 shrink-0" />
          ) : (
            <Folder size={16} className="blue-600 text-slate-500 shrink-0" />
          )}
          <Icon size={16} className="text-slate-600 shrink-0" />
          <span className="text-sm font-medium text-slate-700 flex-1">
            {rootNode.name}
            {items.length > 0 && <span className="text-xs text-slate-400 ml-1">({items.length})</span>}
          </span>
          {/* 新增按钮 - 只对图谱和大模型显示 */}
          {(rootNode.category === 'graph' || rootNode.category === 'large') && (
            <button
              onClick={(e) => handleAddNew(rootNode.category, e)}
              className="p-0.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
              title={`新增${rootNode.name}配置`}
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* 子项列表 */}
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {loading && (
              <div className="text-xs text-slate-400 px-2 py-1">加载中...</div>
            )}
            {!loading && items.length === 0 && (
              <div className="text-xs text-slate-400 px-2 py-1">暂无配置</div>
            )}
            {items.map(item => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`
                    flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-colors
                    ${isSelected
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                    }
                  `}
                  onClick={() => handleSelectItem(item)}
                >
                  <File size={14} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                  <span className="text-sm truncate flex-1">{item.name}</span>
                  {/* 如果是小模型且禁用，显示灰色指示器 */}
                  {item.category === 'small' && item.data?.enabled === false && (
                    <div className="w-2 h-2 rounded-full bg-slate-300" title="已禁用" />
                  )}
                  {item.category === 'small' && item.data?.enabled !== false && (
                    <div className="w-2 h-2 rounded-full bg-green-400" title="已启用" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {rootNodes.map(renderNode)}
    </div>
  );
};

export default DirectoryTree;
