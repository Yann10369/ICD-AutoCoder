/**
 * 质控中心页面 - 质控人员工作台
 * 待质控病历列表、对比视图、通过/打回操作
 */
import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  FileText,
  Clock,
  User,
  Activity,
  ArrowUpDown,
  RefreshCw,
  Brain,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { qaAPI } from '../services/api';

// 状态配置
const STATUS_CONFIG = {
  pending_qa: { label: '待质控', color: 'text-purple-600', bg: 'bg-purple-100', icon: <Clock size={14} /> },
  qa_rejected: { label: '已打回', color: 'text-red-600', bg: 'bg-red-100', icon: <XCircle size={14} /> },
  completed: { label: '已通过', color: 'text-green-600', bg: 'bg-green-100', icon: <CheckCircle size={14} /> },
};

// 模拟待质控数据
const MOCK_QA_LIST = [
  {
    id: 'CASE-001',
    patientName: '张三',
    coderName: '张编码员',
    submittedAt: '2024-01-20 14:30',
    codingDuration: 18,
    codeCount: 8,
    status: 'pending_qa',
    qaScore: 85,
    aiAcceptanceRate: 75,
    department: '心内科',
    diagnosis: '急性前壁心肌梗死',
  },
  {
    id: 'CASE-002',
    patientName: '李四',
    coderName: '李编码员',
    submittedAt: '2024-01-20 13:15',
    codingDuration: 22,
    codeCount: 6,
    status: 'pending_qa',
    qaScore: 78,
    aiAcceptanceRate: 60,
    department: '呼吸内科',
    diagnosis: '慢性阻塞性肺疾病急性加重',
  },
  {
    id: 'CASE-003',
    patientName: '王五',
    coderName: '王编码员',
    submittedAt: '2024-01-20 11:45',
    codingDuration: 15,
    codeCount: 10,
    status: 'pending_qa',
    qaScore: 92,
    aiAcceptanceRate: 90,
    department: '内分泌科',
    diagnosis: '2型糖尿病伴酮症',
  },
  {
    id: 'CASE-004',
    patientName: '赵六',
    coderName: '张编码员',
    submittedAt: '2024-01-19 16:30',
    codingDuration: 25,
    codeCount: 12,
    status: 'completed',
    qaScore: 88,
    aiAcceptanceRate: 82,
    department: '骨科',
    diagnosis: '腰椎间盘突出症',
  },
];

