/**
 * DRG 优化建议面板组件
 * 功能：DRG分组建议 + 病历证据定位高亮 + 一键应用
 * 配合后端 /api/coding-workbench/drg-suggestions
 */
import { useState } from 'react';
import {
  Activity,
  ChevronUp,
  ChevronDown,
  Zap,
  CheckCircle2,
  DollarSign,
  FileText,
  Search,
  ArrowUpRight
} from 'lucide-react';

function EvidenceHighlighter({ caseText, keyword, evidenceData }) {
  const [highlighted, setHighlighted] = useState(false);

  const handleHighlight = () => {
    setHighlighted(true);
    if (evidenceData && evidenceData.start !== -1) {
      console.log(`定位证据: ${keyword} at position ${evidenceData.start}`);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
        <Search size={14} className="text-slate-500 mt-0.5" />
        <div className="flex-1">
          <div className="text-xs text-slate-700 font-medium">证据定位</div>
          <div className="text-xs text-slate-600 mt-0.5">
            {evidenceData?.snippet ? (
              <span>病历中发现相关描述: "...{evidenceData.snippet}..."</span>
            ) : (
              <span className="text-slate-500">点击搜索病历文本...</span>
            )}
          </div>
        </div>
        <button
          onClick={handleHighlight}
          className="text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
        >
          定位
        </button>
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion, onApply, applied }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [applying, setApplying] = useState(false);

  const getGainColor = () => {
    if (suggestion.weightDelta > 0.1) return 'text-emerald-600 bg-emerald-100';
    if (suggestion.weightDelta > 0) return 'text-emerald-500 bg-emerald-50';
    return 'text-slate-500 bg-slate-50';
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await onApply(suggestion);
    } finally {
      setApplying(false);
    }
  };

  const typeConfig = {
    complication: { icon: <Activity size={16} /> },
    principal_dx: { icon: <Zap size={16} /> },
    drg_optimization: { icon: <DollarSign size={16} /> }
  };

  const config = typeConfig[suggestion.type] || typeConfig.complication;

  return (
    <div className={`p-3 rounded-lg border border-slate-200 mb-2 hover:border-slate-300 transition-all bg-white`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <div className="mt-0.5 text-slate-500">{config.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">
                {suggestion.code}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getGainColor()}`}>
                {suggestion.weightDelta > 0 ? '+' : ''}{suggestion.weightDelta.toFixed(3)} RW
              </span>
              {applied && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  已应用
                </span>
              )}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {suggestion.description}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {suggestion.reason}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 ml-2">
          {!applied && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {applying ? '应用中...' : (
                <>
                  <ArrowUpRight size={12} />
                  一键应用
                </>
              )}
            </button>
          )}
          {suggestion.evidence && (
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
            >
              <FileText size={12} />
              {showEvidence ? '隐藏证据' : '查看证据'}
            </button>
          )}
        </div>
      </div>

      {showEvidence && suggestion.keyword && (
        <EvidenceHighlighter
          caseText={suggestion.caseText}
          keyword={suggestion.keyword}
          evidenceData={suggestion.evidence}
        />
      )}

      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <DollarSign size={12} />
          预估收益: <span className="font-medium text-emerald-600">¥{suggestion.estimatedGain.toLocaleString()}</span>
        </div>
        <div className="text-xs text-slate-400">
          {suggestion.originalDrg} → {suggestion.newDrg}
        </div>
      </div>
    </div>
  );
}

function DrgSummary({ drgInfo }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-lg font-bold text-slate-700 font-mono">{drgInfo.currentDrg || '待计算'}</div>
        <div className="text-xs text-slate-500">当前 DRG 分组</div>
      </div>
      <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-lg font-bold text-slate-700">{drgInfo.currentWeight || '0.000'}</div>
        <div className="text-xs text-slate-500">当前权重</div>
      </div>
      <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="text-lg font-bold text-emerald-700">¥{drgInfo.estimatedPayment?.toLocaleString() || '0'}</div>
        <div className="text-xs text-emerald-600">预估付费</div>
      </div>
    </div>
  );
}

export default function DrgSuggestionPanel({
  caseId,
  suggestions = [],
  drgInfo,
  onApplySuggestion,
  onApplyAll,
  loading = false
}) {
  const [expanded, setExpanded] = useState(true);
  const [appliedIds, setAppliedIds] = useState(new Set());

  const handleApply = async (suggestion) => {
    if (onApplySuggestion) {
      await onApplySuggestion(suggestion);
    }
    setAppliedIds(prev => new Set([...prev, suggestion.id]));
  };

  const handleApplyAll = async () => {
    const unapplied = suggestions.filter(s => !appliedIds.has(s.id));
    for (const suggestion of unapplied) {
      await handleApply(suggestion);
    }
    if (onApplyAll) {
      await onApplyAll(unapplied);
    }
  };

  const totalPotentialGain = suggestions
    .filter(s => !appliedIds.has(s.id))
    .reduce((sum, s) => sum + s.estimatedGain, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div
        className="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-slate-600" />
          <h3 className="font-semibold text-slate-800">DRG 优化建议</h3>
          {suggestions.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
              {suggestions.length} 条建议
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalPotentialGain > 0 && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
              <DollarSign size={12} />
              可提升 ¥{totalPotentialGain.toLocaleString()}
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4">
          <DrgSummary drgInfo={drgInfo} />

          {suggestions.length > appliedIds.size && (
            <div className="mb-4">
              <button
                onClick={handleApplyAll}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md text-sm"
              >
                <Zap size={16} />
                一键应用所有优化建议
              </button>
            </div>
          )}

          {suggestions && suggestions.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <SuggestionCard
                  key={suggestion.id || idx}
                  suggestion={suggestion}
                  onApply={handleApply}
                  applied={appliedIds.has(suggestion.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-2" />
              <div className="text-sm text-slate-500">当前编码组合已最优</div>
              <div className="text-xs text-slate-400 mt-1">未发现可优化的 DRG 分组建议</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
