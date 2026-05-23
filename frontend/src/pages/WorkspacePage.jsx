/**
 * 编码平台主页面 - 统一编码入口
 * 从病例管理选择病例后自动执行AI编码，用户仅需审核
 */
import { useState, useCallback, useEffect } from 'react';
import {
  Activity,
  FileText,
  BarChart3,
  Zap,
  CheckCircle,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import LeftPanel from '../components/workspace/LeftPanel';
import RightPanel from '../components/workspace/RightPanel';
import Drawer from '../components/common/Drawer';
import FloatingActions from '../components/common/FloatingActions';
import { predictAPI, worklistAPI } from '../services/api';
import { getTestCaseById } from '../data/testCases';

// 证据数据库 - 关联ICD编码与病历中的证据
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

// 推荐卡片组件 - 支持视觉差异化和hover快速操作
function RecommendationCard({
  code,
  index,
  onAccept,
  onReplace,
  onIgnore,
  onFlag,
  onEvidenceClick,
  isHovered,
  onHover,
  quickReviewMode,
}) {
  // 根据置信度确定样式
  const getConfidenceStyle = (confidence) => {
    if (confidence >= 0.9) return {
      border: 'border-green-300 bg-green-50/50',
      badge: 'bg-green-100 text-green-700',
      label: '高置信度'
    };
    if (confidence >= 0.7) return {
      border: 'border-blue-300 bg-blue-50/50',
      badge: 'bg-blue-100 text-blue-700',
      label: '建议复核'
    };
    if (confidence >= 0.5) return {
      border: 'border-amber-300 bg-amber-50/50',
      badge: 'bg-amber-100 text-amber-700',
      label: '谨慎使用'
    };
    return {
      border: 'border-red-300 bg-red-50/50',
      badge: 'bg-red-100 text-red-700',
      label: '低置信度'
    };
  };

  const style = getConfidenceStyle(code.confidence);
  const isAutoFolded = quickReviewMode && code.confidence >= 0.9;

  return (
    <div
      className={`relative rounded-xl border ${style.border} shadow-sm transition-all duration-200 ${
        isHovered ? 'ring-2 ring-teal-400 shadow-md scale-[1.01]' : ''
      }`}
      onMouseEnter={() => onHover(index, true)}
      onMouseLeave={() => onHover(index, false)}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-semibold text-sm text-slate-700">
                {code.code}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                {Math.round(code.confidence * 100)}% · {style.label}
              </span>
            </div>
            <div className="text-sm text-slate-800 font-medium truncate">
              {code.description}
            </div>
            {!isAutoFolded && (
              <div className="mt-2 text-xs text-slate-500 bg-white/60 rounded p-2">
                {code.evidence}
              </div>
            )}
          </div>
          <FloatingActions
            show={isHovered}
            position="right"
            onAccept={() => onAccept(code)}
            onReplace={() => onReplace(code)}
            onIgnore={() => onIgnore(code)}
            onFlag={() => onFlag(code)}
          />
        </div>

        {/* 快捷审阅模式下：高置信度自动折叠，仅显示底部操作栏 */}
        {isAutoFolded && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle size={12} />
              高置信度，已预选中
            </span>
            <button
              onClick={() => onEvidenceClick(code)}
              className="text-xs text-teal-600 hover:text-teal-700"
            >
              查看证据 →
            </button>
          </div>
        )}

        {/* 底部操作栏 - 始终显示在hover时 */}
        {!isAutoFolded && isHovered && (
          <FloatingActions
            show={true}
            position="bottom"
            onAccept={() => onAccept(code)}
            onReplace={() => onReplace(code)}
            onIgnore={() => onIgnore(code)}
            onFlag={() => onFlag(code)}
          />
        )}
      </div>
    </div>
  );
}

