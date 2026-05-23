/**
 * 抽屉式面板组件
 * 用于图谱、DRG等非核心功能的折叠展示
 */
import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function Drawer({
  title,
  icon,
  isOpen: externalIsOpen,
  onOpenChange,
  children,
  position = 'bottom', // 'bottom' | 'right'
  defaultOpen = false,
  width = 400,
  height = 300,
  className = ''
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleToggle = () => {
    const newState = !isOpen;
    setInternalIsOpen(newState);
    onOpenChange?.(newState);
  };

  // 底部抽屉（用于图谱、DRG等）
  if (position === 'bottom') {
    return (
      <div className={`relative border-t border-gray-200 bg-white ${className}`}>
        {/* 抽屉标题栏 */}
        <button
          onClick={handleToggle}
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 group-hover:text-gray-900">
            {icon}
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <ChevronLeft
              size={18}
              className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* 抽屉内容 */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? 'opacity-100' : 'opacity-0 h-0 pointer-events-none'
          }`}
          style={{ maxHeight: isOpen ? `${height}px` : '0' }}
        >
          <div className="p-4 overflow-auto" style={{ maxHeight: `${height - 50}px` }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  // 右侧抽屉
  return (
    <div className={`h-full flex ${className}`}>
      {/* 抽屉内容 */}
      <div
        className={`h-full overflow-hidden transition-all duration-300 ease-in-out bg-white border-l border-gray-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 w-0 pointer-events-none'
        }`}
        style={{ width: isOpen ? width : 0 }}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <span className="font-medium text-gray-800">{title}</span>
            </div>
            <button
              onClick={handleToggle}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {children}
          </div>
        </div>
      </div>

      {/* 收起时的触发按钮 */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className="flex-shrink-0 flex items-center justify-center w-8 bg-gray-50 hover:bg-gray-100 border-l border-gray-200 transition-colors group"
          title={`展开${title}`}
        >
          <ChevronRight
            size={18}
            className="text-gray-400 group-hover:text-gray-600"
          />
        </button>
      )}
    </div>
  );
}
