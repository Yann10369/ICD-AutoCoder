/**
 * 溯源日志时间轴组件
 * 展示病历的完整操作轨迹
 */
import { useState } from 'react';
import {
  Clock,
  User,
  FileText,
  Code,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Brain,
  Filter,
  ChevronDown,
  ChevronRight,
  Info,
  AlertCircle
} from 'lucide-react';

// 操作类型配置
const ACTION_TYPE_CONFIG = {
  ai_suggest_accept: {
    label: '采纳AI推荐',
    color: 'text-green-600',
    bg: 'bg-green-100',
    border: 'border-green-200',
    icon: <Brain size={14} />,
  },
  ai_suggest_reject: {
    label: '拒绝AI推荐',
    color: 'text-red-600',
    bg: 'bg-red-100',
    border: 'border-red-200',
    icon: <XCircle size={14} />,
  },
  code_add_manual: {
    label: '手动添加编码',
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    border: 'border-orange-200',
    icon: <Code size={14} />,
  },
  code_remove: {
    label: '删除编码',
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-100',
    icon: <XCircle size={14} />,
  },
  code_reorder: {
    label: '调整编码顺序',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    icon: <RefreshCw size={14} />,
  },
  status_change: {
    label: '状态变更',
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    border: 'border-purple-200',
    icon: <Settings size={14} />,
  },
  qa_approve: {
    label: '质控通过',
    color: 'text-green-600',
    bg: 'bg-green-100',
    border: 'border-green-200',
    icon: <CheckCircle size={14} />,
  },
  qa_reject: {
    label: '质控打回',
    color: 'text-red-600',
    bg: 'bg-red-100',
    border: 'border-red-200',
    icon: <XCircle size={14} />,
  },
  version_switch: {
    label: '字典版本切换',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    icon: <Settings size={14} />,
  },
};

