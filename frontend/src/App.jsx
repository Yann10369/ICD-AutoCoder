import React, { useState } from 'react';
import { Upload, Settings, BarChart3, Network, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏥 医学诊断智能分析系统
          </h1>
          <p className="text-gray-600">基于AI的ICD编码预测与可解释性分析</p>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-4 mb-6 bg-white rounded-lg shadow-md p-2">
          <TabButton 
            active={activeTab === 'input'} 
            onClick={() => setActiveTab('input')}
            icon={<Upload size={20} />}
            label="病例输入"
          />
          <TabButton 
            active={activeTab === 'config'} 
            onClick={() => setActiveTab('config')}
            icon={<Settings size={20} />}
            label="模型配置"
          />
          <TabButton 
            active={activeTab === 'results'} 
            onClick={() => setActiveTab('results')}
            icon={<BarChart3 size={20} />}
            label="预测结果"
          />
          <TabButton 
            active={activeTab === 'visualization'} 
            onClick={() => setActiveTab('visualization')}
            icon={<Network size={20} />}
            label="知识可视化"
          />
          <TabButton 
            active={activeTab === 'explanation'} 
            onClick={() => setActiveTab('explanation')}
            icon={<Zap size={20} />}
            label="可解释性分析"
          />
        </div>

        {/* Content area */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Case input tab */}
          {activeTab === 'input' && (
            <CaseInput 
              caseText={caseText}
              language={language}
              preprocessOptions={preprocessOptions}
              onCaseChange={handleCaseInput}
              onLanguageChange={setLanguage}
              onPreprocessChange={handlePreprocessChange}
              onSubmit={handleSubmit}
              loading={loading}
            />
          )}

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
          {!predictions && activeTab !== 'input' && activeTab !== 'config' && (
            <EmptyState message="请先输入病例并运行预测" />
          )}
        </div>
      </div>
    </div>
  );
};

// Tab button component
const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
      active
        ? 'bg-indigo-600 text-white shadow-md'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    {icon}
    {label}
  </button>
);

// Empty state component
const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="text-6xl mb-4">📭</div>
    <p className="text-xl text-gray-600">{message}</p>
  </div>
);

export default MedicalDiagnosisSystem;

