/**
 * 中间栏：AI推理与图谱交互区 (40%)
 * 实现PRD核心功能：
 * - 置信度分级视觉编码
 * - 智能排雷与逻辑校验
 * - DRG/DIP医保收益模拟器
 */
import { useState, useEffect, useCallback } from 'react';

// 置信度颜色配置
const CONFIDENCE_COLORS = {
  high: { bg: 'from-green-500 to-emerald-500', border: 'border-green-200', text: 'text-green-700', bgLight: 'bg-green-50' },
  medium: { bg: 'from-amber-500 to-yellow-500', border: 'border-amber-200', text: 'text-amber-700', bgLight: 'bg-amber-50' },
  low: { bg: 'from-red-500 to-rose-500', border: 'border-red-200', text: 'text-red-700', bgLight: 'bg-red-50' },
};

// 智能排雷规则库
const LOGIC_RULES = [
  {
    id: 'GENDER_MISMATCH',
    type: 'error',
    title: '性别逻辑矛盾',
    check: (codes, patientInfo) => {
      const femaleOnlyCodes = ['N80', 'N83', 'O00', 'O80', 'C53', 'C54'];
      const maleOnlyCodes = ['C61', 'N40', 'N42'];
      if (patientInfo?.gender === '男') {
        return codes.some(c => femaleOnlyCodes.some(foc => c.code?.startsWith(foc)));
      }
      if (patientInfo?.gender === '女') {
        return codes.some(c => maleOnlyCodes.some(moc => c.code?.startsWith(moc)));
      }
      return false;
    },
    message: '检测到性别特异性疾病编码与患者性别不符，请核实',
  },
  {
    id: 'MISSING_COMORBIDITY',
    type: 'warning',
    title: '遗漏合并症风险',
    check: (codes) => {
      const hasHighRisk = codes.some(c => ['I21', 'I50', 'J44', 'C50'].includes(c.code?.substring(0, 3)));
      const hasDiabetes = codes.some(c => c.code?.startsWith('E11'));
      return hasHighRisk && !hasDiabetes && Math.random() > 0.5; // 模拟检测
    },
    message: '病历中检测到糖尿病相关描述，但编码池中缺少糖尿病编码，建议补充',
  },
  {
    id: 'PROCEDURE_DIAGNOSIS_MISMATCH',
    type: 'warning',
    title: '诊断手术不匹配',
    check: (codes) => {
      const hasHeartProcedure = codes.some(c => c.code?.startsWith('Z95'));
      const hasMI = codes.some(c => c.code?.startsWith('I21'));
      return hasHeartProcedure && !hasMI;
    },
    message: '存在心脏手术编码，但缺少对应的主要诊断编码缺失，建议核实',
  },
];

// ICD编码卡片组件
function ICDCard({ code, description, confidence, index, isSelected, onSelect, onHover, sourceEvidence, isHighlighted }) {
  const confidenceLevel = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
  const colors = CONFIDENCE_COLORS[confidenceLevel];

  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-teal-500 bg-teal-50 shadow-md ring-2 ring-teal-200'
          : `${colors.bgLight} ${colors.border}`
      } hover:shadow-md ${isHighlighted ? 'ring-2 ring-blue-400' : ''}`}
      onClick={() => onSelect(index)}
      onMouseEnter={() => onHover(index, sourceEvidence)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${colors.bg}`}>
            {index + 1}
          </span>
          <div>
            <div className="font-mono font-bold text-lg text-gray-800">{code}</div>
            <div className="text-sm text-gray-600 mt-0.5">{description}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${colors.text}`}>
            {(confidence * 100).toFixed(0)}%
          </div>
          {confidenceLevel === 'low' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full mt-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              需人工复核
            </span>
          )}
        </div>
      </div>

      {/* 置信度进度条 */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colors.bg} transition-all duration-500`}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>

      {/* 溯源依据提示 */}
      {sourceEvidence && isSelected && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1 font-medium flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            AI 推断证据
          </div>
          <p className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
            "{sourceEvidence}"
          </p>
        </div>
      )}
    </div>
  );
}

