/**
 * 右侧栏：人工决策与归档区 (25%)
 * 按照真实病案编码业务重构：
 * - 分区：主要诊断、其他诊断、手术及操作
 * - 拖拽排序支持
 * - 主诊一键设置
 * - 编码规则告警
 * - 特殊编码支持（形态学M码、外部原因V/W/X/Y码）
 */
import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  GripVertical,
  AlertCircle,
  Pill,
  Stethoscope,
  Activity,
  X,
  Star,
  StarOff
} from 'lucide-react';

// 编码规则告警配置
const CODING_RULES = {
  // 不适合作为主要诊断的编码（并发症/伴随症）
  UNSUITABLE_MAIN_DIAGNOSIS: ['E11', 'E10', 'I10', 'N18', 'M54'],
  // 肿瘤形态学M码
  MORPHOLOGY_CODES: ['M8000', 'M8140', 'M8500'],
  // 外部原因编码
  EXTERNAL_CAUSE_CODES: ['V', 'W', 'X', 'Y'],
};

function CodePoolItem({
  code,
  description,
  confidence,
  category,
  isMainDiagnosis,
  isFirst,
  isLast,
  onRemove,
  onFeedback,
  onSetMainDiagnosis,
  onMoveUp,
  onMoveDown,
  warning
}) {
  const [showFeedbackMenu, setShowFeedbackMenu] = useState(false);
  const confidenceLevel = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';

  // 判断是否是特殊编码
  const isMorphologyCode = CODING_RULES.MORPHOLOGY_CODES.some(m => code.startsWith(m));
  const isExternalCauseCode = CODING_RULES.EXTERNAL_CAUSE_CODES.some(e => code.startsWith(e));

  // 根据类别获取图标和颜色
  const getCategoryStyle = () => {
    switch (category) {
      case 'surgery':
        return { icon: <Pill size={12} />, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' };
      case 'morphology':
        return { icon: <Activity size={12} />, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' };
      case 'external':
        return { icon: <AlertCircle size={12} />, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
      default:
        return { icon: <Stethoscope size={12} />, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' };
    }
  };

  const style = getCategoryStyle();

  return (
    <div className={`p-3 rounded-lg border ${style.border} hover:border-blue-300 transition-all group relative ${isMainDiagnosis ? 'ring-2 ring-blue-500' : ''}`}>
      {/* 主诊标记徽章 */}
      {isMainDiagnosis && (
        <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full z-10 flex items-center gap-1 shadow-md">
          <Star size={10} fill="currentColor" />
          主要诊断
        </div>
      )}

      {/* 告警标记 */}
      {warning && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full z-10 flex items-center gap-1 shadow-md animate-pulse">
          <AlertTriangle size={10} />
          警告
        </div>
      )}

      <div className="flex items-start justify-between">
        {/* 拖拽手柄 */}
        <div className="cursor-move text-gray-300 hover:text-gray-500 mr-2 pt-1">
          <GripVertical size={14} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* 类别图标 */}
            <span className={`${style.color} ${style.bg} p-1 rounded`}>
              {style.icon}
            </span>

            <span className={`font-mono font-bold text-sm ${style.color}`}>{code}</span>

            {/* 置信度标签 */}
            {confidence && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                confidenceLevel === 'high' ? 'bg-green-100 text-green-700' :
                confidenceLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {(confidence * 100).toFixed(0)}%
              </span>
            )}

            {/* 特殊编码标记 */}
            {isMorphologyCode && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">
                形态学
              </span>
            )}
            {isExternalCauseCode && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                外部原因
              </span>
            )}
          </div>

          <div className="text-xs text-gray-600 truncate">{description}</div>

          {/* 告警详情 */}
          {warning && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 p-1.5 rounded flex items-center gap-1">
              <AlertTriangle size={10} />
              {warning}
            </div>
          )}
        </div>

        {/* 操作按钮区 */}
        <div className="flex flex-col items-center gap-1 ml-2">
          {/* 上移按钮 */}
          {!isFirst && (
            <button
              onClick={onMoveUp}
              className="p-0.5 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="上移"
            >
              <ChevronUp size={14} />
            </button>
          )}

          {/* 设为主诊按钮 */}
          <button
            onClick={onSetMainDiagnosis}
            className={`p-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMainDiagnosis ? 'text-blue-500 opacity-100' : 'text-gray-400 hover:text-blue-500'}`}
            title={isMainDiagnosis ? '当前为主诊' : '设为主要诊断'}
          >
            {isMainDiagnosis ? <Star size={14} fill="currentColor" /> : <StarOff size={14} />}
          </button>

          {/* 下移按钮 */}
          {!isLast && (
            <button
              onClick={onMoveDown}
              className="p-0.5 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="下移"
            >
              <ChevronDown size={14} />
            </button>
          )}

          {/* 删除按钮 */}
          <button
            onClick={onRemove}
            className="p-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
            title="移除"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, icon, count, color, maxCount, onAddClick, collapsible, isCollapsed, onToggle }) {
  return (
    <div
      className={`px-4 py-2.5 border-b ${color.bg} flex items-center justify-between cursor-pointer ${collapsible ? 'hover:bg-opacity-80' : ''}`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <span className={color.text}>{icon}</span>
        <span className={`text-sm font-semibold ${color.text}`}>{title}</span>
        <span className={`text-xs ${color.bgLight} ${color.text} px-2 py-0.5 rounded-full`}>
          {count}{maxCount !== undefined && `/${maxCount}`}
        </span>
      </div>
      {collapsible && (
        <span className="text-gray-400">
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
      )}
    </div>
  );
}

function EmptyState({ message, icon }) {
  return (
    <div className="text-center py-6 text-gray-400">
      <div className="w-10 h-10 mx-auto mb-2 opacity-50 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-xs">{message}</p>
    </div>
  );
}

export default function RightPanel({
  selectedCodes,
  onRemoveCode,
  onAddCode,
  onSubmit,
  highConfidenceCount,
  onOneClick,
  predictions,
  onSetMainDiagnosis,
  onReorderCodes,
  compact = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [mainDiagnosisIndex, setMainDiagnosisIndex] = useState(null);
  const [codeWarnings, setCodeWarnings] = useState({});

  // ICD数据库（包含手术、形态学、外部原因等特殊编码）
  const icdDatabase = [
    { code: 'I21.3', description: '多部位急性心肌梗死', category: 'diagnosis' },
    { code: 'I25.1', description: '陈旧性心肌梗死', category: 'diagnosis' },
    { code: 'I50.9', description: '心力衰竭', category: 'diagnosis' },
    { code: 'E11.9', description: '2型糖尿病', category: 'diagnosis' },
    { code: 'J44.9', description: '慢性阻塞性肺疾病', category: 'diagnosis' },
    { code: 'I10', description: '原发性高血压', category: 'diagnosis' },
    { code: 'N40', description: '前列腺增生', category: 'diagnosis' },
    { code: 'C61', description: '前列腺恶性肿瘤', category: 'diagnosis' },
    // 形态学编码（M码）
    { code: 'M8000/3', description: '恶性肿瘤，NOS', category: 'morphology' },
    { code: 'M8140/3', description: '腺癌，NOS', category: 'morphology' },
    // 手术及操作编码（ICD-9-CM-3）
    { code: '33.24', description: '经皮冠状动脉腔内成形术', category: 'surgery' },
    { code: '36.06', description: '一根冠状动脉的旁路移植', category: 'surgery' },
    { code: '88.56', description: '超声心动图', category: 'surgery' },
    // 外部原因编码
    { code: 'W19.XXX', description: '同一平面上的跌倒，其他和未特指的', category: 'external' },
    { code: 'V89.2XX', description: '涉及未特指的机动车辆的人员运输事故', category: 'external' },
  ];

  const filteredResults = icdDatabase.filter(
    (item) =>
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 分类编码 - 使用 useMemo 避免无限循环
  const diagnosisCodes = useMemo(() => selectedCodes.filter(c => c.category === 'diagnosis' || !c.category), [selectedCodes]);
  const surgeryCodes = useMemo(() => selectedCodes.filter(c => c.category === 'surgery'), [selectedCodes]);
  const morphologyCodes = useMemo(() => selectedCodes.filter(c => c.category === 'morphology'), [selectedCodes]);
  const externalCodes = useMemo(() => selectedCodes.filter(c => c.category === 'external'), [selectedCodes]);

  // 检查编码规则并生成警告
  useEffect(() => {
    const warnings = {};

    // 检查主诊是否合适
    if (mainDiagnosisIndex !== null && diagnosisCodes[mainDiagnosisIndex]) {
      const mainCode = diagnosisCodes[mainDiagnosisIndex];
      const isUnsuitable = CODING_RULES.UNSUITABLE_MAIN_DIAGNOSIS.some(prefix => mainCode.code.startsWith(prefix));
      if (isUnsuitable) {
        warnings[mainCode.code] = '该编码通常不适合作为主要诊断（应为并发症/伴随症）';
      }
    }

    // 检查是否有手术编码但没有对应的诊断
    if (surgeryCodes.length > 0 && diagnosisCodes.length === 0) {
      surgeryCodes.forEach(s => {
        warnings[s.code] = '手术编码应伴有对应的手术诊断';
      });
    }

    setCodeWarnings(warnings);
  }, [mainDiagnosisIndex, diagnosisCodes, surgeryCodes]);

  const handleAddCode = (item) => {
    onAddCode({ ...item, confidence: item.confidence || 0.5 });
    setSearchQuery('');
    setShowSearchResults(false);

    // 如果是第一个诊断编码，自动设为主诊
    if (item.category === 'diagnosis' && diagnosisCodes.length === 0) {
      setTimeout(() => setMainDiagnosisIndex(0), 100);
    }
  };

  const handleSetMainDiagnosis = (index) => {
    setMainDiagnosisIndex(index);
    if (onSetMainDiagnosis) {
      onSetMainDiagnosis(diagnosisCodes[index]);
    }
  };

  const handleMoveUp = (index) => {
    if (index > 0) {
      onReorderCodes(index, index - 1);
      if (mainDiagnosisIndex === index) {
        setMainDiagnosisIndex(index - 1);
      } else if (mainDiagnosisIndex === index - 1) {
        setMainDiagnosisIndex(index);
      }
    }
  };

  const handleMoveDown = (index) => {
    if (index < diagnosisCodes.length - 1) {
      onReorderCodes(index, index + 1);
      if (mainDiagnosisIndex === index) {
        setMainDiagnosisIndex(index + 1);
      } else if (mainDiagnosisIndex === index + 1) {
        setMainDiagnosisIndex(index);
      }
    }
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // 计算统计数据
  const highConfCount = selectedCodes.filter(c => c.confidence >= 0.8).length;
  const mediumConfCount = selectedCodes.filter(c => c.confidence >= 0.5 && c.confidence < 0.8).length;
  const lowConfCount = selectedCodes.filter(c => c.confidence < 0.5).length;

  // 状态流转配置
  const workflowStatus = '初编完成';
  const nextStatus = '待质控';

  // Compact 模式：用于 WorkspacePage 底部区域 - 更简洁的水平布局
  if (compact) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
            <Star size={16} className="text-blue-500" fill="currentColor" />
            最终编码池
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
              {selectedCodes.length} 个
            </span>
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {highConfCount} 高
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {mediumConfCount} 中
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {lowConfCount} 低
            </span>
          </div>
        </div>

        {/* 编码标签流布局 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCodes.length === 0 ? (
            <span className="text-sm text-gray-400 italic">从推荐中添加编码，或使用搜索添加</span>
          ) : (
            selectedCodes.map((code, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm ${
                  idx === 0 ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-mono font-medium text-teal-600">{code.code}</span>
                <span className="text-gray-600 max-w-[150px] truncate">{code.description}</span>
                {code.confidence >= 0.8 && (
                  <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                    {(code.confidence * 100).toFixed(0)}%
                  </span>
                )}
                <button
                  onClick={() => onRemoveCode(idx)}
                  className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded ml-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 搜索 + 提交按钮行 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索ICD编码..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={onSubmit}
            disabled={selectedCodes.length === 0}
            className="px-5 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-teal-600 hover:to-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            提交质控
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white relative" style={{ width: '25%' }}>
      {/* 顶部统计头 */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          最终编码池
          <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
            {selectedCodes.length} 个编码
          </span>
        </h3>

        {/* 置信度分布统计条 */}
        {selectedCodes.length > 0 && (
          <div className="mt-3 flex gap-0.5 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-green-500 rounded-l-full"
              style={{ width: highConfCount > 0 ? `${(highConfCount / selectedCodes.length) * 100}%` : '0%' }}
            />
            <div
              className="bg-amber-500"
              style={{ width: mediumConfCount > 0 ? `${(mediumConfCount / selectedCodes.length) * 100}%` : '0%' }}
            />
            <div
              className="bg-red-500 rounded-r-full"
              style={{ width: lowConfCount > 0 ? `${(lowConfCount / selectedCodes.length) * 100}%` : '0%' }}
            />
          </div>
        )}
        <div className="flex gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {highConfCount} 高置信
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {mediumConfCount} 中置信
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {lowConfCount} 低置信
          </span>
        </div>
      </div>

      {/* 主诊缺失提醒 */}
      {diagnosisCodes.length > 0 && mainDiagnosisIndex === null && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <AlertTriangle size={12} />
            <span>请设置主要诊断（点击星号图标）</span>
          </div>
        </div>
      )}

      {/* 编码列表区域 - 可滚动 */}
      <div className="flex-1 overflow-y-auto">
        {/* ============ 1. 主要诊断 ============ */}
        <SectionHeader
          title="主要诊断"
          icon={<Star size={14} fill="currentColor" />}
          count={mainDiagnosisIndex !== null ? 1 : 0}
          color={{ text: 'text-blue-600', bg: 'bg-blue-50', bgLight: 'bg-blue-100' }}
          collapsible={true}
          isCollapsed={collapsedSections.mainDiagnosis}
          onToggle={() => toggleSection('mainDiagnosis')}
        />
        {!collapsedSections.mainDiagnosis && (
          <div className="p-3 bg-blue-50/30 min-h-[60px]">
            {mainDiagnosisIndex !== null && diagnosisCodes[mainDiagnosisIndex] ? (
              <CodePoolItem
                code={diagnosisCodes[mainDiagnosisIndex].code}
                description={diagnosisCodes[mainDiagnosisIndex].description}
                confidence={diagnosisCodes[mainDiagnosisIndex].confidence}
                category="diagnosis"
                isMainDiagnosis={true}
                isFirst={true}
                isLast={true}
                warning={codeWarnings[diagnosisCodes[mainDiagnosisIndex].code]}
                onRemove={() => {
                  onRemoveCode(mainDiagnosisIndex);
                  setMainDiagnosisIndex(null);
                }}
                onSetMainDiagnosis={() => {}} // 已经是主诊了
              />
            ) : (
              <EmptyState
                message="请从其他诊断中选择主要诊断"
                icon={<StarOff size={24} className="text-blue-300" />}
              />
            )}
          </div>
        )}

        {/* ============ 2. 其他诊断 ============ */}
        <SectionHeader
          title="其他诊断"
          icon={<Stethoscope size={14} />}
          count={diagnosisCodes.length - (mainDiagnosisIndex !== null ? 1 : 0)}
          color={{ text: 'text-teal-600', bg: 'bg-teal-50', bgLight: 'bg-teal-100' }}
          collapsible={true}
          isCollapsed={collapsedSections.otherDiagnosis}
          onToggle={() => toggleSection('otherDiagnosis')}
        />
        {!collapsedSections.otherDiagnosis && (
          <div className="p-3 bg-teal-50/20 min-h-[60px] space-y-2">
            {diagnosisCodes.filter((_, idx) => idx !== mainDiagnosisIndex).length > 0 ? (
              diagnosisCodes.map((code, idx) => {
                if (idx === mainDiagnosisIndex) return null;
                const displayIdx = idx > mainDiagnosisIndex ? idx - 1 : idx;
                return (
                  <CodePoolItem
                    key={idx}
                    code={code.code}
                    description={code.description}
                    confidence={code.confidence}
                    category="diagnosis"
                    isMainDiagnosis={false}
                    isFirst={displayIdx === 0}
                    isLast={displayIdx === diagnosisCodes.length - 2}
                    warning={codeWarnings[code.code]}
                    onRemove={() => onRemoveCode(idx)}
                    onSetMainDiagnosis={() => handleSetMainDiagnosis(idx)}
                    onMoveUp={() => handleMoveUp(displayIdx + (mainDiagnosisIndex !== null && displayIdx + 1 > mainDiagnosisIndex ? 1 : 0))}
                    onMoveDown={() => handleMoveDown(displayIdx + (mainDiagnosisIndex !== null && displayIdx + 1 > mainDiagnosisIndex ? 1 : 0))}
                  />
                );
              })
            ) : (
              <EmptyState
                message="从AI推荐中添加或手动搜索"
                icon={<Stethoscope size={24} className="text-teal-300" />}
              />
            )}
          </div>
        )}

        {/* ============ 3. 手术及操作 ============ */}
        <SectionHeader
          title="手术及操作 (ICD-9-CM-3)"
          icon={<Pill size={14} />}
          count={surgeryCodes.length}
          color={{ text: 'text-purple-600', bg: 'bg-purple-50', bgLight: 'bg-purple-100' }}
          collapsible={true}
          isCollapsed={collapsedSections.surgery}
          onToggle={() => toggleSection('surgery')}
        />
        {!collapsedSections.surgery && (
          <div className="p-3 bg-purple-50/20 min-h-[60px] space-y-2">
            {surgeryCodes.length > 0 ? (
              surgeryCodes.map((code, idx) => (
                <CodePoolItem
                  key={idx}
                  code={code.code}
                  description={code.description}
                  confidence={code.confidence}
                  category="surgery"
                  isFirst={idx === 0}
                  isLast={idx === surgeryCodes.length - 1}
                  warning={codeWarnings[code.code]}
                  onRemove={() => onRemoveCode(selectedCodes.indexOf(code))}
                />
              ))
            ) : (
              <EmptyState
                message="如有手术请添加相关编码"
                icon={<Pill size={24} className="text-purple-300" />}
              />
            )}
          </div>
        )}

        {/* ============ 4. 特殊编码区 ============ */}
        {(morphologyCodes.length > 0 || externalCodes.length > 0) && (
          <>
            <SectionHeader
              title="特殊编码"
              icon={<Activity size={14} />}
              count={morphologyCodes.length + externalCodes.length}
              color={{ text: 'text-pink-600', bg: 'bg-pink-50', bgLight: 'bg-pink-100' }}
              collapsible={true}
              isCollapsed={collapsedSections.special}
              onToggle={() => toggleSection('special')}
            />
            {!collapsedSections.special && (
              <div className="p-3 bg-pink-50/20 min-h-[60px] space-y-2">
                {morphologyCodes.map((code, idx) => (
                  <CodePoolItem
                    key={`m-${idx}`}
                    code={code.code}
                    description={code.description}
                    confidence={code.confidence}
                    category="morphology"
                    isFirst={idx === 0}
                    isLast={idx === morphologyCodes.length - 1 && externalCodes.length === 0}
                    onRemove={() => onRemoveCode(selectedCodes.indexOf(code))}
                  />
                ))}
                {externalCodes.map((code, idx) => (
                  <CodePoolItem
                    key={`e-${idx}`}
                    code={code.code}
                    description={code.description}
                    confidence={code.confidence}
                    category="external"
                    isFirst={idx === 0 && morphologyCodes.length === 0}
                    isLast={idx === externalCodes.length - 1}
                    onRemove={() => onRemoveCode(selectedCodes.indexOf(code))}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 搜索区域 */}
      <div className="px-4 py-3 border-t border-gray-200">
        <label className="text-xs font-medium text-gray-600 mb-1 block">手动搜索添加编码</label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(e.target.value.length > 0);
            }}
            placeholder="输入ICD编码或疾病名称..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          {showSearchResults && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
              {filteredResults.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">未找到匹配的编码</div>
              ) : (
                filteredResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer group"
                    onClick={() => handleAddCode(item)}
                  >
                    <div>
                      <span className={`font-mono font-medium text-sm ${
                        item.category === 'surgery' ? 'text-purple-600' :
                        item.category === 'morphology' ? 'text-pink-600' :
                        item.category === 'external' ? 'text-orange-600' :
                        'text-gray-700'
                      }`}>{item.code}</span>
                      <span className="text-xs text-gray-500 ml-2">{item.description}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {item.category === 'surgery' ? '(手术)' :
                         item.category === 'morphology' ? '(形态学)' :
                         item.category === 'external' ? '(外部原因)' : ''}
                      </span>
                    </div>
                    <button className="p-1 text-blue-500 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮区 */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {/* 一键通过 */}
        {highConfidenceCount > 0 && (
          <button
            onClick={onOneClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            一键通过高置信度编码 ({highConfidenceCount}个)
          </button>
        )}

        {/* 工作流按钮组 */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-medium hover:bg-amber-100 transition-all text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            保存草稿
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-all text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            疑难标记
          </button>
        </div>

        {/* 提交到质控 - 主按钮 */}
        <button
          onClick={onSubmit}
          disabled={selectedCodes.length === 0 || mainDiagnosisIndex === null}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          提交质控审核
        </button>

        {/* 质控信息面板 */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 space-y-1.5">
            <div className="flex justify-between items-center">
              <span>当前状态</span>
              <span className="text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">{workflowStatus}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>下一状态</span>
              <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">{nextStatus}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>AI采纳率</span>
              <span className="text-purple-600 font-medium">
                {predictions.length > 0 ? `${((selectedCodes.length / predictions.length) * 100).toFixed(0)}%` : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>质控告警</span>
              <span className={`font-medium ${Object.keys(codeWarnings).length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Object.keys(codeWarnings).length} 条
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