export default function WorkspacePage({ pendingCaseIds = [], onCasesLoaded }) {
  // 病历文本状态 - 初始为空，等待用户输入
  const [medicalText, setMedicalText] = useState('');

  // 患者信息
  const [patientInfo, setPatientInfo] = useState(null);

  // 病例ID
  const [caseId, setCaseId] = useState(null);

  // 待编码队列（支持多病例顺序处理）
  const [caseQueue, setCaseQueue] = useState([]);

  // 预测结果
  const [predictions, setPredictions] = useState([]);

  // 选中的编码池
  const [selectedCodes, setSelectedCodes] = useState([]);

  // 双向溯源高亮
  const [highlightedCode, setHighlightedCode] = useState(null);

  // 加载状态
  const [loading, setLoading] = useState(false);

  // AI分析中状态
  const [predictLoading, setPredictLoading] = useState(false);

  // 当前hover的卡片索引
  const [hoveredCardIndex, setHoveredCardIndex] = useState(null);

  // 快捷审阅模式开关
  const [quickReviewMode, setQuickReviewMode] = useState(true);

  // 从props接收待编码队列
  useEffect(() => {
    if (pendingCaseIds.length > 0) {
      setCaseQueue(pendingCaseIds);
      loadCaseById(pendingCaseIds[0]);
      if (onCasesLoaded) onCasesLoaded();
    } else {
      // 没有待编码病例，清空状态
      setCaseQueue([]);
      setMedicalText('');
      setPatientInfo(null);
      setCaseId(null);
      setPredictions([]);
      setSelectedCodes([]);
      setLoading(false);
      setPredictLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCaseIds]);

  // 执行AI编码
  const executeAutoCoding = async (text) => {
    if (!text || !text.trim()) return;
    setPredictLoading(true);
    try {
      const result = await predictAPI.predict(text);
      if (result && result.icdPredictions) {
        setPredictions(result.icdPredictions);
      }
    } catch (e) {
      console.error('AI编码失败:', e);
    } finally {
      setPredictLoading(false);
    }
  };

  // 根据caseId加载病例并自动执行AI编码
  const loadCaseById = async (id) => {
    setLoading(true);
    setPredictions([]);
    setSelectedCodes([]);
    try {
      // 尝试从API加载
      const result = await worklistAPI.list({ case_id: id }, 1, 1);
      const items = result?.data?.items || [];
      if (items.length > 0) {
        const caseData = items[0];
        setCaseId(id);
        setPatientInfo({
          name: caseData.patientName || caseData.patient_name || '未知',
          gender: caseData.gender || '未知',
          age: caseData.age ? `${caseData.age}岁` : '未知',
          department: caseData.department || caseData.dept || '未知',
          hospitalNo: caseData.hospitalNo || caseData.case_id || id,
          admissionDate: caseData.admissionDate || '',
        });
        const text = buildMedicalText(caseData);
        setMedicalText(text);
        setLoading(false);
        await executeAutoCoding(text);
        return;
      }
    } catch (e) {
      console.log('从API加载病例失败');
    }

    // 尝试从测试数据加载
    const testCase = getTestCaseById(id);
    if (testCase) {
      setCaseId(id);
      setPatientInfo({
        name: testCase.patientName,
        gender: testCase.gender,
        age: `${testCase.age}岁`,
        department: testCase.department || '未知',
        hospitalNo: id,
        admissionDate: '',
      });
      const text = buildFullMedicalText(testCase);
      setMedicalText(text);
      setLoading(false);
      await executeAutoCoding(text);
    } else {
      setLoading(false);
      setPredictLoading(false);
    }
  };

  // 从病例数据构建完整文本
  const buildMedicalText = (caseData) => {
    const parts = [];
    if (caseData.admission_diagnosis || caseData.chiefComplaint) {
      parts.push(`主诉：${caseData.admission_diagnosis || caseData.chiefComplaint}`);
    }
    if (caseData.presentIllness || caseData.present_illness) {
      parts.push(`\n现病史：\n${caseData.presentIllness || caseData.present_illness}`);
    }
    if (caseData.physicalExam || caseData.physical_exam) {
      parts.push(`\n体格检查：\n${caseData.physicalExam || caseData.physical_exam}`);
    }
    if (caseData.labResults) {
      const labs = Object.entries(caseData.labResults).map(([k, v]) => `${k}：${v}`).join('\n');
      parts.push(`\n辅助检查：\n${labs}`);
    }
    if (caseData.diagnosis) {
      const diag = Array.isArray(caseData.diagnosis) ? caseData.diagnosis.join('；') : caseData.diagnosis;
      parts.push(`\n诊断：\n${diag}`);
    }
    if (caseData.treatment) {
      const treat = Array.isArray(caseData.treatment) ? caseData.treatment.join('；') : caseData.treatment;
      parts.push(`\n治疗经过：\n${treat}`);
    }
    return parts.join('');
  };

  // 从测试病例构建完整文本
  const buildFullMedicalText = (testCase) => {
    return `患者${testCase.patientName}，${testCase.age}岁，${testCase.gender === '男' ? '男' : '女'}。
主诉：${testCase.chiefComplaint}。

现病史：
${testCase.presentIllness}

体格检查：
${testCase.physicalExam}

辅助检查：
${Object.entries(testCase.labResults).map(([k, v]) => `${k}：${v}`).join('\n')}

诊断：
${testCase.diagnosis.join('；')}

治疗经过：
${testCase.treatment.join('；')}`;
  };

  // 抽屉状态
  const [drawers, setDrawers] = useState({
    drg: false,
    graph: false,
    stats: false,
    risk: false,
  });

  // 高置信度编码数量
  const highConfidenceCount = predictions.filter((p) => p.confidence >= 0.8).length;
  const pendingHighConfidence = highConfidenceCount - selectedCodes.filter((c) => c.confidence >= 0.8).length;

  // 获取当前高亮编码的证据
  const currentEvidence = highlightedCode
    ? EVIDENCE_DATABASE[highlightedCode] || []
    : [];

  // 处理卡片hover
  const handleCardHover = useCallback((index, isHovered) => {
    setHoveredCardIndex(isHovered ? index : null);
  }, []);

  // 操作处理
  const handleAccept = useCallback((code) => {
    if (!selectedCodes.find((c) => c.code === code.code)) {
      setSelectedCodes([...selectedCodes, code]);
    }
  }, [selectedCodes]);

  const handleReplace = useCallback((code) => {
    // 替换当前选中的主诊断
    setSelectedCodes([code, ...selectedCodes.filter(c => c.code !== code.code)]);
  }, [selectedCodes]);

  const handleIgnore = useCallback((code) => {
    setPredictions(predictions.filter(p => p.code !== code.code));
  }, [predictions]);

  const handleFlag = useCallback((code) => {
    alert(`已标记编码 ${code.code}，将纳入质控复核流程`);
  }, []);

  const handleEvidenceClick = useCallback((code) => {
    setHighlightedCode(code.code);
  }, []);

  // 一键通过高置信度
  const handleOneClick = useCallback(() => {
    const highConfidenceCodes = predictions.filter((p) => p.confidence >= 0.8);
    const newCodes = highConfidenceCodes.filter(
      (hc) => !selectedCodes.find((sc) => sc.code === hc.code)
    );
    setSelectedCodes([...selectedCodes, ...newCodes]);
  }, [predictions, selectedCodes]);

  // 移除编码
  const handleRemoveCode = useCallback((index) => {
    setSelectedCodes(selectedCodes.filter((_, i) => i !== index));
  }, [selectedCodes]);

  // 提交归档
  const handleSubmit = useCallback(() => {
    console.log('提交的编码:', selectedCodes);
    alert(`成功提交 ${selectedCodes.length} 个ICD编码！`);
  }, [selectedCodes]);

  // 主色调
  const primaryColor = 'teal';

  // 切换抽屉
  const toggleDrawer = (key) => {
    setDrawers({ ...drawers, [key]: !drawers[key] });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      {/* 主工作区域 - 两栏布局，更简洁 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：病历原文 - 支持编码优化阅读模式 */}
        <LeftPanel
          patientInfo={patientInfo}
          medicalText={medicalText}
          onTextChange={setMedicalText}
          highlightedEvidence={currentEvidence}
          selectedCode={highlightedCode}
          onSelectionSuggest={handleAccept}
        />

        {/* 右侧：一体化工作区 - 推荐 + 编码池 */}
        <div className="flex-1 flex flex-col min-w-0 border-l border-gray-200 bg-white">
          {/* 顶部工具栏 - 极简设计 */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <BrainCircuit size={18} className="text-teal-600" />
                <span className="font-medium text-slate-700">推荐编码</span>
                <span className="text-xs text-slate-400">({predictions.length})</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 快捷审阅模式开关 */}
              <button
                onClick={() => setQuickReviewMode(!quickReviewMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  quickReviewMode
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Zap size={14} />
                快捷审阅
              </button>
              {/* 一键采纳 */}
              {pendingHighConfidence > 0 && (
                <button
                  onClick={handleOneClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-all shadow-sm"
                >
                  <CheckCircle size={14} />
                  一键采纳 ({pendingHighConfidence})
                </button>
              )}
            </div>
          </div>

          {/* 推荐列表 + 编码池 - 垂直布局，减少水平分割 */}
          <div className="flex-1 overflow-y-auto">
            {/* 空状态提示 - 无待编码病例 */}
            {caseQueue.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <BrainCircuit size={48} className="mb-4 text-gray-300" />
                <p className="mb-2 font-medium text-gray-600">暂无待编码病例</p>
                <p className="text-sm text-gray-400">请从病例管理中添加病例</p>
              </div>
            )}

            {/* 加载中状态 */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Loader2 size={48} className="animate-spin mb-4 text-teal-500" />
                <p className="mb-2 font-medium text-gray-600">正在加载病例...</p>
              </div>
            )}

            {/* AI分析中状态 */}
            {predictLoading && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Loader2 size={48} className="animate-spin mb-4 text-teal-500" />
                <p className="mb-2 font-medium text-gray-600">AI正在分析病历...</p>
                <p className="text-sm text-gray-400">请稍候</p>
              </div>
            )}

            {/* AI分析中状态 */}
            {predictLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Loader2 size={48} className="animate-spin mb-4 text-teal-500" />
                <p className="mb-2 font-medium text-gray-600">AI正在分析病历...</p>
                <p className="text-sm text-gray-400">请稍候</p>
              </div>
            )}

            <div className="p-4 space-y-3">
              {predictions.map((code, index) => (
                <RecommendationCard
                  key={code.code}
                  code={code}
                  index={index}
                  isHovered={hoveredCardIndex === index}
                  onHover={handleCardHover}
                  onAccept={handleAccept}
                  onReplace={handleReplace}
                  onIgnore={handleIgnore}
                  onFlag={handleFlag}
                  onEvidenceClick={handleEvidenceClick}
                  quickReviewMode={quickReviewMode}
                />
              ))}
            </div>

            {/* 编码池区域 */}
            <div className="border-t-2 border-teal-200 bg-teal-50/50">
              <RightPanel
                selectedCodes={selectedCodes}
                onRemoveCode={handleRemoveCode}
                onAddCode={handleAccept}
                onSubmit={handleSubmit}
                compact={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 底部抽屉区域 - 非核心功能全部收起 */}
      <div className="border-t border-gray-200">
        {/* DRG 模拟抽屉 */}
        <Drawer
          title="DRG 入组模拟"
          icon={<Activity size={16} className="text-blue-600" />}
          isOpen={drawers.drg}
          onOpenChange={(open) => setDrawers({ ...drawers, drg: open })}
          position="bottom"
          height={280}
        >
          <div className="text-sm text-gray-600">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded-lg border">
                <div className="text-xs text-gray-500 mb-1">预计入组</div>
                <div className="font-mono font-bold text-lg text-blue-600">DRG-FK29</div>
                <div className="text-xs text-gray-600 mt-1">急性心肌梗死伴合并症</div>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <div className="text-xs text-gray-500 mb-1">权重</div>
                <div className="font-mono font-bold text-lg text-amber-600">2.8500</div>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <div className="text-xs text-gray-500 mb-1">预计付费</div>
                <div className="font-mono font-bold text-lg text-green-600">¥ 42,750</div>
              </div>
            </div>
          </div>
        </Drawer>

        {/* 知识图谱抽屉 */}
        <Drawer
          title="知识图谱"
          icon={<FileText size={16} className="text-purple-600" />}
          isOpen={drawers.graph}
          onOpenChange={(open) => setDrawers({ ...drawers, graph: open })}
          position="bottom"
          height={300}
        >
          <div className="h-48 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
            <span className="text-gray-400">知识图谱可视化区域</span>
          </div>
        </Drawer>

        {/* 编码统计抽屉 */}
        <Drawer
          title="今日统计"
          icon={<BarChart3 size={16} className="text-teal-600" />}
          isOpen={drawers.stats}
          onOpenChange={(open) => setDrawers({ ...drawers, stats: open })}
          position="bottom"
          height={260}
        >
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-xl border">
              <div className="text-3xl font-bold text-teal-600">12</div>
              <div className="text-xs text-gray-500 mt-1">已完成编码</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl border">
              <div className="text-3xl font-bold text-blue-600">89%</div>
              <div className="text-xs text-gray-500 mt-1">AI采纳率</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl border">
              <div className="text-3xl font-bold text-amber-600">4.2</div>
              <div className="text-xs text-gray-500 mt-1">平均每份耗时</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl border">
              <div className="text-3xl font-bold text-green-600">{caseQueue.length}</div>
              <div className="text-xs text-gray-500 mt-1">待编码队列</div>
            </div>
          </div>
        </Drawer>

        {/* 抽屉快捷切换栏 */}
        <div className="bg-white px-4 py-2 flex items-center gap-2 border-t border-gray-100">
          <span className="text-xs text-gray-400 mr-2">扩展功能：</span>
          {[
            { key: 'drg', label: 'DRG入组', icon: <Activity size={14} /> },
            { key: 'graph', label: '知识图谱', icon: <FileText size={14} /> },
            { key: 'stats', label: '编码统计', icon: <BarChart3 size={14} /> },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => toggleDrawer(item.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                drawers[item.key]
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              {item.label}
              {drawers[item.key] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