// 智能排雷预警组件
function LogicAlert({ alert, onDismiss }) {
  const typeStyles = {
    error: { bg: 'bg-red-50', border: 'border-red-200', icon: '🔴', text: 'text-red-700' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠️', text: 'text-amber-700' },
  };
  const style = typeStyles[alert.type];

  return (
    <div className={`p-3 rounded-lg border ${style.bg} ${style.border} flex items-start gap-2 animate-pulse`}>
      <span className="text-lg">{style.icon}</span>
      <div className="flex-1">
        <div className={`text-sm font-semibold ${style.text}`}>{alert.title}</div>
        <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-gray-600"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// DRG模拟器组件
function DRGPanel({ selectedCodes }) {
  // 模拟DRG计算
  const drgCalculation = {
    group: 'DRG-F23',
    groupName: '急性心肌梗死，伴合并症或并发症',
    rw: 2.35,
    estimatedPayment: 32500,
    cost: 28000,
    profit: 4500,
  };

  // 潜在增益提示
  const potentialGains = [
    {
      code: 'E11.9',
    description: '2型糖尿病',
    rwIncrease: 0.25,
    paymentIncrease: 3125,
    evidence: '病历中提及二甲双胍治疗史',
  },
];

return (
  <div className="p-4 border-t border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
        <span className="text-lg">💰</span>
        DRG/DIP 医保收益模拟器
      </h4>
      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
        实时计算
      </span>
    </div>

    {/* 当前入组情况 */}
    <div className="bg-white rounded-lg p-3 shadow-sm mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">当前入组</span>
        <span className="font-mono font-bold text-blue-600">{drgCalculation.group}</span>
      </div>
      <div className="text-xs text-gray-600 mb-3">{drgCalculation.groupName}</div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-lg font-bold text-indigo-600">{drgCalculation.rw}</div>
          <div className="text-xs text-gray-500">RW权重</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-lg font-bold text-green-600">¥{drgCalculation.estimatedPayment.toLocaleString()}</div>
          <div className="text-xs text-gray-500">预估支付</div>
        </div>
        <div className={`rounded p-2 ${drgCalculation.profit > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className={`text-lg font-bold ${drgCalculation.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {drgCalculation.profit > 0 ? '+' : ''}¥{drgCalculation.profit.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">预估收益</div>
        </div>
      </div>
    </div>

    {/* 潜在增益提示 */}
    {potentialGains.length > 0 && (
      <div className="space-y-2">
        <div className="text-xs font-medium text-amber-700 flex items-center gap-1">
          <span>⬆️</span>
          可提升收益建议
        </div>
        {potentialGains.map((gain, idx) => (
          <div key={idx} className="bg-white border border-amber-200 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-sm text-gray-800">{gain.code}</span>
                <span className="text-xs text-gray-500 ml-2">{gain.description}</span>
              </div>
              <span className="text-xs font-bold text-green-600">
                +¥{gain.paymentIncrease.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <span className="text-amber-600">📝 证据:</span> {gain.evidence}
            </div>
          </div>
        ))}
      </div>
    )}

    {/* 亏损预警 */}
    {selectedCodes.length < 3 && (
      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-xs text-red-700">
          <span>⚠️</span>
          <span>当前编码数量较少，可能存在遗漏编码导致收益风险</span>
        </div>
      </div>
    )}
  </div>
);
}

// 微观关系图谱组件
function MicroGraph({ selectedCode, predictions }) {
  if (!selectedCode) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4">
        <svg className="w-16 h-16 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <p className="text-sm text-center">点击上方编码卡片<br/>查看疾病关系图谱</p>
      </div>
    );
  }

  // 模拟图谱数据
  const relations = [
    { source: selectedCode, target: 'I25.1', label: '并发症', type: 'complication' },
    { source: selectedCode, target: 'I50.9', label: '并发', type: 'complication' },
    { source: selectedCode, target: 'E11.9', label: '合并症', type: 'comorbidity' },
  ];

  const nodes = [
    { id: selectedCode, name: selectedCode, type: 'center', label: '急性心梗' },
    { id: 'I25.1', name: 'I25.1', type: 'complication', label: '陈旧性心梗' },
    { id: 'I50.9', name: 'I50.9', type: 'complication', label: '心力衰竭' },
    { id: 'E11.9', name: 'E11.9', type: 'comorbidity', label: '2型糖尿病' },
  ];

  const nodeColors = {
    center: '#0d9488',
    complication: '#ef4444',
    subtype: '#3b82f6',
    comorbidity: '#f59e0b',
  };

  return (
    <div className="h-full relative">
      <div className="absolute top-0 left-0 right-0 px-4 py-2 bg-gray-50 border-b border-gray-200 z-10">
        <div className="text-xs font-medium text-gray-600 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          疾病关联图谱 - {selectedCode}
        </div>
      </div>

      {/* 简化的力导向图展示 */}
      <div className="h-full pt-10 flex items-center justify-center px-4">
        <svg viewBox="0 0 300 200" className="w-full h-full max-w-md">
          {/* 连线 */}
          {relations.map((rel, i) => {
            const angles = [30, 150, 270];
            const angle = angles[i] * (Math.PI / 180);
            const x = 150 + Math.cos(angle) * 80;
            const y = 100 + Math.sin(angle) * 60;

            return (
              <g key={i}>
                <line
                  x1="150"
                  y1="100"
                  x2={x}
                  y2={y}
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  strokeDasharray={rel.type === 'complication' ? '4,4' : 'none'}
                />
                {/* 关系标签 */}
                <text
                  x={(150 + x) / 2}
                  y={(100 + y) / 2 - 8}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                >
                  {rel.label}
                </text>
                {/* 目标节点 */}
                <circle
                  cx={x}
                  cy={y}
                  r="24"
                  fill={nodeColors[rel.type]}
                  className="opacity-90"
                />
                <text
                  x={x}
                  y={y - 2}
                  textAnchor="middle"
                  className="text-xs fill-white font-bold"
                >
                  {rel.target}
                </text>
                <text
                  x={x}
                  y={y + 10}
                  textAnchor="middle"
                  className="text-[8px] fill-white opacity-90"
                >
                  {nodes.find(n => n.id === rel.target)?.label}
                </text>
              </g>
            );
          })}

          {/* 中心节点 */}
          <circle cx="150" cy="100" r="32" fill="#0d9488" className="drop-shadow-lg" />
          <text
            x="150"
            y="95"
            textAnchor="middle"
            className="text-sm fill-white font-bold"
          >
            {selectedCode}
          </text>
          <text
            x="150"
            y="112"
            textAnchor="middle"
            className="text-[10px] fill-white opacity-90"
          >
            急性心肌梗死
          </text>
        </svg>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          并发症
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          合并症
        </span>
      </div>
    </div>
  );
}

export default function MiddlePanel({ predictions, loading, onAdoptCode, selectedCodes, patientInfo, onCodeSelect }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('predictions'); // predictions vs graph

  // 处理编码选择 - 调用父组件的正向溯源高亮
  const handleCodeSelect = useCallback((index) => {
    setSelectedIndex(index);
    if (onCodeSelect) {
      onCodeSelect(index);
    }
  }, [onCodeSelect]);

  // 计算逻辑校验警报
  const activeAlerts = LOGIC_RULES.filter(rule => {
    if (dismissedAlerts.includes(rule.id)) return false;
    return rule.check(selectedCodes, patientInfo);
  });

  const selectedPrediction = selectedIndex !== null ? predictions[selectedIndex] : null;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white" style={{ width: '40%' }}>
        <div className="text-center">
          {/* 神经网络风格的Loading动画 */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-4 h-4 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full animate-pulse"
                style={{
                  top: `${50 + 40 * Math.sin(i * Math.PI / 4)}%`,
                  left: `${50 + 40 * Math.cos(i * Math.PI / 4)}%`,
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
            {/* 中心节点 */}
            <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full animate-pulse transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 font-medium">AI 深度推理中...</p>
          <p className="text-sm text-gray-400 mt-1">正在分析病历并生成ICD编码候选集</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200" style={{ width: '40%' }}>
      {/* 标签页切换
      <div className="flex border-b border-gray-200 bg-white px-2">
        <button
          onClick={() => setActiveTab('predictions')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'predictions'
              ? 'bg-teal-50 text-teal-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🎯 AI 推荐编码
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'graph'
              ? 'bg-teal-50 text-teal-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🧬 关系图谱
        </button>
      </div>

      {/* 智能排雷预警区 */}
      {activeAlerts.length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-amber-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-red-700 flex items-center gap-2">
              <span className="animate-pulse">🚨</span>
              智能排雷预警
              <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                {activeAlerts.length}项风险
              </span>
            </h4>
          </div>
          <div className="space-y-2">
            {activeAlerts.map(alert => (
              <LogicAlert
                key={alert.id}
                alert={alert}
                onDismiss={() => setDismissedAlerts([...dismissedAlerts, alert.id])}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'predictions' ? (
        <>
          {/* 上半部分：AI推荐候选集 */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ flex: 0.6 }}>
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI 推荐编码候选集
                <span className="text-xs text-gray-400 font-normal ml-2">
                  共 {predictions.length} 个候选
                </span>
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  高置信度
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  中置信度
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  低置信度
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {predictions.map((pred, idx) => (
                <ICDCard
                  key={idx}
                  code={pred.code || `I21.${idx}`}
                  description={pred.description || ['急性前壁心肌梗死', '急性下壁心肌梗死', '冠状动脉粥样硬化', '不稳定性心绞痛', '心力衰竭'][idx] || '疾病名称'}
                  confidence={pred.confidence || 0.95 - idx * 0.1}
                  index={idx}
                  isSelected={selectedIndex === idx}
                  onSelect={handleCodeSelect}
                  onHover={() => {}}
                  sourceEvidence={pred.evidence || '根据病历中胸痛症状、心电图改变及肌钙蛋白升高'}
                  isHighlighted={false}
                />
              ))}
            </div>
          </div>

          {/* DRG模拟器 */}
          <DRGPanel selectedCodes={selectedCodes} />
        </>
      ) : (
        /* 关系图谱视图 */
        <div className="flex-1 bg-white">
          <MicroGraph
            selectedCode={selectedPrediction?.code}
            predictions={predictions}
          />
        </div>
      )}
    </div>
  );
}
