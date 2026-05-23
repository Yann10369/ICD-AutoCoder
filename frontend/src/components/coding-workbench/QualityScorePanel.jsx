/**
 * 编码质量评分面板组件
 * 功能：实时编码质量评分 + 问题列表 + 修复建议
 * 配合后端 /api/coding-workbench/pool/{case_id}/validate API
 */
import { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Wrench,
  ShieldAlert,
  Gauge
} from 'lucide-react';

// 【医疗级配色】问题严重程度颜色配置
// 原则：柔和背景 + 低饱和度文字，只作为"指示灯"而不是"装饰色"
const SEVERITY_CONFIG = {
  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-100' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', badge: 'bg-amber-100' },
  suggestion: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', badge: 'bg-slate-100' }
};

// 问题类型图标
const ISSUE_TYPE_ICONS = {
  principal_diagnosis: <ShieldAlert size={14} />,
  dx_proc_match: <Info size={14} />,
  missing_mcode: <AlertCircle size={14} />,
  missing_external_cause: <AlertCircle size={14} />,
  invalid_format: <XCircle size={14} />,
  completeness: <CheckCircle2 size={14} />
};

function IssueItem({ issue, onFixClick }) {
  const config = SEVERITY_CONFIG[issue.severity];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`p-3 rounded-lg border ${config.border} ${config.bg} mb-2`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <span className={`${config.text} mt-0.5`}>
            {ISSUE_TYPE_ICONS[issue.type] || <AlertCircle size={14} />}
          </span>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${config.text}`}>
              {issue.message}
            </div>
            {issue.code && (
              <div className="text-xs text-gray-500 mt-0.5 font-mono">
                涉及编码: {issue.code}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {issue.fixable && (
            <button
              onClick={() => onFixClick(issue)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
            >
              <Wrench size={12} />
              一键修复
            </button>
          )}
          {issue.details && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {expanded && issue.details && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
          {issue.details}
        </div>
      )}
    </div>
  );
}

function ScoreGauge({ score }) {
  // 【医疗级配色】根据分数确定颜色
  // 原则：柔和单色，饱和度统一，避免刺眼
  const getColors = () => {
    if (score >= 90) return { start: '#059669', end: '#047857', text: 'text-emerald-600' }; // 莫兰迪绿
    if (score >= 70) return { start: '#d97706', end: '#b45309', text: 'text-amber-600' };      // 莫兰迪橙
    return { start: '#dc2626', end: '#b91c1c', text: 'text-red-600' };                         // 莫兰迪红
  };

  const getLabel = () => {
    if (score >= 90) return '优秀';
    if (score >= 70) return '良好';
    if (score >= 50) return '需改进';
    return '不合格';
  };

  const colors = getColors();

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20">
        {/* 背景圆环 - 浅灰 */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="6"
          />
          {/* 进度圆环 - 单色柔和渐变 */}
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            style={{
              strokeDasharray: `${(score / 100) * 220} 220`,
              stroke: 'url(#gradient)'
            }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.start} />
              <stop offset="100%" stopColor={colors.end} />
            </linearGradient>
          </defs>
        </svg>
        {/* 分数 - 灰阶文字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-800">{score}</span>
          <span className="text-xs text-slate-500">分</span>
        </div>
      </div>
      <div>
        <div className={`text-lg font-bold ${colors.text}`}>
          {getLabel()}
        </div>
        <div className="text-xs text-slate-500">编码质量评分</div>
      </div>
    </div>
  );
}

export default function QualityScorePanel({
  caseId,
  validationData,
  onFixIssue,
  loading = false
}) {
  const [expanded, setExpanded] = useState(true);

  // 统计数据
  const stats = {
    errors: validationData?.errors?.filter(i => i.severity === 'error').length || 0,
    warnings: validationData?.errors?.filter(i => i.severity === 'warning').length || 0,
    suggestions: validationData?.errors?.filter(i => i.severity === 'suggestion').length || 0,
    total: validationData?.errors?.length || 0,
    score: validationData?.score || 0,
    canSubmit: validationData?.canSubmit || false
  };

  const handleFixClick = (issue) => {
    if (onFixIssue) {
      onFixIssue(issue);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 头部 - 医疗级配色 */}
      <div
        className="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Gauge size={18} className="text-slate-600" />
          <h3 className="font-semibold text-slate-800">编码质量检测</h3>
          {stats.total > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              stats.errors > 0 ? 'bg-red-100 text-red-600' :
              stats.warnings > 0 ? 'bg-amber-100 text-amber-600' :
              'bg-emerald-100 text-emerald-600'
            }`}>
              {stats.total} 项待处理
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stats.canSubmit ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <CheckCircle2 size={12} />
              可提交质控
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
              <XCircle size={12} />
              需先修复问题
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4">
          {/* 评分仪表 + 统计概览 - 医疗级配色 */}
          <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-100">
            <ScoreGauge score={stats.score} />

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className={`text-2xl font-bold ${stats.errors > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                  {stats.errors}
                </div>
                <div className="text-xs text-slate-500">错误</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${stats.warnings > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                  {stats.warnings}
                </div>
                <div className="text-xs text-slate-500">警告</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${stats.suggestions > 0 ? 'text-slate-600' : 'text-slate-300'}`}>
                  {stats.suggestions}
                </div>
                <div className="text-xs text-slate-500">建议</div>
              </div>
            </div>
          </div>

          {/* 问题列表 */}
          {validationData?.errors && validationData.errors.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* 错误优先显示 */}
              {validationData.errors
                .sort((a, b) => {
                  const order = { error: 0, warning: 1, suggestion: 2 };
                  return order[a.severity] - order[b.severity];
                })
                .map((issue, idx) => (
                  <IssueItem
                    key={idx}
                    issue={issue}
                    onFixClick={handleFixClick}
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-2" />
              <div className="text-sm text-slate-500">编码质量优秀，未检测到问题</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
