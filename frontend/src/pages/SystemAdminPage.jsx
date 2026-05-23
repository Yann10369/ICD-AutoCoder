/**
 * 系统管理后台页面
 * 字典版本管理、术语映射管理、审计日志查询、RLHF数据导出
 */
import { useState } from 'react';
import {
  Settings,
  BookOpen,
  Database,
  FileText,
  Search,
  Plus,
  Trash2,
  Edit,
  Download,
  RefreshCw,
  Check,
  X,
  Filter,
  Calendar,
  User,
  BarChart3,
  Zap,
  AlertCircle,
  ChevronDown,
  Eye,
  Globe,
  Server
} from 'lucide-react';
import AuditTrailTimeline from '../components/AuditTrailTimeline';

// 字典版本配置
const VERSION_CONFIG = {
  'icd10_cn_2016': { label: '国家临床版2016', year: 2016 },
  'icd10_yb_2021': { label: '医保版2021', year: 2021 },
  'icd10_bj_2023': { label: '北京版2023', year: 2023 },
};

// 术语映射模拟数据
const MOCK_MAPPINGS = [
  { id: 1, term: '老慢支', standard_code: 'J44.9', standard_description: '慢性阻塞性肺疾病', created_by: '管理员', usage_count: 156 },
  { id: 2, term: '甲流', standard_code: 'J10.1', standard_description: '甲型流感病毒感染', created_by: '管理员', usage_count: 89 },
  { id: 3, term: '心梗', standard_code: 'I21.9', standard_description: '急性心肌梗死', created_by: '张编码员', usage_count: 234 },
  { id: 4, term: '心衰', standard_code: 'I50.9', standard_description: '心力衰竭', created_by: '李编码员', usage_count: 178 },
  { id: 5, term: '糖尿病', standard_code: 'E11.9', standard_description: '2型糖尿病', created_by: '管理员', usage_count: 456 },
  { id: 6, term: '高血压', standard_code: 'I10', standard_description: '原发性高血压', created_by: '管理员', usage_count: 567 },
  { id: 7, term: '慢阻肺', standard_code: 'J44.9', standard_description: '慢性阻塞性肺疾病', created_by: '王编码员', usage_count: 123 },
  { id: 8, term: '脑梗', standard_code: 'I63.9', standard_description: '脑梗死', created_by: '管理员', usage_count: 289 },
];

