/**
 * 顶部状态栏 - 包含AI引擎状态指示器
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// AI模型状态指示器
function ModelStatusIndicator({ name, endpoint, color, delay }) {
  const [status, setStatus] = useState('checking'); // checking, healthy, warning, error
  const [latency, setLatency] = useState(null);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const checkStatus = async () => {
      // 防抖：距离上次更新少于500ms不更新
      const now = Date.now();
      if (now - lastUpdateRef.current < 500) return;

      const startTime = Date.now();
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });

        const elapsed = Date.now() - startTime;
        lastUpdateRef.current = now;

        if (response.ok) {
          if (elapsed < 500) {
            setStatus('healthy');
          } else if (elapsed < 1500) {
            setStatus('warning');
          } else {
            setStatus('error');
          }
        } else {
          setStatus('error');
        }
      } catch (err) {
        lastUpdateRef.current = now;
        setStatus('error');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000); // 每10秒检查一次
    return () => clearInterval(interval);
  }, [endpoint]);

  const statusColors = {
    checking: 'bg-gray-400 animate-pulse',
    healthy: `bg-${color}-500`,
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  const statusText = {
    checking: '检查中...',
    healthy: '运行正常',
    warning: '响应较慢',
    error: '连接异常',
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
      <div className={`w-2.5 h-2.5 rounded-full ${status === 'healthy' ? `bg-${color}-500` : ''} ${status === 'warning' ? 'bg-amber-500 animate-pulse' : ''} ${status === 'error' ? 'bg-red-500' : ''} ${status === 'checking' ? 'bg-gray-400 animate-pulse' : ''}`} />
      <span className="text-xs text-slate-600">{name}</span>
      {latency !== null && (
        <span className={`text-xs font-mono ${latency < 500 ? 'text-green-600' : latency < 1500 ? 'text-amber-600' : 'text-red-600'}`}>
          {latency}ms
        </span>
      )}
    </div>
  );
}

export default function Header() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
      {/* 左侧：页面标题 */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-800">ICD 智能编码系统</h1>
        <div className="text-sm text-gray-500">
          {currentTime.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </div>
      </div>

      {/* 右侧：AI引擎状态 + 用户信息 */}
      <div className="flex items-center gap-4">
        {/* AI引擎状态指示器 */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500 mr-1">AI引擎:</div>
          <ModelStatusIndicator
            name="小模型"
            endpoint="/api/models"
            color="teal"
          />
          <ModelStatusIndicator
            name="大模型"
            endpoint="/api/explain"
            color="blue"
          />
          <ModelStatusIndicator
            name="知识图谱"
            endpoint="/api/graph/query?icd=I25.1"
            color="violet"
          />
        </div>

        {/* 分隔线 */}
        <div className="w-px h-8 bg-gray-200" />

        {/* 用户信息 */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-800">{user?.full_name || user?.username}</div>
            <div className="text-xs text-gray-500">
              {user?.department || '病案科'} · {user?.role === 'admin' ? '系统管理员' : user?.role === 'coder' ? '编码员' : user?.role === 'doctor' ? '主治医生' : user?.role}
            </div>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium shadow-md">
            {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
