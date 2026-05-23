import React, { useEffect, useMemo, useState } from 'react';
import {
  Save,
  X,
  Database,
  BrainCog,
  Cpu,
  Plus,
  RefreshCcw,
  ArrowLeft,
  Trash2,
  Loader2,
  Folder,
  FolderOpen,
  File,
  Key,
  Code,
  Package,
  CheckCircle,
} from 'lucide-react';
import {
  listConfigs,
  createConfig,
  updateConfig,
  deleteConfig,
  toggleEnabled,
} from '../api/modelConfigs';

const emptyForm = {
  name: '',
  category: 'small', // 默认小模型
  status: 'unknown',
  // 大模型字段
  apiKey: '',
  exampleCode: '',
  // 小模型字段
  dockerImage: '',
  size: '',
  description: '',
  enabled: true,
  // 图谱字段
  graphApiCode: '',
  graphApiKey: '',
};

const categoryInfo = {
  graph: {
    label: '知识图谱',
    icon: Database,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  large: {
    label: '大模型',
    icon: BrainCog,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  small: {
    label: '小模型',
    icon: Cpu,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
};

const statusColors = {
  valid: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  invalid: 'text-rose-600 bg-rose-50 border-rose-100',
  unknown: 'text-slate-500 bg-slate-50 border-slate-100',
};

const ModelConfigPage = ({ onBack }) => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);
  const [expandedRoots, setExpandedRoots] = useState({
    graph: true,
    large: true,
    small: true,
  });

  // 按分类分组配置
  const groupedConfigs = useMemo(() => {
    const groups = {
      graph: [],
      large: [],
      small: [],
    };
    configs.forEach((cfg) => {
      const category = cfg.category || 'small';
      if (groups[category]) {
        groups[category].push(cfg);
      } else {
        groups.small.push(cfg);
      }
    });
    // 每个分类内按更新时间排序
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    });
    return groups;
  }, [configs]);

  const toggleRoot = (category) => {
    setExpandedRoots((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadConfigs = async () => {
    setLoading(true);
    try {
      console.log('开始加载模型配置...');
      const data = await listConfigs();
      console.log('加载到的模型配置:', data);
      setConfigs(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`成功加载 ${data.length} 个模型配置`);
      } else {
        console.log('未找到模型配置，显示空列表');
      }
    } catch (err) {
      console.error('加载模型配置失败:', err);
      showMessage('error', err.message || '加载配置失败，请检查后端服务是否正常运行');
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('ModelConfigPage 组件已挂载，开始加载配置');
    loadConfigs();
  }, []);

  const handleSelect = (cfg) => {
    setSelectedConfig(cfg);
    const category = cfg.category || 'small';
    setForm({
      id: cfg.id,
      name: cfg.name || '',
      category: category,
      status: cfg.status || 'unknown',
      // 大模型字段
      apiKey: cfg.apiKey || '',
      exampleCode: cfg.exampleCode || '',
      // 小模型字段
      dockerImage: cfg.dockerImage || '',
      size: cfg.size || '',
      description: cfg.description || '',
      enabled: cfg.enabled !== false,
      // 图谱字段
      graphApiCode: cfg.graphApiCode || '',
      graphApiKey: cfg.graphApiKey || '',
    });
  };

  const handleCreateNew = (category = 'small') => {
    setSelectedConfig(null);
    setForm({
      ...emptyForm,
      category,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确认删除该配置？')) return;
    try {
      await deleteConfig(id);
      showMessage('success', '删除成功');
      if (selectedConfig?.id === id) {
        setSelectedConfig(null);
        setForm(emptyForm);
      }
      loadConfigs();
    } catch (err) {
      showMessage('error', err.message || '删除失败');
    }
  };

  const handleToggleEnabled = async () => {
    if (!selectedConfig?.id) return;
    try {
      await toggleEnabled(selectedConfig.id);
      showMessage('success', form.enabled ? '已禁用' : '已启用');
      setForm((prev) => ({
        ...prev,
        enabled: !prev.enabled,
      }));
      loadConfigs();
    } catch (err) {
      showMessage('error', err.message || '切换状态失败');
    }
  };

  const handleSave = async () => {
    const category = form.category || 'small';
    let isValid = false;
    let errorMsg = '';

    // 根据分类验证必填字段
    if (!form.name) {
      errorMsg = '请填写模型名称';
    } else if (category === 'large') {
      // 大模型：需要 apiKey 和 exampleCode
      if (!form.apiKey || !form.exampleCode) {
        errorMsg = '请填写 API Key 和调用示例代码';
      } else {
        isValid = true;
      }
    } else if (category === 'small') {
      // 小模型：名称即可，其他可选
      isValid = true;
    } else if (category === 'graph') {
      // 图谱：需要 graphApiCode 和 graphApiKey
      if (!form.graphApiCode || !form.graphApiKey) {
        errorMsg = '请填写图谱 API 调用代码和 API Key';
      } else {
        isValid = true;
      }
    }

    if (!isValid) {
      showMessage('error', errorMsg);
      return;
    }

    setSaving(true);
    try {
      if (selectedConfig?.id) {
        await updateConfig(selectedConfig.id, form);
        showMessage('success', '保存成功');
      } else {
        const result = await createConfig(form);
        setSelectedConfig(result);
        showMessage('success', '创建成功');
      }
      loadConfigs();
    } catch (err) {
      showMessage('error', err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const renderStatus = (cfg) => {
    const color = statusColors[cfg.status] || statusColors.unknown;
    return (
      <span className={`px-2 py-1 rounded-lg text-xs border ${color}`}>
        {cfg.status || 'unknown'}
      </span>
    );
  };

  const renderRootNode = (category) => {
    const info = categoryInfo[category];
    const Icon = info.icon;
    const isExpanded = expandedRoots[category];
    const items = groupedConfigs[category] || [];

    return (
      <div className="mb-2">
        {/* 根节点 */}
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-slate-100 transition-colors
            ${isExpanded ? info.bgColor : ''}
          `}
          onClick={() => toggleRoot(category)}
        >
          {isExpanded ? (
            <FolderOpen size={18} className={info.color} />
          ) : (
            <Folder size={18} className={info.color} />
          )}
          <span className="text-sm font-semibold text-slate-700 flex-1">
            {info.label}
          </span>
          <span className="text-xs text-slate-400">({items.length})</span>
          <button
            className="text-xs px-2 py-1 rounded hover:bg-white/50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleCreateNew(category);
            }}
            title={`新建${info.label}配置`}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* 子项列表 */}
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {items.length === 0 && (
              <div className="text-xs text-slate-400 px-3 py-2">暂无配置</div>
            )}
            {items.map((cfg) => {
              const isSelected = selectedConfig?.id === cfg.id;
              return (
                <div
                  key={cfg.id}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors border
                    ${isSelected
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-600'
                    }
                  `}
                  onClick={() => handleSelect(cfg)}
                >
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <File size={14} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="text-sm truncate">{cfg.name}</span>
                  </div>
                  {cfg.category === 'small' && (
                    <div className={`w-2 h-2 rounded-full ${cfg.enabled !== false ? 'bg-green-400' : 'bg-slate-300'}`} title={cfg.enabled !== false ? '已启用' : '已禁用'} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shrink-0">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">模型配置管理</h1>
          <p className="text-slate-500 text-xs mt-1">管理知识图谱、大模型、小模型配置</p>
        </div>
        <div className="flex-1" />
        <button
          onClick={loadConfigs}
          className="text-sm text-slate-600 hover:text-slate-800 inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 刷新
        </button>
      </div>

      {/* 主体三栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：三个根目录树 */}
        <aside className="w-64 bg-white border-r border-slate-200 overflow-y-auto p-3 shrink-0">
          {loading && configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
              <p className="text-xs text-slate-500">正在加载...</p>
            </div>
          ) : (
            <div className="space-y-1">
              {Object.keys(categoryInfo).map((category) => renderRootNode(category))}
            </div>
          )}
        </aside>

        {/* 右侧：详情编辑面板 */}
        <main className="flex-1 bg-white overflow-y-auto">
          {!form.name && !selectedConfig ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Folder size={64} className="mb-4 opacity-30" />
              <p className="text-lg">从左侧选择一个模型配置</p>
              <p className="text-sm mt-2">或点击根目录后的 + 新建配置</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* 头部 */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 shrink-0">
                <div className={`p-2 rounded-lg ${categoryInfo[form.category]?.bgColor || categoryInfo.small.bgColor}`}>
                  {(() => {
                    const Icon = categoryInfo[form.category]?.icon || categoryInfo.small.icon;
                    return <Icon className={`w-5 h-5 ${categoryInfo[form.category]?.color || categoryInfo.small.color}`} />;
                  })()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    {selectedConfig ? '编辑配置' : `新建${categoryInfo[form.category]?.label || form.category}配置`}
                  </h2>
                  {selectedConfig?.id && (
                    <p className="text-xs text-slate-500">ID: {selectedConfig.id.slice(0, 8)}...</p>
                  )}
                </div>
                {form.category === 'small' && (
                  <div className="ml-auto">
                    <button
                      onClick={handleToggleEnabled}
                      className={`
                        inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors
                        ${form.enabled
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }
                      `}
                    >
                      <CheckCircle size={16} />
                      {form.enabled ? '已启用' : '已禁用'}
                    </button>
                  </div>
                )}
              </div>

              {/* 表单内容 */}
              <div className="p-6 space-y-8 flex-1">
                {/* 基础信息 */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">基础信息</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">实例名称</label>
                      <input
                        type="text"
                        placeholder="例如：PLM-ICD 小模型"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm pointer-events-auto user-select-text"
                      />
                      <p className="text-xs text-slate-400">配置实例的唯一标识名称</p>
                    </div>
                  </div>
                </section>

                <hr className="border-slate-200" />

                {/* 根据分类显示不同字段 */}
                {form.category === 'large' && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">大模型配置</h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Key className="w-4 h-4 text-slate-400" />
                          API Key
                        </label>
                        <input
                          type="password"
                          placeholder="输入大模型 API Key"
                          value={form.apiKey}
                          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition font-mono text-sm text-slate-600 pointer-events-auto user-select-text"
                        />
                        <p className="text-xs text-slate-400">用于调用大模型服务的 API 密钥</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Code className="w-4 h-4 text-slate-400" />
                          调用示例代码
                        </label>
                        <textarea
                          placeholder="例如：import openyan
openai.api_key = 'your-api-key'
response = openai.ChatCompletion.create(...)"
                          value={form.exampleCode}
                          onChange={(e) => setForm({ ...form, exampleCode: e.target.value })}
                          rows={8}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition font-mono text-sm text-slate-600 resize-none pointer-events-auto user-select-text"
                        />
                        <p className="text-xs text-slate-400">提供调用该大模型的示例代码或配置说明</p>
                      </div>
                    </div>
                  </section>
                )}

                {form.category === 'small' && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">小模型配置</h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          Docker 镜像地址
                        </label>
                        <input
                          type="text"
                          placeholder="例如：registry.example.com/models/plm-icd:v1.0"
                          value={form.dockerImage}
                          onChange={(e) => setForm({ ...form, dockerImage: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition font-mono text-sm text-slate-600 pointer-events-auto user-select-text"
                        />
                        <p className="text-xs text-slate-400">小模型服务的 Docker 镜像地址</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700">模型大小 (MB)</label>
                          <input
                            type="number"
                            placeholder="例如：256"
                            value={form.size}
                            onChange={(e) => setForm({ ...form, size: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm"
                          />
                          <p className="text-xs text-slate-400">模型文件大小，单位 MB</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">主要特点描述</label>
                        <textarea
                          placeholder="描述模型的主要特点、适用场景..."
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          rows={4}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm text-slate-600 resize-none"
                        />
                        <p className="text-xs text-slate-400">简要介绍这个模型的特点，便于选择</p>
                      </div>
                    </div>
                  </section>
                )}

                {form.category === 'graph' && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">知识图谱配置</h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Key className="w-4 h-4 text-slate-400" />
                          API Key
                        </label>
                        <input
                          type="password"
                          placeholder="输入知识图谱 API Key"
                          value={form.graphApiKey}
                          onChange={(e) => setForm({ ...form, graphApiKey: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition font-mono text-sm text-slate-600 pointer-events-auto user-select-text"
                        />
                        <p className="text-xs text-slate-400">用于调用知识图谱服务的 API 密钥</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Code className="w-4 h-4 text-slate-400" />
                          图谱 API 调用代码
                        </label>
                        <textarea
                          placeholder="例如：MATCH (n) WHERE n.code = $code RETURN n"
                          value={form.graphApiCode}
                          onChange={(e) => setForm({ ...form, graphApiCode: e.target.value })}
                          rows={8}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition font-mono text-sm text-slate-600 resize-none pointer-events-auto user-select-text"
                        />
                        <p className="text-xs text-slate-400">提供调用知识图谱 API 的 Cypher 查询模板</p>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              {/* 底部操作栏 */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                {message && (
                  <span className={`text-sm ${
                    message.type === 'success' ? 'text-green-600' : 'text-rose-600'
                  }`}>
                    {message.text}
                  </span>
                )}
                <div className="flex gap-3 ml-auto">
                  <button
                    className="px-5 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition inline-flex items-center gap-2"
                    onClick={() => {
                      setSelectedConfig(null);
                      setForm(emptyForm);
                    }}
                  >
                    <X className="w-4 h-4" />
                    取消
                  </button>
                  {selectedConfig && (
                    <button
                      className="px-5 py-2 text-sm text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors inline-flex items-center gap-2"
                      onClick={() => handleDelete(selectedConfig.id)}
                      disabled={saving}
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </button>
                  )}
                  <button
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-md shadow-blue-500/20 transition-colors flex items-center gap-2 disabled:opacity-70"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? '保存中...' : '保存配置'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ModelConfigPage;
