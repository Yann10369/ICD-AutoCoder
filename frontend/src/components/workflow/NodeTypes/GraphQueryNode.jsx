import React from 'react';
import { Handle, Position } from 'reactflow';
import { Database } from 'lucide-react';

const GraphQueryNode = ({ data, selected }) => {
  return (
    <div
      className={`
        px-4 py-3 shadow-md rounded-md bg-white border-2 w-[180px]
        ${selected ? 'border-blue-500' : 'border-slate-200'}
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-green-600 text-white p-1 rounded">
          <Database size={14} />
        </div>
        <div className="font-bold text-sm">{data.label || '图谱查询'}</div>
      </div>
      {data.graphConfigId && (
        <div className="text-xs text-slate-500 mb-1">
          配置: {data.graphConfigId.slice(0, 8)}...
        </div>
      )}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-green-600" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-600" />
    </div>
  );
};

export default GraphQueryNode;
