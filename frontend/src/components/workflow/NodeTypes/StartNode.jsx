import React from 'react';
import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

const StartNode = ({ data, selected }) => {
  return (
    <div
      className={`
        px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[100px]
        ${selected ? 'border-blue-500' : 'border-slate-200'}
      `}
    >
      <div className="flex items-center gap-2">
        <div className="bg-green-500 text-white p-1 rounded">
          <Play size={14} />
        </div>
        <div className="font-bold text-sm">{data.label || '开始'}</div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500" />
    </div>
  );
};

export default StartNode;
