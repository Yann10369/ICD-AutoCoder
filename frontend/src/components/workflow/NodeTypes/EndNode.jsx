import React from 'react';
import { Handle, Position } from 'reactflow';
import { Flag } from 'lucide-react';

const EndNode = ({ data, selected }) => {
  return (
    <div
      className={`
        px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[100px]
        ${selected ? 'border-blue-500' : 'border-slate-200'}
      `}
    >
      <div className="flex items-center gap-2">
        <div className="bg-red-500 text-white p-1 rounded">
          <Flag size={14} />
        </div>
        <div className="font-bold text-sm">{data.label || '结束'}</div>
      </div>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-500" />
    </div>
  );
};

export default EndNode;