function QaListItem({ item, onSelect, selected }) {
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending_qa;

  return (
    <div
      className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
        selected ? 'ring-2 ring-purple-500 border-purple-300' : 'border-gray-200 hover:border-purple-200'
      }`}
      onClick={() => onSelect(item)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono font-semibold text-gray-700">{item.id}</span>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
            {status.icon}
            {status.label}
          </span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-purple-600">{item.qaScore}</div>
          <div className="text-xs text-gray-500">质控评分</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-medium text-gray-800">{item.patientName}</span>
          <span className="text-sm text-gray-500">{item.department}</span>
        </div>
        <div className="text-sm text-gray-600">{item.diagnosis}</div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <User size={12} />
            {item.coderName}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {item.codingDuration}分钟
          </span>
          <span className="flex items-center gap-1">
            <FileText size={12} />
            {item.codeCount}个编码
          </span>
        </div>
        <div className="text-right">
          <div className="text-gray-600">AI采纳率 {item.aiAcceptanceRate}%</div>
        </div>
      </div>
    </div>
  );
}

function QaComparisonView({ caseData, onApprove, onReject, loading }) {
  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Eye size={48} className="mb-4 opacity-50" />
        <p className="text-lg">请从左侧选择一份病历查看详情</p>
      </div>
    );
  }

  // 模拟对比数据
  const aiCodes = [
    { code: 'I21.0', description: '急性前壁心肌梗死', confidence: 95, matched: true },
    { code: 'I10', description: '原发性高血压', confidence: 90, matched: true },
    { code: 'E11.9', description: '2型糖尿病', confidence: 85, matched: false, ignored: true },
    { code: 'J44.1', description: '慢性阻塞性肺疾病急性加重', confidence: 72, matched: false },
  ];

  const coderCodes = [
    { code: 'I21.0', description: '急性前壁心肌梗死', source: 'ai' },
    { code: 'I10', description: '原发性高血压', source: 'ai' },
    { code: 'J44.1', description: '慢性阻塞性肺疾病急性加重', source: 'ai' },
    { code: 'J45.9', description: '支气管哮喘', source: 'manual' },
    { code: 'M54.5', description: '腰椎间盘突出症', source: 'manual' },
  ];

  const matchedCount = aiCodes.filter(c => c.matched).length;
  const manualCount = coderCodes.filter(c => c.source === 'manual').length;

  return (
    <div className="h-full flex flex-col">
      {/* 顶部：病例信息和操作按钮 */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-purple-600" />
              {caseData.id} - {caseData.patientName}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <User size={14} />
                编码员: {caseData.coderName}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                提交时间: {caseData.submittedAt}
              </span>
              <span className="flex items-center gap-1">
                <Activity size={14} />
                编码耗时: {caseData.codingDuration}分钟
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onReject(caseData.id)}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <XCircle size={16} />
              打回重编
            </button>
            <button
              onClick={() => onApprove(caseData.id)}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <CheckCircle size={16} />
              质控通过
            </button>
          </div>
        </div>
      </div>

      {/* 质控评分卡片 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{caseData.qaScore}</div>
              <div className="text-xs text-gray-500">质控评分</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-700">{caseData.aiAcceptanceRate}%</div>
              <div className="text-xs text-gray-500">AI采纳率</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-green-600">{matchedCount}</div>
              <div className="text-xs text-gray-500">一致编码</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-orange-600">{manualCount}</div>
              <div className="text-xs text-gray-500">手动补充</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-red-500">1</div>
              <div className="text-xs text-gray-500">AI建议忽略</div>
            </div>
          </div>
        </div>
      </div>

      {/* 对比视图 - 左右分栏 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* AI推荐 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3">
              <div className="flex items-center gap-2">
                <Brain size={18} />
                <span className="font-semibold">AI 推荐编码</span>
                <span className="ml-auto text-sm opacity-80">共 {aiCodes.length} 条</span>
              </div>
            </div>
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              {aiCodes.map((code, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    code.matched
                      ? 'bg-green-50 border-green-200'
                      : code.ignored
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-blue-700">
                          {code.code}
                        </span>
                        {code.matched && (
                          <span className="text-green-500 flex items-center gap-1 text-xs">
                            <CheckCircle size={12} />
                            已采纳
                          </span>
                        )}
                        {code.ignored && (
                          <span className="text-red-500 flex items-center gap-1 text-xs">
                            <XCircle size={12} />
                            未采纳
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{code.description}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    置信度: {code.confidence}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 编码员选择 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-3">
              <div className="flex items-center gap-2">
                <User size={18} />
                <span className="font-semibold">编码员选择</span>
                <span className="ml-auto text-sm opacity-80">共 {coderCodes.length} 条</span>
              </div>
            </div>
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              {coderCodes.map((code, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    code.source === 'ai'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-purple-700">
                          {code.code}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          code.source === 'ai' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          {code.source === 'ai' ? 'AI推荐' : '手动添加'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">{code.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 质控意见输入 */}
        <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <MessageSquare size={20} className="text-purple-500 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">质控意见（可选）</label>
              <textarea
                placeholder="请输入质控意见，如：建议补充合并症编码..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QaCenterPage() {
  const [qaList, setQaList] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending_qa');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 初始化加载
  useEffect(() => {
    loadQaList();
  }, []);

  // 加载质控列表
  const loadQaList = useCallback(async () => {
    setLoading(true);
    try {
      // 尝试调用API
      try {
        const result = await qaAPI.getQaList(filterStatus);
        setQaList(result?.data?.items || MOCK_QA_LIST);
      } catch (e) {
        // API失败使用模拟数据
        setQaList(MOCK_QA_LIST);
      }
    } catch (error) {
      console.error('加载质控列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  // 过滤列表
  const filteredList = qaList.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!item.patientName.toLowerCase().includes(query) &&
          !item.id.toLowerCase().includes(query) &&
          !item.coderName.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  // 统计数据
  const stats = {
    pending: qaList.filter(i => i.status === 'pending_qa').length,
    completed: qaList.filter(i => i.status === 'completed').length,
    rejected: qaList.filter(i => i.status === 'qa_rejected').length,
    avgScore: qaList.length > 0
      ? Math.round(qaList.reduce((sum, i) => sum + i.qaScore, 0) / qaList.length)
      : 0,
  };

  // 质控通过
  const handleApprove = useCallback(async (caseId) => {
    if (!confirm(`确定通过病例 ${caseId} 的质控吗？`)) return;

    setActionLoading(true);
    try {
      // 尝试调用API
      try {
        await qaAPI.submitQaResult(caseId, 'approve', '');
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // 更新本地状态
      setQaList(prev => prev.map(item =>
        item.id === caseId
          ? { ...item, status: 'completed' }
          : item
      ));
      setSelectedCase(null);
      alert('质控通过！');
    } catch (error) {
      console.error('质控通过失败:', error);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  }, []);

  // 打回重编
  const handleReject = useCallback(async (caseId) => {
    if (!confirm(`确定打回病例 ${caseId} 重新编码吗？`)) return;

    setActionLoading(true);
    try {
      // 尝试调用API
      try {
        await qaAPI.submitQaResult(caseId, 'reject', '');
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // 更新本地状态
      setQaList(prev => prev.map(item =>
        item.id === caseId
          ? { ...item, status: 'qa_rejected' }
          : item
      ));
      setSelectedCase(null);
      alert('已打回重编！');
    } catch (error) {
      console.error('打回失败:', error);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle className="text-purple-600" />
              质控中心
            </h1>
            <p className="text-sm text-gray-500 mt-1">待质控 {stats.pending} 份，已通过 {stats.completed} 份，平均评分 {stats.avgScore}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadQaList}
              disabled={loading}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区：左右分栏 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧列表 */}
        <div className="w-[400px] border-r border-gray-200 flex flex-col bg-white">
          {/* 筛选栏 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <Filter size={16} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">全部状态</option>
                <option value="pending_qa">待质控 ({stats.pending})</option>
                <option value="completed">已通过 ({stats.completed})</option>
                <option value="qa_rejected">已打回 ({stats.rejected})</option>
              </select>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索患者、编码员..."
                className="w-full pl-10 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 列表 */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <RefreshCw size={32} className="animate-spin mb-3" />
                <p>加载中...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FileText size={32} className="mb-3 opacity-50" />
                <p>没有找到符合条件的病历</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredList.map(item => (
                  <QaListItem
                    key={item.id}
                    item={item}
                    selected={selectedCase?.id === item.id}
                    onSelect={setSelectedCase}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧详情 */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          <QaComparisonView
            caseData={selectedCase}
            onApprove={handleApprove}
            onReject={handleReject}
            loading={actionLoading}
          />
        </div>
      </div>
    </div>
  );
}