function DictionaryVersionManager({ activeVersion, onSwitchVersion }) {
  const [currentVersion, setCurrentVersion] = useState(activeVersion || 'icd10_yb_2021');
  const [switching, setSwitching] = useState(false);

  const handleSwitch = (version) => {
    setSwitching(true);
    setTimeout(() => {
      setCurrentVersion(version);
      setSwitching(false);
      onSwitchVersion?.(version);
    }, 500);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4">
        <div className="flex items-center gap-2">
          <BookOpen size={20} />
          <span className="font-semibold text-lg">ICD字典版本管理</span>
        </div>
        <p className="text-sm opacity-80 mt-1">管理不同版本的ICD编码字典，支持在线切换</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Object.entries(VERSION_CONFIG).map(([key, config]) => (
            <div
              key={key}
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                currentVersion === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
              onClick={() => handleSwitch(key)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-800">{config.label}</span>
                {currentVersion === key && (
                  <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={12} />
                    当前使用
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">发布年份: {config.year}</div>
              <div className="text-sm text-gray-500">编码数量: 约10万条</div>
              {switching && currentVersion === key && (
                <div className="mt-2 text-blue-600 text-sm flex items-center gap-1">
                  <RefreshCw size={14} className="animate-spin" />
                  切换中...
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-medium text-amber-800">注意事项</p>
              <p className="text-sm text-amber-700 mt-1">
                切换字典版本会影响所有编码建议和校验逻辑。建议在非工作时间切换，切换后需要刷新页面。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TermMappingManager() {
  const [mappings, setMappings] = useState(MOCK_MAPPINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMapping, setNewMapping] = useState({
    term: '',
    standard_code: '',
    standard_description: '',
  });

  const filteredMappings = mappings.filter(
    (m) =>
      m.term.includes(searchQuery) ||
      m.standard_code.includes(searchQuery) ||
      m.standard_description.includes(searchQuery)
  );

  const handleAdd = () => {
    if (!newMapping.term || !newMapping.standard_code || !newMapping.standard_description) {
      alert('请填写完整信息');
      return;
    }
    const newItem = {
      id: mappings.length + 1,
      ...newMapping,
      created_by: '当前用户',
      usage_count: 0,
    };
    setMappings([newItem, ...mappings]);
    setShowAddModal(false);
    setNewMapping({ term: '', standard_code: '', standard_description: '' });
  };

  const handleDelete = (id) => {
    if (confirm('确定要删除这个术语映射吗？')) {
      setMappings(mappings.filter((m) => m.id !== id));
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database size={20} />
              <span className="font-semibold text-lg">术语映射管理</span>
            </div>
            <p className="text-sm opacity-80 mt-1">管理院内临床术语到标准ICD编码的映射关系</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-all"
          >
            <Plus size={16} />
            添加映射
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* 搜索栏 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索术语、编码、描述..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <span className="text-sm text-gray-500">
            共 {filteredMappings.length} 条映射
          </span>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">院内术语</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">标准编码</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">标准描述</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">使用次数</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">创建人</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMappings.map((mapping) => (
                <tr key={mapping.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {mapping.term}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">
                    {mapping.standard_code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {mapping.standard_description}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {mapping.usage_count}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {mapping.created_by}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(mapping.id)}
                      className="text-red-500 hover:text-red-600 p-1"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 添加映射弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-96 overflow-hidden">
            <div className="bg-purple-500 text-white px-6 py-4">
              <h3 className="font-semibold text-lg">添加术语映射</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  院内术语
                </label>
                <input
                  type="text"
                  value={newMapping.term}
                  onChange={(e) => setNewMapping({ ...newMapping, term: e.target.value })}
                  placeholder="如：老慢支"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标准ICD编码
                </label>
                <input
                  type="text"
                  value={newMapping.standard_code}
                  onChange={(e) => setNewMapping({ ...newMapping, standard_code: e.target.value })}
                  placeholder="如：J44.9"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标准描述
                </label>
                <input
                  type="text"
                  value={newMapping.standard_description}
                  onChange={(e) => setNewMapping({ ...newMapping, standard_description: e.target.value })}
                  placeholder="如：慢性阻塞性肺疾病"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
              >
                确定添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RlhfDataExporter() {
  const [days, setDays] = useState(30);
  const [minQuality, setMinQuality] = useState(0.5);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({
    total_samples: 1234,
    high_quality: 892,
    ai_rejected: 345,
    manual_added: 267,
    avg_quality: 0.78,
  });

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      alert('RLHF训练数据已导出！');
    }, 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4">
        <div className="flex items-center gap-2">
          <Zap size={20} />
          <span className="font-semibold text-lg">RLHF训练数据导出</span>
        </div>
        <p className="text-sm opacity-80 mt-1">导出高质量的人机交互数据用于模型优化</p>
      </div>

      <div className="p-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.total_samples}</div>
            <div className="text-xs text-gray-500">总样本数</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.high_quality}</div>
            <div className="text-xs text-gray-500">高质量样本</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.ai_rejected}</div>
            <div className="text-xs text-gray-500">AI被拒绝</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.manual_added}</div>
            <div className="text-xs text-gray-500">手动添加</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{Math.round(stats.avg_quality * 100)}%</div>
            <div className="text-xs text-gray-500">平均质量</div>
          </div>
        </div>

        {/* 导出配置 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              时间范围（天）
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              最低质量分数
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={minQuality}
              onChange={(e) => setMinQuality(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {exporting ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              正在导出...
            </>
          ) : (
            <>
              <Download size={18} />
              导出 RLHF 训练数据 (JSON格式)
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function SystemAdminPage() {
  const [activeTab, setActiveTab] = useState('dictionary');

  const tabs = [
    { id: 'dictionary', label: '字典版本', icon: <BookOpen size={16} /> },
    { id: 'mapping', label: '术语映射', icon: <Database size={16} /> },
    { id: 'audit', label: '审计日志', icon: <FileText size={16} /> },
    { id: 'rlhf', label: 'RLHF数据', icon: <Zap size={16} /> },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Settings className="text-gray-600" />
              系统管理后台
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              字典版本管理、术语映射、审计日志查询、RLHF训练数据导出
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Globe size={14} />
            <span>当前字典版本: 医保版2021</span>
          </div>
        </div>
      </div>

      {/* Tab导航 */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'dictionary' && <DictionaryVersionManager />}
        {activeTab === 'mapping' && <TermMappingManager />}
        {activeTab === 'audit' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <FileText className="text-blue-600" />
                审计日志查询
              </h2>
              <p className="text-sm text-gray-500">
                查询系统内所有操作记录，支持按操作类型、用户、时间范围筛选
              </p>
            </div>
            <AuditTrailTimeline maxHeight="600px" />
          </div>
        )}
        {activeTab === 'rlhf' && <RlhfDataExporter />}
      </div>
    </div>
  );
}
