import React from 'react';
import { Handle, Position } from 'reactflow';
import { Cpu } from 'lucide-react';

const SmallModelNode = ({ data, selected }) => {
  return (
    <div
      className={`
        px-4 py-3 shadow-md rounded-md bg-white border-2 w-[180px]
        ${selected ? 'border-blue-500' : 'border-slate-200'}
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-blue-500 text-white p-1 rounded">
          <Cpu size={14} />
        </div>
        <div className="font-bold text-sm">{data.label || '小模型预测'}</div>
      </div>
      {data.modelId && (
        <div className="text-xs text-slate-500 mb-1">
          模型: {data.modelId.slice(0, 8)}...
        </div>
      )}
      {data.topK && (
        <div className="text-xs text-slate-500">
          Top-K: {data.topK}
        </div>
      )}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </div>
  );
};

export default SmallModelNode;