function TimelineItem({ log, isLast, expanded, onToggleExpand }) {
  const config = ACTION_TYPE_CONFIG[log.action_type] || {
    label: log.action_type,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    icon: <Info size={14} />,
  };

  const hasDetails = log.action_details && Object.keys(log.action_details).length > 0;

  return (
    <div className="relative pl-6 pb-4">
      {/* 时间轴连接线 */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 w-0.5 h-full bg-gray-200" />
      )}

      {/* 时间节点圆点 */}
      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${config.bg} ${config.border} border flex items-center justify-center`}>
        <span className={config.color}>{config.icon}</span>
      </div>

      {/* 内容卡片 */}
      <div
        className={`bg-white border ${config.border} rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer`}
        onClick={() => hasDetails && onToggleExpand(log.log_id)}
      >
        {/* 头部：操作类型和时间 */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${config.color}`}>
              {config.label}
            </span>
            {hasDetails && (
              <span className="text-gray-400">
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={12} />
            {log.timestamp}
          </div>
        </div>

        {/* 用户信息 */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <User size={14} className="text-gray-400" />
          <span>操作人：{log.user_name || `用户${log.user_id}`}</span>
          {log.ip_address && (
            <span className="text-gray-400">({log.ip_address})</span>
          )}
        </div>

        {/* 原因/备注 */}
        {log.reason && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
            <div className="flex items-start gap-2 text-sm text-amber-800">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{log.reason}</span>
            </div>
          </div>
        )}

        {/* 详细信息（可展开） */}
        {expanded && hasDetails && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              <div className="font-medium mb-2 text-gray-700">操作详情</div>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                <pre>{JSON.stringify(log.action_details, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditTrailTimeline({ caseId, logs: initialLogs, maxHeight }) {
  const [filterType, setFilterType] = useState('all');
  const [expandedItems, setExpandedItems] = useState([]);
  const [logs, setLogs] = useState(
    initialLogs || [
      // 模拟数据
      {
        log_id: 'log_001',
        action_type: 'status_change',
        user_id: 1,
        user_name: '张编码员',
        timestamp: '2024-01-20 14:30:25',
        action_details: {
          from_status: 'pending_coding',
          to_status: 'coding_in_progress',
        },
        reason: null,
        ip_address: '192.168.1.100',
      },
      {
        log_id: 'log_002',
        action_type: 'ai_suggest_accept',
        user_id: 1,
        user_name: '张编码员',
        timestamp: '2024-01-20 14:32:10',
        action_details: {
          code: 'I21.9',
          description: '急性心肌梗死',
          confidence: 95,
        },
        reason: null,
        ip_address: '192.168.1.100',
      },
      {
        log_id: 'log_003',
        action_type: 'ai_suggest_reject',
        user_id: 1,
        user_name: '张编码员',
        timestamp: '2024-01-20 14:33:45',
        action_details: {
          code: 'I50.9',
          description: '心力衰竭',
          confidence: 78,
        },
        reason: '病历中未提及心衰症状，无需编码',
        ip_address: '192.168.1.100',
      },
      {
        log_id: 'log_004',
        action_type: 'code_add_manual',
        user_id: 1,
        user_name: '张编码员',
        timestamp: '2024-01-20 14:35:20',
        action_details: {
          code: 'E11.9',
          description: '2型糖尿病',
          source: 'manual_input',
        },
        reason: '出院诊断中有糖尿病，AI未识别到',
        ip_address: '192.168.1.100',
      },
      {
        log_id: 'log_005',
        action_type: 'status_change',
        user_id: 1,
        user_name: '张编码员',
        timestamp: '2024-01-20 14:40:15',
        action_details: {
          from_status: 'coding_in_progress',
          to_status: 'pending_qa',
        },
        reason: '编码完成，提交质控',
        ip_address: '192.168.1.100',
      },
      {
        log_id: 'log_006',
        action_type: 'qa_approve',
        user_id: 2,
        user_name: '李质控员',
        timestamp: '2024-01-20 15:20:30',
        action_details: {
          qa_score: 88,
          ai_acceptance_rate: 0.85,
        },
        reason: '编码完整准确，通过质控',
        ip_address: '192.168.1.101',
      },
    ]
  );

  const filteredLogs =
    filterType === 'all'
      ? logs
      : logs.filter((log) => log.action_type === filterType);

  const toggleExpand = (logId) => {
    setExpandedItems((prev) =>
      prev.includes(logId)
        ? prev.filter((id) => id !== logId)
        : [...prev, logId]
    );
  };

  // 按类型统计
  const stats = {};
  logs.forEach((log) => {
    stats[log.action_type] = (stats[log.action_type] || 0) + 1;
  });

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      {/* 头部：标题和筛选 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="text-blue-600" size={18} />
            <span className="font-semibold text-gray-800">操作轨迹</span>
            <span className="text-sm text-gray-500">
              共 {logs.length} 条记录
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部操作</option>
              {Object.entries(ACTION_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                  {stats[key] ? ` (${stats[key]})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 操作类型图例 */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex flex-wrap gap-2">
        {Object.entries(ACTION_TYPE_CONFIG).slice(0, 6).map(([key, config]) => (
          <span
            key={key}
            className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${config.bg} ${config.color}`}
          >
            {config.icon}
            {config.label}
            {stats[key] ? ` ${stats[key]}` : ''}
          </span>
        ))}
      </div>

      {/* 时间轴列表 */}
      <div
        className="p-4 overflow-y-auto"
        style={{ maxHeight: maxHeight || '500px' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FileText size={48} className="mb-4 opacity-50" />
            <p className="text-lg">暂无操作记录</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <TimelineItem
              key={log.log_id}
              log={log}
              isLast={index === filteredLogs.length - 1}
              expanded={expandedItems.includes(log.log_id)}
              onToggleExpand={toggleExpand}
            />
          ))
        )}
      </div>

      {/* 底部信息 */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
        <span>显示 {filteredLogs.length} 条记录</span>
        <span>
          最后更新: {logs[0]?.timestamp || '-'}
        </span>
      </div>
    </div>
  );
}
