import React from 'react';
import DirectoryTree from './DirectoryTree';
import { Database, BrainCog, Cpu } from 'lucide-react';

const LeftSidebar = ({ selectedItem, onSelectItem, onAddNew, width }) => {
  // 定义三个根目录
  const rootNodes = [
    {
      id: 'graph-root',
      name: '知识图谱',
      icon: Database,
      type: 'root',
      category: 'graph',
      children: []
    },
    {
      id: 'large-root',
      name: '大模型',
      icon: BrainCog,
      type: 'root',
      category: 'large',
      children: []
    },
    {
      id: 'small-root',
      name: '小模型',
      icon: Cpu,
      type: 'root',
      category: 'small',
      children: []
    }
  ];

  return (
    <div
      className="flex flex-col h-full bg-white border-r border-slate-200"
      style={{ width: `${width}%`, minWidth: '220px', maxWidth: '40%' }}
    >
      {/* 标题区 */}
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-800">资源管理器</h2>
      </div>

      {/* 目录树 */}
      <div className="flex-1 overflow-y-auto p-2">
        <DirectoryTree
          rootNodes={rootNodes}
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
          onAddNew={onAddNew}
        />
      </div>
    </div>
  );
};

export default LeftSidebar;
