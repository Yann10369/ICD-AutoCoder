import React, { useState, useRef, useEffect } from 'react';
import { Settings, BarChart3, Network, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import CaseInput from './components/CaseInput';
import ModelSelector from './components/ModelSelector';
import PredictionTable from './components/PredictionTable';
import GraphViewer from './components/GraphViewer';
import ExplanationPanel from './components/ExplanationPanel';

// Main component
const MedicalDiagnosisSystem = () => {
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
  const [activeTab, setActiveTab] = useState('input');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [languageExpanded, setLanguageExpanded] = useState(false);
  const [preprocessExpanded, setPreprocessExpanded] = useState(false);
  const sidebarRef = useRef(null);
  const triggerRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  // Handle sidebar visibility
  useEffect(() => {
    const handleMouseEnter = () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setSidebarVisible(true);
    };

    const handleMouseLeave = () => {
      hideTimeoutRef.current = setTimeout(() => {
        setSidebarVisible(false);
      }, 2000);
    };

    const trigger = triggerRef.current;
    const sidebar = sidebarRef.current;
    
    if (trigger) {
      trigger.addEventListener('mouseenter', handleMouseEnter);
      trigger.addEventListener('mouseleave', handleMouseLeave);
    }
    if (sidebar) {
      sidebar.addEventListener('mouseenter', handleMouseEnter);
      sidebar.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (trigger) {
        trigger.removeEventListener('mouseenter', handleMouseEnter);
        trigger.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (sidebar) {
        sidebar.removeEventListener('mouseenter', handleMouseEnter);
        sidebar.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Handle case input
  const handleCaseInput = (e) => {
    setCaseText(e.target.value);
  };

  // Handle preprocess options change
  const handlePreprocessChange = (option) => {
    setPreprocessOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // Handle model parameters change
  const handleParamChange = (param, value) => {
    setModelParams(prev => ({
      ...prev,
      [param]: parseFloat(value)
    }));
  };

  // Submit analysis
  const handleSubmit = async () => {
    if (!caseText.trim()) {
      alert('请输入病例信息');
      return;
    }
    setLoading(true);
    try {
      // Call backend API
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseText,
          language,
          preprocessOptions,
          model: selectedModel,
          params: modelParams,
        }),
      });
      const data = await response.json();
      setPredictions(data);
      setActiveTab('results');
    } catch (error) {
      console.error('预测失败:', error);
      alert('预测失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative">
      {/* Left trigger area */}
      <div
        ref={triggerRef}
        className="fixed left-0 top-0 h-full w-4 z-40"
      />
      
      {/* Left Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-50 ${
          sidebarVisible ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="p-4 space-y-4">
          {/* Language Selection - only show in input tab */}
          {activeTab === 'input' && (
            <div className="border-b border-gray-200 pb-4">
              <button
                onClick={() => setLanguageExpanded(!languageExpanded)}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-800 hover:text-gray-900"
              >
                <span>选择语言</span>
                {languageExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {languageExpanded && (
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="language"
                      value="zh"
                      checked={language === 'zh'}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">中文</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="language"
                      value="en"
                      checked={language === 'en'}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">English</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="language"
                      value="es"
                      checked={language === 'es'}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Español</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Preprocess Options - only show in input tab */}
          {activeTab === 'input' && (
            <div className="border-b border-gray-200 pb-4">
              <button
                onClick={() => setPreprocessExpanded(!preprocessExpanded)}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-800 hover:text-gray-900"
              >
                <span>预处理选项</span>
                {preprocessExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {preprocessExpanded && (
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preprocessOptions.removeStopwords}
                      onChange={() => handlePreprocessChange('removeStopwords')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">去除停用词</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preprocessOptions.keepNumbers}
                      onChange={() => handlePreprocessChange('keepNumbers')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">保留数字</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preprocessOptions.standardizeTerms}
                      onChange={() => handlePreprocessChange('standardizeTerms')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">术语标准化</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Model Config */}
          <div className="border-b border-gray-200 pb-4">
            <button
              onClick={() => setActiveTab('config')}
              className={`w-full text-left text-sm font-semibold ${
                activeTab === 'config' ? 'text-indigo-600' : 'text-gray-800 hover:text-gray-900'
              }`}
            >
              模型配置
            </button>
          </div>

          {/* Prediction Results */}
          <div className="border-b border-gray-200 pb-4">
            <button
              onClick={() => setActiveTab('results')}
              disabled={!predictions}
              className={`w-full text-left text-sm font-semibold ${
                !predictions
                  ? 'text-gray-400 cursor-not-allowed'
                  : activeTab === 'results'
                  ? 'text-indigo-600'
                  : 'text-gray-800 hover:text-gray-900'
              }`}
            >
              预测结果
            </button>
          </div>

          {/* Knowledge Visualization */}
          <div className="border-b border-gray-200 pb-4">
            <button
              onClick={() => setActiveTab('visualization')}
              disabled={!predictions}
              className={`w-full text-left text-sm font-semibold ${
                !predictions
                  ? 'text-gray-400 cursor-not-allowed'
                  : activeTab === 'visualization'
                  ? 'text-indigo-600'
                  : 'text-gray-800 hover:text-gray-900'
              }`}
            >
              知识可视化
            </button>
          </div>

          {/* Explanation Analysis */}
          <div>
            <button
              onClick={() => setActiveTab('explanation')}
              disabled={!predictions}
              className={`w-full text-left text-sm font-semibold ${
                !predictions
                  ? 'text-gray-400 cursor-not-allowed'
                  : activeTab === 'explanation'
                  ? 'text-indigo-600'
                  : 'text-gray-800 hover:text-gray-900'
              }`}
            >
              可解释性分析
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-screen">
        {/* Case input - centered in middle-bottom */}
        {activeTab === 'input' && (
          <div className="flex items-center justify-center min-h-screen pb-32">
            <div className="w-full max-w-4xl px-4">
              <CaseInput 
                caseText={caseText}
                onCaseChange={handleCaseInput}
                onSubmit={handleSubmit}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Other tabs content */}
        {activeTab !== 'input' && (
          <div className="p-8">
            {/* Model config tab */}
            {activeTab === 'config' && (
              <ModelSelector 
                selectedModel={selectedModel}
                modelParams={modelParams}
                onModelChange={setSelectedModel}
                onParamChange={handleParamChange}
              />
            )}

            {/* Prediction results tab */}
            {activeTab === 'results' && predictions && (
              <PredictionTable predictions={predictions} />
            )}

            {/* Knowledge visualization tab */}
            {activeTab === 'visualization' && predictions && (
              <GraphViewer predictions={predictions} />
            )}

            {/* Explanation analysis tab */}
            {activeTab === 'explanation' && predictions && (
              <ExplanationPanel predictions={predictions} />
            )}

            {/* Empty state */}
            {!predictions && activeTab !== 'config' && (
              <EmptyState message="请先输入病例并运行预测" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Empty state component
const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="text-6xl mb-4">📭</div>
    <p className="text-xl text-gray-600">{message}</p>
  </div>
);

export default MedicalDiagnosisSystem;

