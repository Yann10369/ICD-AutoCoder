/**
 * 悬浮快捷操作按钮组
 * 用于推荐卡片 hover 时显示快速操作：采纳、替换、忽略、标记
 */
import { Check, X, ArrowRight, Flag } from 'lucide-react';

export default function FloatingActions({
  onAccept,
  onReplace,
  onIgnore,
  onFlag,
  show = false,
  position = 'right' // 'right' | 'bottom'
}) {
  if (!show) return null;

  const actionButtons = [
    { icon: <Check size={14} />, label: '采纳', onClick: onAccept, color: 'green' },
    { icon: <ArrowRight size={14} />, label: '替换', onClick: onReplace, color: 'blue' },
    { icon: <Flag size={14} />, label: '标记', onClick: onFlag, color: 'amber' },
    { icon: <X size={14} />, label: '忽略', onClick: onIgnore, color: 'gray' },
  ];

  const colorClasses = {
    green: 'bg-green-500 hover:bg-green-600 text-white',
    blue: 'bg-blue-500 hover:bg-blue-600 text-white',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white',
    gray: 'bg-gray-400 hover:bg-gray-500 text-white',
  };

  if (position === 'bottom') {
    return (
      <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
        {actionButtons.map((btn, idx) => (
          <button
            key={idx}
            onClick={btn.onClick}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${colorClasses[btn.color]}`}
            title={btn.label}
          >
            {btn.icon}
            <span>{btn.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {actionButtons.map((btn, idx) => (
        <button
          key={idx}
          onClick={btn.onClick}
          className={`p-1.5 rounded transition-colors ${colorClasses[btn.color]}`}
          title={btn.label}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
