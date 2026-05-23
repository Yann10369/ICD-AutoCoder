/**
 * 模型质控管理页面 - 简约无色彩风格
 * Model Repository: 多模型管理与测试
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Layers,
  FlaskConical,
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  ChevronRight,
  Server,
  Target,
  Brain,
  Clock,
  Cpu,
} from 'lucide-react';
import { nerQualityService } from '../services/nerQualityService';

// 简约无色彩配色
const styles = {
  border: 'border border-gray-200',
  bg: 'bg-white',
  bgAlt: 'bg-gray-50',
  text: 'text-gray-900',
  textMuted: 'text-gray-500',
  textLight: 'text-gray-400',
  button: 'px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm hover:bg-gray-50',
  buttonPrimary: 'px-3 py-2 bg-gray-900 text-white text-sm hover:bg-gray-800',
  input: 'w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-gray-400',
  tag: 'px-2 py-0.5 border border-gray-200 text-xs text-gray-600',
};

// ============ NER辅助服务 ============
function NerServiceIndicator() {
  const [health, setHealth] = useState({ ner: false, icd: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const status = await nerQualityService.getHealthStatus();
        setHealth({ ner: status.ner, icd: status.icd });
      } catch {
        setHealth({ ner: false, icd: false });
      } finally {
        setLoading(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`${styles.bg} ${styles.border} rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain size={18} className="text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900">NER 实体识别</div>
            <div className="text-xs text-gray-400">BiomedNLP-PubMedBERT</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <RefreshCw size={14} className="text-gray-400 animate-spin" />
          ) : health.ner ? (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <CheckCircle size={12} /> 运行中
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <XCircle size={12} /> 离线
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ ICD模型仓库 ============

const MOCK_MODELS = [
  {
    id: 'plm-icd-v1',
    name: 'PLM-ICD',
    description: '基于PubMedBERT的ICD-10编码预测模型',
    type: 'ICD-10',
    version: '2.1.0',
    status: 'active',
    endpoint: '/models/plm-icd/predict',
    port: 8001,
    metrics: { accuracy: 92.3, latency: 156, calls: 128560 },
  },
  {
    id: 'caml-v1',
    name: 'CAML',
    description: 'Convolutional Attention for Medical Coding',
    type: 'ICD-10',
    version: '1.5.0',
    status: 'active',
    endpoint: '/models/caml/predict',
    port: 8003,
    metrics: { accuracy: 89.7, latency: 89, calls: 86420 },
  },
  {
    id: 'mutires-v1',
    name: 'MultiResCNN',
    description: '多分辨率CNN编码预测模型',
    type: 'ICD-10',
    version: '0.9.0',
    status: 'testing',
    endpoint: '/models/mutires/predict',
    port: 8002,
    metrics: { accuracy: 85.2, latency: 45, calls: 15230 },
  },
];

function ModelCard({ model, selected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className={`${styles.bg} ${styles.border} rounded-lg p-4 cursor-pointer transition-all hover:border-gray-300 ${
        selected ? 'ring-1 ring-gray-400' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Box size={16} className="text-gray-400" />
          <span className="font-medium text-gray-900">{model.name}</span>
        </div>
        <span className={styles.tag}>{model.type}</span>
      </div>
      <p className="text-sm text-gray-500 mb-3">{model.description}</p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>v{model.version}</span>
        <span>{model.status === 'active' ? '生产' : '测试'}</span>
      </div>
    </div>
  );
}

function ModelDetail({ model }) {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runTest = useCallback(async () => {
    if (!inputText.trim() || !model) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // 根据模型调用对应端点
      const response = await fetch(`http://localhost:${model.port}${model.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, top_k: 10, threshold: 0.01 }),
      });
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [inputText, model]);

  if (!model) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Target size={48} className="mx-auto mb-4 opacity-30" />
          <p>选择一个模型查看详情</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 模型头部 */}
      <div className={`${styles.bgAlt} ${styles.border} rounded-lg p-4 mb-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{model.name}</h2>
            <p className="text-sm text-gray-500">{model.description}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>端口 {model.port}</span>
            <span>v{model.version}</span>
          </div>
        </div>
      </div>

      {/* 测试区域 */}
      <div className={`${styles.bg} ${styles.border} rounded-lg p-4 flex-1`}>
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-900">在线测试</span>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="输入医疗文本测试模型..."
          className={`${styles.input} h-24 resize-none mb-3`}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">支持中英文</span>
          <button
            onClick={runTest}
            disabled={loading || !inputText.trim()}
            className={`${styles.buttonPrimary} flex items-center gap-1 disabled:opacity-50`}
          >
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
            {loading ? '分析中...' : '测试'}
          </button>
        </div>

        {/* 结果 */}
        {error && (
          <div className="mt-3 p-2 border border-red-200 text-xs text-red-600 rounded">
            {error}
          </div>
        )}
        {results && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="text-xs text-gray-500 mb-2">预测结果 ({results.length})</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {results.slice(0, 10).map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                  <span className="font-mono text-gray-700">{r.icd_code || r.code}</span>
                  <span className="text-gray-400">
                    {Math.round((r.probability || r.score || 0) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModelRepo() {
  const [models, setModels] = useState(MOCK_MODELS);
  const [selectedModel, setSelectedModel] = useState(null);

  return (
    <div className="flex gap-4 h-full">
      {/* 左侧：模型列表 */}
      <div className="w-80 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-900">模型仓库</span>
          </div>
          <span className="text-xs text-gray-400">{models.length} 个模型</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {models.map((m) => (
            <ModelCard
              key={m.id}
              model={m}
              selected={selectedModel?.id === m.id}
              onSelect={() => setSelectedModel(m)}
            />
          ))}
        </div>
      </div>

      {/* 右侧：模型详情/测试 */}
      <div className="flex-1">
        <ModelDetail model={selectedModel} />
      </div>
    </div>
  );
}

// ============ 主页面 ============
export default function ModelsPage() {
  const [loading, setLoading] = useState(false);

  const refreshAll = async () => {
    setLoading(true);
    // 刷新健康状态等
    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 顶部 */}
      <div className={`${styles.bg} ${styles.border} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">模型质控管理</h1>
            <p className="text-sm text-gray-400 mt-0.5">多模型仓库 · 在线测试 · 效果评估</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshAll} disabled={loading} className={styles.button}>
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* NER辅助服务状态 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Server size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">辅助服务</span>
          </div>
          <NerServiceIndicator />
        </div>

        {/* 模型仓库 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">模型仓库</span>
          </div>
          <ModelRepo />
        </div>
      </div>
    </div>
  );
}