import React, { useState, useRef, useEffect } from 'react';
import CaseInput from '../components/CaseInput';
import ModelSelector from '../components/ModelSelector';
import PredictionTable from '../components/PredictionTable';
import GraphViewer from '../components/GraphViewer';
import ExplanationPanel from '../components/ExplanationPanel';
import PerformanceChart from '../components/PerformanceChart';

const HomePage = ({ onBack }) => {
  const [caseText, setCaseText] = useState('');
  const [language, setLanguage] = useState('zh');
  const [preprocessOptions, setPreprocessOptions] = useState({
    removeStopwords: true,
    keepNumbers: true,
    standardizeTerms: true,
  });
  const [selectedModel, setSelectedModel] = useState('hybrid');
  const [modelParams, setModelParams] = useState({
    temperature: 0.7,
    topK: 5,
    threshold: 0.5,
  });
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('prediction');
  const [languageExpanded, setLanguageExpanded] = useState(false);
  const [preprocessExpanded, setPreprocessExpanded] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(false);

  // 输入面板宽度 - 输入和结果之间可拖动
  const [leftPanelWidth, setLeftPanelWidth] = useState(35);
  const [isLeftDragging, setIsLeftDragging] = useState(false);

  const mainContainerRef = useRef(null);
  const leftDragRef = useRef(null);

  // 如果用户点击顶部模型配置管理按钮，跳转到独立页面
  const handleOpenModelConfig = () => {
    // 使用 pushState 而非 window.location.href 避免页面刷新
    if (window.location.pathname !== '/model-configs') {
      window.history.pushState({}, '', '/model-configs');
    }
    // 触发 popstate 事件让 App.jsx 处理页面切换
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Handle preprocess options change
  const handlePreprocessChange = (option) => {
    setPreprocessOptions(prev => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  // Handle model parameters change
  const handleParamChange = (param, value) => {
    setModelParams(prev => ({
      ...prev,
      [param]: parseFloat(value),
    }));
  };

  // 拖动处理 - 输入面板分隔条
  useEffect(() => {
    if (!isLeftDragging) return;

    const handleMouseMove = (e) => {
      if (!mainContainerRef.current) return;

      const container = mainContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const totalLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      const clampedWidth = Math.max(25, Math.min(45, totalLeftWidth));
      setLeftPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsLeftDragging(false);
    };

    // 添加鼠标离开窗口事件，确保状态被清理
    const handleMouseLeave = () => {
      setIsLeftDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isLeftDragging]);

  // 渲染高亮实体
  const renderHighlighter = () => {
    if (!predictions || !caseText) {
      return <span className="text-slate-400">请输入病例文本并进行分析...</span>;
    }

    let html = caseText;
    const entities = predictions.entities || {};

    // 高亮疾病实体
    if (entities.diseases) {
      entities.diseases.forEach(entity => {
        const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        html = html.replace(regex, `<span class="px-1 mx-0.5 rounded border bg-red-100 text-red-700 border-red-200 text-sm font-medium cursor-help" title="疾病">${entity}</span>`);
      });
    }

    // 高亮症状实体
    if (entities.symptoms) {
      entities.symptoms.forEach(entity => {
        const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        html = html.replace(regex, `<span class="px-1 mx-0.5 rounded border bg-orange-100 text-orange-700 border-orange-200 text-sm font-medium cursor-help" title="症状">${entity}</span>`);
      });
    }

    // 高亮操作实体
    if (entities.procedures) {
      entities.procedures.forEach(entity => {
        const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        html = html.replace(regex, `<span class="px-1 mx-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200 text-sm font-medium cursor-help" title="操作">${entity}</span>`);
      });
    }

    return <div dangerouslySetInnerHTML={{__html: html}} className="leading-7" />;
  };

  // Submit analysis
  const handleSubmit = async () => {
    if (!caseText.trim()) {
      alert('请输入病例信息');
      return;
    }
    setLoading(true);
    try {
      const requestBody = {
        caseText: caseText.trim(),
        language: language || 'zh',
        preprocessOptions: preprocessOptions,
        params: {
          topK: modelParams.topK || 10,
          threshold: modelParams.threshold || 0.5,
        },
      };

      if (preprocessOptions && Object.values(preprocessOptions).every(v => !v)) {
        delete requestBody.preprocessOptions;
      }

      console.log('发送请求到 /api/predict', requestBody);

      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        console.error('API错误响应:', errorData);
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('预测结果:', data);
      setPredictions(data);
      setActiveTab('prediction');
    } catch (error) {
      console.error('WARNING_MESSAGE:', error);
      alert(`预测失败: ${error.message || '请重试'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-hidden relative flex h-full">
      {/* 中间：输入与控制 - 占比更大，因为没有左侧导航了 */}
      <aside
        className="flex flex-col gap-4 h-full p-4"
        style={{ width: `${leftPanelWidth}%`, minWidth: '350px', maxWidth: '45%' }}
      >
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-semibold flex items-center gap-2">
            病例录入
          </div>

          <CaseInput
            caseText={caseText}
            onCaseChange={(e) => setCaseText(e.target.value)}
            onSubmit={handleSubmit}
            loading={loading}
          />

          <div className="p-4 bg-white border-t border-slate-100 space-y-4 overflow-y-auto">
            {/* 语言选择 */}
            <div>
              <button
                onClick={() => setLanguageExpanded(!languageExpanded)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 mb-2"
              >
                <span>选择语言</span>
                {languageExpanded ? (
                  <span>▲</span>
                ) : (
                  <span>▼</span>
                )}
              </button>
              {languageExpanded && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="language"
                      value="zh"
                      checked={language === 'zh'}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-3 h-3"
                    />
                    <span className="text-xs text-slate-600">中文</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="language"
                      value="en"
                      checked={language === 'en'}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-3 h-3"
                    />
                    <span className="text-xs text-slate-600">English</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="language"
                      value="es"
                      checked={language === 'es'}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-3 h-3"
                    />
                    <span className="text-xs text-slate-600">Español</span>
                  </label>
                </div>
              )}
            </div>

            {/* 预处理选项 */}
            <div>
              <button
                onClick={() => setPreprocessExpanded(!preprocessExpanded)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 mb-2"
              >
                <span>预处理选项</span>
                {preprocessExpanded ? (
                  <span>▲</span>
                ) : (
                  <span>▼</span>
                )}
              </button>
              {preprocessExpanded && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preprocessOptions.removeStopwords}
                      onChange={() => handlePreprocessChange('removeStopwords')}
                      className="w-3 h-3"
                    />
                    <span className="text-xs text-slate-600">去除停用词</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preprocessOptions.keepNumbers}
                      onChange={() => handlePreprocessChange('keepNumbers')}
                      className="w-3 h-3"
                    />
                    <span className="text-xs text-slate-600">保留数字</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preprocessOptions.standardizeTerms}
                      onChange={() => handlePreprocessChange('standardizeTerms')}
                      className="w-3 h-3"
                    />
                    <span className="text-xs text-slate-600">术语标准化</span>
                  </label>
                </div>
              )}
            </div>

            {/* 模型配置 */}
            <div>
              <button
                onClick={() => setConfigExpanded(!configExpanded)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 mb-2"
              >
                <span>模型配置</span>
                {configExpanded ? (
                  <span>▲</span>
                ) : (
                  <span>▼</span>
                )}
              </button>
              {configExpanded && (
                <div className="space-y-3">
                  {/* 模型选择 */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">模型类型</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="small">轻量级模型</option>
                      <option value="llm">LLM模型</option>
                      <option value="hybrid">混合模型</option>
                    </select>
                  </div>

                  {/* Top-K 参数 */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Top-K</span>
                      <span>{modelParams.topK}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={modelParams.topK}
                      onChange={(e) => handleParamChange('topK', e.target.value)}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* 阈值参数 */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>置信度阈值</span>
                      <span>{modelParams.threshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={modelParams.threshold}
                      onChange={(e) => handleParamChange('threshold', e.target.value)}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 分析按钮 */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full py-2.5 rounded-lg text-white font-medium text-sm flex justify-center items-center gap-2 transition-all ${
                loading ? 'bg-slate-400' : 'bg-slate-600 hover:bg-slate-700 shadow-md hover:shadow-lg'
              }`}
            >
              {loading ? (
                <>
                  <span className="animate-spin border-2 border-white/30 border-t-white w-4 h-4 rounded-full"></span>
                  推理运算中...
                </>
              ) : (
                <>
                  开始编码
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* 输入面板和结果面板之间的拖动分隔条 */}
      <div
        ref={leftDragRef}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsLeftDragging(true);
        }}
        className="relative w-3 bg-transparent cursor-col-resize transition-colors flex-shrink-0 z-10"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1 h-full bg-slate-300 hover:bg-slate-500 transition-colors"></div>
      </div>

      {/* 右侧：结果展示 - 因为没有左侧导航，宽度占满剩余空间 */}
      <div
        className="flex flex-col gap-4 h-full overflow-hidden p-4"
        style={{
          width: `${100 - leftPanelWidth}%`,
          minWidth: '400px',
        }}
      >
        {/* 顶部：实体识别高亮 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-48 shrink-0">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 px-5 pt-5 shrink-0">NER 实体识别层</h3>
          <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
            <div className="text-slate-800 text-sm whitespace-pre-wrap break-words">
              {renderHighlighter()}
            </div>
          </div>
        </div>

        {/* 底部：多维度结果 (Tabs) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-100">
            {[
              { id: 'prediction', label: '预测结果' },
              { id: 'graph', label: '知识图谱' },
              { id: 'explanation', label: '可解释性分析' },
              { id: 'metrics', label: '性能监控' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors relative ${
                  activeTab === tab.id ? 'text-slate-700 bg-slate-100' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-600"></div>}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden relative flex flex-col">
            {!predictions && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 z-0">
                <p className="text-slate-500">等待数据输入...</p>
              </div>
            )}

            {/* 1. 预测结果 */}
            {predictions && activeTab === 'prediction' && (
              <div className="flex-1 overflow-y-auto p-6">
                <PredictionTable predictions={predictions} />
              </div>
            )}

            {/* 2. 知识图谱 */}
            {predictions && (
              <div
                className="flex-1 overflow-hidden"
                style={{ display: activeTab === 'graph' ? 'flex' : 'none', flexDirection: 'column' }}
              >
                <GraphViewer predictions={predictions} />
              </div>
            )}

            {/* 3. 可解释性分析 */}
            {predictions && activeTab === 'explanation' && (
              <div className="flex-1 overflow-y-auto p-6">
                <ExplanationPanel predictions={predictions} />
              </div>
            )}

            {/* 4. 性能监控 */}
            {predictions && activeTab === 'metrics' && (
              <div className="flex-1 overflow-y-auto p-6">
                <PerformanceChart data={predictions} />
              </div>
            )}
          </div>
        </div>
      </div>

    </main>
  );
};

export default HomePage;
