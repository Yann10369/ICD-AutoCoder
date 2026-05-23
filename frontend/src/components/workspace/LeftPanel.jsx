/**
 * 左侧栏：病历原文与解析区 (35%)
 * 实现PRD核心功能：
 * - 多维文书聚合视窗（标签页切换）
 * - 双向溯源高亮（点击编码时证据闪烁）
 * - 反向编码建议（选中文本弹出补充建议）
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { nerQualityService } from '../../services/nerQualityService';

// 【医疗级配色】证据高亮样式配置
// 原则：极浅底色 + 下划线标记，不干扰主干阅读
const EVIDENCE_HIGHLIGHT_STYLE = {
  highConfidence: 'bg-emerald-50 text-slate-800 border-b-2 border-emerald-400',
  mediumConfidence: 'bg-amber-50 text-slate-800 border-b-2 border-amber-400',
  lowConfidence: 'bg-slate-100 text-slate-700 border-b-2 border-slate-400',
  default: 'bg-blue-50 text-slate-700 border-b border-blue-200',
};

// 【医疗级配色】NER实体类型配置
// 原则：极浅背景色，仅作为区分，文字保持深灰色保证可读性
const ENTITY_TYPES = {
  symptoms: { label: '症状', style: 'bg-amber-50 border-b border-amber-300 text-slate-800' },
  diseases: { label: '疾病', style: 'bg-blue-50 border-b border-blue-300 text-slate-800' },
  operations: { label: '手术', style: 'bg-emerald-50 border-b border-emerald-300 text-slate-800' },
  drugs: { label: '药物', style: 'bg-violet-50 border-b border-violet-300 text-slate-800' },
  labs: { label: '检验', style: 'bg-slate-100 border-b border-slate-300 text-slate-700' },
};

// 文书类型配置
const DOCUMENT_TABS = [
  { id: 'discharge', label: '出院小结', icon: '📋' },
  { id: 'operation', label: '手术记录', icon: '🔪' },
  { id: 'pathology', label: '病理报告', icon: '🔬' },
  { id: 'lab', label: '检验报告', icon: '📊' },
];

// 证据数据库 - 关联ICD编码与病历中的证据文本
const EVIDENCE_DATABASE = {
  'I21.0': [
    { text: '胸痛', type: 'symptoms', confidence: 0.96 },
    { text: 'ST段弓背向上抬高', type: 'labs', confidence: 0.94 },
    { text: '肌钙蛋白I：2.5ng/ml（升高）', type: 'labs', confidence: 0.95 },
  ],
  'I10': [
    { text: '高血压病史10年', type: 'diseases', confidence: 0.92 },
    { text: '最高血压180/100mmHg', type: 'labs', confidence: 0.90 },
  ],
  'E11.9': [
    { text: '2型糖尿病史5年', type: 'diseases', confidence: 0.89 },
    { text: '二甲双胍治疗', type: 'drugs', confidence: 0.85 },
  ],
  'Z95.0': [
    { text: '支架植入术', type: 'operations', confidence: 0.45 },
  ],
  'I25.1': [
    { text: '冠状动脉粥样硬化', type: 'diseases', confidence: 0.67 },
  ],
};

// NER实体类型映射 - BiomedNLP输出 -> 前端展示类型
const NER_TYPE_MAPPING = {
  'Disease': 'diseases',
  'Symptom': 'symptoms',
  'Procedure': 'operations',
  'Drug': 'drugs',
  'Test': 'labs',
  'Anatomy': 'diseases',
  'Other': 'symptoms',
};

export default function LeftPanel({
  patientInfo,
  medicalText,
  onTextChange,
  highlightedEvidence = [], // 从外部传入的需要高亮的证据
  onSelectionSuggest = null, // 选中文本后的回调
  selectedCode = null, // 当前选中的ICD编码
}) {
  const [showLegend, setShowLegend] = useState(true);
  const [activeTab, setActiveTab] = useState('discharge');
  const [selectionPopup, setSelectionPopup] = useState(null);
  const [nerEntities, setNerEntities] = useState([]); // NER实体
  const [nerLoading, setNerLoading] = useState(false);
  const textAreaRef = useRef(null);
  const containerRef = useRef(null);

  // 调用NER API获取实体 - 需要在useEffect之前定义
  const fetchNerEntities = useCallback(async (text) => {
    if (!text || text.trim().length < 5) {
      setNerEntities([]);
      return;
    }
    setNerLoading(true);
    try {
      const entities = await nerQualityService.getEntities(text);
      setNerEntities(entities);
    } catch (err) {
      console.error('NER识别失败:', err);
      setNerEntities([]);
    } finally {
      setNerLoading(false);
    }
  }, []);

  // 当文本变化时调用NER API
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNerEntities(medicalText);
    }, 500); // 防抖500ms
    return () => clearTimeout(timer);
  }, [medicalText, fetchNerEntities]);

  // 根据选中文本生成编码建议
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length < 2) {
      setSelectionPopup(null);
      return;
    }

    // 获取选择位置
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (!containerRect) return;

    // 模拟AI建议 - 根据选中文本生成可能的编码
    const suggestions = generateSuggestions(selectedText);

    if (suggestions.length > 0) {
      setSelectionPopup({
        text: selectedText,
        top: rect.bottom - containerRect.top + 5,
        left: rect.left - containerRect.left,
        suggestions,
      });
    }
  };

  // 根据选中文本生成编码建议
  const generateSuggestions = (text) => {
    const suggestions = [];
    const textLower = text.toLowerCase();

    // 简单规则匹配（实际应调用AI接口）
    if (textLower.includes('胸痛') || textLower.includes('心肌梗死')) {
      suggestions.push({ code: 'I21.0', description: '急性前壁心肌梗死', confidence: 0.95 });
    }
    if (textLower.includes('高血压')) {
      suggestions.push({ code: 'I10', description: '原发性高血压', confidence: 0.92 });
    }
    if (textLower.includes('糖尿病')) {
      suggestions.push({ code: 'E11.9', description: '2型糖尿病', confidence: 0.88 });
    }
    if (textLower.includes('支架') || textLower.includes('植入')) {
      suggestions.push({ code: 'Z95.0', description: '心脏支架植入状态', confidence: 0.75 });
    }
    if (textLower.includes('呼吸') || textLower.includes('肺')) {
      suggestions.push({ code: 'J44.9', description: '慢性阻塞性肺疾病', confidence: 0.65 });
    }

    return suggestions;
  };

  // 渲染带证据高亮的文本
  const renderTextWithEvidence = (text) => {
    if (!text) return null;

    let result = text;
    let segments = [{ text, type: 'normal' }];

    // 优先使用NER实体进行高亮
    const entitiesToUse = nerEntities.length > 0 ? nerEntities.map(e => ({
      text: e.word,
      type: NER_TYPE_MAPPING[e.entity_group] || 'symptoms',
      confidence: e.score,
      start: e.start,
      end: e.end,
    })) : highlightedEvidence;

    // 如果有需要高亮的证据
    if (entitiesToUse.length > 0) {
      entitiesToUse.forEach(evidence => {
        const evidenceText = evidence.text;
        const confidence = evidence.confidence || 0.8;

        // 查找证据在文本中的位置
        const index = text.indexOf(evidenceText);
        if (index !== -1) {
          // 分割文本
          const newSegments = [];
          segments.forEach(seg => {
            if (seg.type === 'normal') {
              const segIndex = seg.text.indexOf(evidenceText);
              if (segIndex !== -1) {
                // 前半部分
                if (segIndex > 0) {
                  newSegments.push({ text: seg.text.slice(0, segIndex), type: 'normal' });
                }
                // 高亮部分
                const highlightClass = confidence >= 0.8 ? EVIDENCE_HIGHLIGHT_STYLE.highConfidence :
                                      confidence >= 0.5 ? EVIDENCE_HIGHLIGHT_STYLE.mediumConfidence :
                                      EVIDENCE_HIGHLIGHT_STYLE.lowConfidence;
                newSegments.push({ text: evidenceText, type: 'evidence', className: highlightClass });
                // 后半部分
                if (segIndex + evidenceText.length < seg.text.length) {
                  newSegments.push({ text: seg.text.slice(segIndex + evidenceText.length), type: 'normal' });
                }
              } else {
                newSegments.push(seg);
              }
            } else {
              newSegments.push(seg);
            }
          });
          segments = newSegments;
        }
      });
    }

    return segments.map((seg, idx) => {
      if (seg.type === 'evidence') {
        return (
          <mark key={idx} className={`${seg.className} px-0.5 rounded font-bold`}>
            {seg.text}
          </mark>
        );
      }
      return <span key={idx}>{seg.text}</span>;
    });
  };

  // 接受建议
  const handleAcceptSuggestion = (suggestion) => {
    if (onSelectionSuggest) {
      onSelectionSuggest(suggestion);
    }
    setSelectionPopup(null);
    window.getSelection().removeAllRanges();
  };

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-white border-r border-gray-200 relative"
      style={{ width: '35%' }}
    >
      {/* 患者基本信息卡片 - 医疗级配色：灰阶层次 */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          患者基本信息
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">姓名:</span>
            <span className="font-medium text-slate-800">{patientInfo?.name || patientInfo?.patientName || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">性别:</span>
            <span className="font-medium text-slate-800">{patientInfo?.gender || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">年龄:</span>
            <span className="font-medium text-slate-800">{patientInfo?.age ? `${patientInfo.age}岁` : '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">科室:</span>
            <span className="font-medium text-slate-800">{patientInfo?.department || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">住院号:</span>
            <span className="font-medium text-slate-800">{patientInfo?.hospitalNo || patientInfo?.case_id || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">入院日期:</span>
            <span className="font-medium text-slate-800">{patientInfo?.admissionDate || '-'}</span>
          </div>
        </div>
      </div>

      {/* 文书类型标签页 - 多维文书聚合视窗 - 医疗级配色 */}
      <div className="flex border-b border-slate-200 bg-slate-50 px-2">
        {DOCUMENT_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? 'text-slate-800 border-slate-700 bg-white'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 图例说明 - 低饱和配色 */}
      {showLegend && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs flex-wrap">
              {Object.entries(ENTITY_TYPES).map(([key, value]) => (
                <span key={key} className="flex items-center gap-1">
                  <span className={`w-3 h-3 ${value.style.split(' ')[0]} rounded`} />
                  <span className="text-slate-600">{value.label}</span>
                </span>
              ))}
            </div>
            <button
              onClick={() => setShowLegend(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 选中编码的证据提示 - 医疗级配色：柔和提示 */}
      {selectedCode && highlightedEvidence.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-blue-700 font-medium">
              已高亮 {selectedCode} 的 {highlightedEvidence.length} 条推断证据
            </span>
          </div>
        </div>
      )}

      {/* 病历原文编辑区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {DOCUMENT_TABS.find(t => t.id === activeTab)?.label}
          </h3>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            双击词语可查询编码
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* 编辑区域 - 护眼配色 */}
          <textarea
            ref={textAreaRef}
            value={medicalText}
            onChange={(e) => onTextChange(e.target.value)}
            onMouseUp={handleTextSelection}
            className="w-full h-48 resize-none border border-slate-200 rounded-lg p-3 text-slate-700 leading-relaxed text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-300 bg-slate-50/30"
            style={{ lineHeight: '1.8' }}
            placeholder="请输入或粘贴病历文本（包含主诉、现病史、体格检查、辅助检查、诊断等）..."
          />

          {/* 高亮预览模式 - 医疗级柔和配色 */}
          {medicalText && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 mb-2 font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>语义高亮预览</span>
                  {nerLoading ? (
                    <span className="text-slate-400">识别中...</span>
                  ) : nerEntities.length > 0 ? (
                    <span className="text-emerald-600">● {nerEntities.length} 个实体已识别</span>
                  ) : null}
                </div>
                {selectedCode && (
                  <span className="text-blue-600">
                    ● {selectedCode} 证据已高亮
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed select-text">
                {renderTextWithEvidence(medicalText)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 反向编码建议弹窗 - 医疗级配色 */}
      {selectionPopup && (
        <div
          className="absolute z-50 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden"
          style={{
            top: selectionPopup.top,
            left: selectionPopup.left,
            minWidth: '280px',
          }}
        >
          {/* 柔和的深灰色标题栏 */}
          <div className="px-3 py-2 bg-slate-700 text-white">
            <div className="text-xs font-medium">AI 补充编码建议</div>
            <div className="text-xs opacity-70 truncate">
              基于选中文本: "{selectionPopup.text.substring(0, 15)}..."
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {selectionPopup.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleAcceptSuggestion(suggestion)}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center justify-between group"
              >
                <div>
                  <span className="font-mono font-bold text-sm text-slate-800">{suggestion.code}</span>
                  <span className="text-xs text-slate-500 ml-2">{suggestion.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* 莫兰迪色系置信度标签 */}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    suggestion.confidence >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                    suggestion.confidence >= 0.5 ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {(suggestion.confidence * 100).toFixed(0)}%
                  </span>
                  <svg className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100">
            <button
              onClick={() => setSelectionPopup(null)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { EVIDENCE_DATABASE };
