import React, { useEffect, useMemo, useState } from 'react';
import {
  Save,
  X,
  Server,
  Database,
  FileCode,
  CheckCircle,
  Plus,
  RefreshCcw,
  ClipboardList,
  ArrowLeft,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Folder,
  Key,
  Code,
  Package,
} from 'lucide-react';
import {
  listConfigs,
  createConfig,
  updateConfig,
  deleteConfig,
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
  // 图谱字段
  graphApiCode: '',
  graphApiKey: '',
};

const categoryOptions = [
  { value: 'small', label: '小模型' },
  { value: 'large', label: '大模型' },
  { value: 'graph', label: '图谱数据' },
];

const categoryLabels = {
  small: '小模型',
  large: '大模型',
  graph: '图谱数据',
};

const categoryColors = {
  small: 'text-blue-600 bg-blue-50 border-blue-100',
  large: 'text-purple-600 bg-purple-50 border-purple-100',
  graph: 'text-green-600 bg-green-50 border-green-100',
};

const categoryHeaderColors = {
  small: 'bg-blue-50 text-blue-700 border-blue-200',
  large: 'bg-purple-50 text-purple-700 border-purple-200',
  graph: 'bg-green-50 text-green-700 border-green-200',
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
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({
    small: true,
    large: true,
    graph: true,
  });

  // 按分类分组配置
  const groupedConfigs = useMemo(() => {
    const groups = {
      small: [],
      large: [],
      graph: [],
    };
    configs.forEach((cfg) => {
      const category = cfg.category || 'small'; // 默认归类为小模型
      if (groups[category]) {
        groups[category].push(cfg);
      } else {
        groups.small.push(cfg); // 未知分类默认归为小模型
      }
    });
    // 每个分类内按更新时间排序
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    });
    return groups;
  }, [configs]);

  const sortedConfigs = useMemo(
    () => [...configs].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [configs]
  );

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
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
      setConfigs([]); // 确保设置为空数组
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 进入页面时立即加载配置
    console.log('ModelConfigPage 组件已挂载，开始加载配置');
    loadConfigs();
  }, []);

  const handleSelect = (cfg) => {
    setEditingId(cfg.id);
    const category = cfg.category || 'small';
    setForm({
      name: cfg.name || '',
      category: category,
      status: cfg.status || 'unknown',
      // 大模型字段
      apiKey: cfg.apiKey || '',
      exampleCode: cfg.exampleCode || '',
      // 小模型字段
      dockerImage: cfg.dockerImage || '',
      // 图谱字段
      graphApiCode: cfg.graphApiCode || '',
      graphApiKey: cfg.graphApiKey || '',
    });
  };

  const handleCreateNew = (category = null) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      category: category || emptyForm.category,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确认删除该配置？')) return;
    try {
      await deleteConfig(id);
      showMessage('success', '删除成功');
      if (editingId === id) {
        handleCreateNew();
      }
      loadConfigs();
    } catch (err) {
      showMessage('error', err.message || '删除失败');
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
      // 小模型：需要 dockerImage
      if (!form.dockerImage) {
        errorMsg = '请填写模型 Docker 镜像';
      } else {
        isValid = true;
      }
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
      let result;
      if (editingId) {
        result = await updateConfig(editingId, form);
      } else {
        result = await createConfig(form);
        setEditingId(result?.id || null);
      }
      // 保存后更新表单
      setForm({
        name: result.name || form.name,
        category: result.category || form.category || 'small',
        status: result.status || 'unknown',
        apiKey: result.apiKey || form.apiKey || '',
        exampleCode: result.exampleCode || form.exampleCode || '',
        dockerImage: result.dockerImage || form.dockerImage || '',
        graphApiCode: result.graphApiCode || form.graphApiCode || '',
        graphApiKey: result.graphApiKey || form.graphApiKey || '',
      });
      showMessage('success', '保存成功');
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

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-slate-800">
      {/* 顶部 Header */}
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">模型服务编排</h1>
            <p className="text-gray-500 text-sm mt-1">管理 AI 模型的加载路径与知识图谱关联</p>
          </div>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition shadow-sm inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建配置
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 列表区 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              配置列表
            </div>
            <button
              onClick={loadConfigs}
              className="text-xs text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
              disabled={loading}
            >
              <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> 刷新
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs text-slate-500">正在加载模型配置...</p>
              </div>
            ) : sortedConfigs.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-500 mb-2">暂无配置</p>
                <p className="text-xs text-slate-400">点击右上角"新建配置"创建模型配置</p>
              </div>
            ) : (
              Object.entries(groupedConfigs).map(([category, categoryConfigs]) => {
                if (categoryConfigs.length === 0) return null;
              const isExpanded = expandedCategories[category];
              const headerColor = categoryHeaderColors[category] || categoryHeaderColors.small;
              return (
                <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* 分类标题栏 */}
                  <div
                    className={`px-3 py-2 cursor-pointer hover:opacity-90 transition flex items-center justify-between border-b ${headerColor}`}
                    onClick={() => toggleCategory(category)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <Folder className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {categoryLabels[category]}
                      </span>
                      <span className="text-xs opacity-70">({categoryConfigs.length})</span>
                    </div>
                    <button
                      className="text-xs px-2 py-1 rounded hover:bg-white/50 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateNew(category);
                      }}
                      title={`在${categoryLabels[category]}中新建配置`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  {/* 分类下的配置列表 */}
                  {isExpanded && (
                    <div className="space-y-2 p-2">
                      {categoryConfigs.map((cfg) => (
                        <div
                          key={cfg.id}
                          className={`border rounded-xl p-3 hover:border-indigo-200 transition cursor-pointer ${
                            editingId === cfg.id
                              ? 'border-indigo-300 bg-indigo-50/30'
                              : 'border-slate-200'
                          }`}
                          onClick={() => handleSelect(cfg)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-slate-900">{cfg.name}</div>
                            {renderStatus(cfg)}
                          </div>
                          {category === 'large' && (
                            <div className="text-xs text-slate-500 mt-1">
                              API Key: {cfg.apiKey ? '***' + cfg.apiKey.slice(-4) : '未设置'}
                            </div>
                          )}
                          {category === 'small' && (
                            <div className="text-xs text-slate-500 mt-1 break-all">
                              Docker: {cfg.dockerImage || '未设置'}
                            </div>
                          )}
                          {category === 'graph' && (
                            <div className="text-xs text-slate-500 mt-1">
                              API Key: {cfg.graphApiKey ? '***' + cfg.graphApiKey.slice(-4) : '未设置'}
                            </div>
                          )}
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              className="text-xs text-slate-500 hover:text-rose-600 inline-flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(cfg.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" /> 删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
              })
            )}
          </div>
        </div>

        {/* 表单区 */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-lg">
              <Server className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {editingId ? '编辑配置' : `新建${categoryLabels[form.category || 'small']}配置`}
              </h2>
              <p className="text-xs text-slate-500">
                {form.category === 'large' && '配置大模型 API 密钥和调用方式'}
                {form.category === 'small' && '配置小模型 Docker 镜像信息'}
                {form.category === 'graph' && '配置知识图谱 API 调用信息'}
              </p>
            </div>
            {editingId && (
              <span className="ml-auto text-xs text-slate-500">ID: {editingId.slice(0, 8)}...</span>
            )}
          </div>

          <div className="p-8 space-y-8">
            {/* 基础信息 */}
            <section>
              <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wider">基础信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">分类</label>
                  <select
                    value={form.category || 'small'}
                    onChange={(e) => {
                      const newCategory = e.target.value;
                      // 如果正在编辑，保留当前数据；如果是新建，重置表单
                      if (editingId) {
                        // 编辑模式：只更新分类，保留其他字段
                        setForm({
                          ...form,
                          category: newCategory,
                        });
                      } else {
                        // 新建模式：重置为对应分类的空表单
                        setForm({
                          ...emptyForm,
                          category: newCategory,
                          name: form.name, // 保留名称
                        });
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400">选择配置分类</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">实例名称</label>
                  <input
                    type="text"
                    placeholder="例如：GPT-4-生产环境 / 小模型-V1 / 知识图谱-主库"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                  />
                  <p className="text-xs text-gray-400">配置实例的唯一标识名称</p>
                </div>
              </div>
            </section>

            <hr className="border-gray-50" />

            {/* 根据分类显示不同的配置字段 */}
            {form.category === 'large' && (
              <section>
                <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wider">大模型配置</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-400" />
                      API Key
                    </label>
                    <input
                      type="password"
                      placeholder="输入大模型 API Key"
                      value={form.apiKey}
                      onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400">用于调用大模型服务的 API 密钥</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Code className="w-4 h-4 text-gray-400" />
                      调用示例代码
                    </label>
                    <textarea
                      placeholder="例如：import openai&#10;openai.api_key = 'your-api-key'&#10;response = openai.ChatCompletion.create(...)"
                      value={form.exampleCode}
                      onChange={(e) => setForm({ ...form, exampleCode: e.target.value })}
                      rows={8}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition font-mono text-sm text-gray-600 resize-none"
                    />
                    <p className="text-xs text-gray-400">提供调用该大模型的示例代码或配置说明</p>
                  </div>
                </div>
              </section>
            )}

            {form.category === 'small' && (
              <section>
                <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wider">小模型配置</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      模型 Docker 镜像
                    </label>
                    <input
                      type="text"
                      placeholder="例如：registry.example.com/models/small-model:v1.0.0"
                      value={form.dockerImage}
                      onChange={(e) => setForm({ ...form, dockerImage: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition font-mono text-sm text-gray-600"
                    />
                    <p className="text-xs text-gray-400">小模型服务的 Docker 镜像地址</p>
                  </div>
                </div>
              </section>
            )}

            {form.category === 'graph' && (
              <section>
                <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wider">图谱数据配置</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-400" />
                      API Key
                    </label>
                    <input
                      type="password"
                      placeholder="输入知识图谱 API Key"
                      value={form.graphApiKey}
                      onChange={(e) => setForm({ ...form, graphApiKey: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400">用于调用知识图谱服务的 API 密钥</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Code className="w-4 h-4 text-gray-400" />
                      图谱 API 调用代码
                    </label>
                    <textarea
                      placeholder="例如：from neo4j import GraphDatabase&#10;driver = GraphDatabase.driver(uri, auth=(&quot;neo4j&quot;, &quot;password&quot;))&#10;session = driver.session()"
                      value={form.graphApiCode}
                      onChange={(e) => setForm({ ...form, graphApiCode: e.target.value })}
                      rows={8}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition font-mono text-sm text-gray-600 resize-none"
                    />
                    <p className="text-xs text-gray-400">提供调用知识图谱 API 的示例代码或配置说明</p>
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            {message && (
              <span
                className={`text-sm ${
                  message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {message.text}
              </span>
            )}
            <div className="flex justify-end gap-3 ml-auto">
              <button
                className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition inline-flex items-center gap-2"
                onClick={handleCreateNew}
              >
                <X className="w-4 h-4" />
                取消
              </button>
              <button
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-md shadow-indigo-500/20 transition flex items-center gap-2 disabled:opacity-70"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存配置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelConfigPage;
