/**
 * 实体展示面板组件
 * 展示NER识别的医学实体，包含类型标签和置信度
 */
import { useState } from 'react';
import {
  Stethoscope,
  Pill,
  Scissors,
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';

// 实体类型配置
const ENTITY_TYPE_CONFIG = {
  Disease: {
    icon: <Stethoscope size={14} />,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: '疾病',
  },
  Drug: {
    icon: <Pill size={14} />,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    label: '药物',
  },
  Procedure: {
    icon: <Scissors size={14} />,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: '手术/操作',
  },
  Problem: {
    icon: <AlertCircle size={14} />,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    label: '健康问题',
  },
  Other: {
    icon: <Activity size={14} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: '其他',
  },
};

// 获取置信度颜色
const getConfidenceColor = (score) => {
  if (score >= 0.9) return 'bg-green-500';
  if (score >= 0.7) return 'bg-blue-500';
  if (score >= 0.5) return 'bg-yellow-500';
  return 'bg-gray-400';
};

// 获取置信度标签
const getConfidenceLabel = (score) => {
  if (score >= 0.9) return '高';
  if (score >= 0.7) return '中';
  if (score >= 0.5) return '低';
  return '很低';
};

function EntityCard({ entity }) {
  const [expanded, setExpanded] = useState(false);
  const type = entity.entity_group || 'Other';
  const config = ENTITY_TYPE_CONFIG[type] || ENTITY_TYPE_CONFIG.Other;

  return (
    <div
      className={`p-3 rounded-lg border ${config.border} ${config.bg} transition-all hover:shadow-sm`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={config.color}>{config.icon}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${config.color} ${config.bg}`}>
            {config.label}
          </span>
          <span className="font-medium text-gray-800">{entity.word}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getConfidenceColor(entity.score)} rounded-full transition-all`}
                style={{ width: `${Math.round(entity.score * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {getConfidenceLabel(entity.score)} {Math.round(entity.score * 100)}%
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-white/50 rounded"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-200/50 text-xs text-gray-500">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-400">实体词:</span>
              <span className="ml-1 text-gray-700">{entity.word}</span>
            </div>
            <div>
              <span className="text-gray-400">置信度:</span>
              <span className="ml-1 text-gray-700">{entity.score.toFixed(4)}</span>
            </div>
            {entity.start !== undefined && (
              <div>
                <span className="text-gray-400">起始位置:</span>
                <span className="ml-1 text-gray-700">{entity.start}</span>
              </div>
            )}
            {entity.end !== undefined && (
              <div>
                <span className="text-gray-400">结束位置:</span>
                <span className="ml-1 text-gray-700">{entity.end}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EntityGroup({ type, entities }) {
  const config = ENTITY_TYPE_CONFIG[type] || ENTITY_TYPE_CONFIG.Other;
  const [collapsed, setCollapsed] = useState(false);

  if (!entities || entities.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors mb-2"
      >
        <span className={config.color}>{config.icon}</span>
        <span className="font-medium text-gray-700">{config.label}</span>
        <span className="text-xs text-gray-500">({entities.length})</span>
        <span className="ml-auto">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-2 pl-2">
          {entities.map((entity, idx) => (
            <EntityCard key={idx} entity={entity} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EntityDisplayPanel({
  entities = [],
  groupedEntities = null,
  loading = false,
  onRefresh = null,
  title = 'AI诊断依据',
}) {
  const [showAll, setShowAll] = useState(false);

  // 如果传入了分组数据直接使用，否则自行分组
  const groups = groupedEntities || (() => {
    const groups = {
      Disease: [],
      Drug: [],
      Procedure: [],
      Problem: [],
      Other: [],
    };
    entities.forEach(entity => {
      const type = entity.entity_group || 'Other';
      if (groups[type]) {
        groups[type].push(entity);
      } else {
        groups.Other.push(entity);
      }
    });
    return groups;
  })();

  const totalEntities = entities.length;
  const visibleGroups = showAll ? groups : Object.fromEntries(Object.entries(groups).filter(([_, v]) => v.length > 0));

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-blue-500" size={18} />
          <span className="font-semibold text-gray-700">{title}</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw size={24} className="animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">正在识别医疗实体...</span>
        </div>
      </div>
    );
  }

  if (totalEntities === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-blue-500" size={18} />
          <span className="font-semibold text-gray-700">{title}</span>
        </div>
        <div className="text-center py-6 text-gray-400">
          <Activity size={32} className="mx-auto mb-2 opacity-50" />
          <p>未识别到医疗实体</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-500" size={18} />
            <span className="font-semibold text-gray-700">{title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
              {totalEntities} 个实体
            </span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
              title="刷新"
            >
              <RefreshCw size={14} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 max-h-[400px] overflow-y-auto">
        {Object.entries(groups).map(([type, typeEntities]) => (
          <EntityGroup key={type} type={type} entities={typeEntities} />
        ))}
      </div>
    </div>
  );
}