/**
 * 工作队列中心 - 编码员日常工作台入口
 * 按优先级、紧急程度展示待编码病历，支持领取/释放/跳转操作
 */
import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Clock,
  AlertTriangle,
  Filter,
  Search,
  User,
  Calendar,
  Activity,
  CheckCircle,
  Hourglass,
  ArrowUpDown,
  Building2,
  ExternalLink,
  RefreshCw,
  LogOut,
  Zap,
  Sparkles
} from 'lucide-react';
import { worklistAPI } from '../services/api';
import { TEST_CASES } from '../data/testCases';
import { useAuth } from '../contexts/AuthContext';

// 优先级配置
const PRIORITY_CONFIG = {
  urgent: { label: '紧急', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: <AlertTriangle size={12} /> },
  high: { label: '高', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: <Clock size={12} /> },
  normal: { label: '正常', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: <Activity size={12} /> },
  low: { label: '低', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: <FileText size={12} /> },
};

// 状态配置
const STATUS_CONFIG = {
  pending: { label: '待编码', color: 'text-gray-600', bg: 'bg-gray-100', icon: <Hourglass size={14} /> },
  coding: { label: '编码中', color: 'text-blue-600', bg: 'bg-blue-100', icon: <Activity size={14} /> },
  quality_check: { label: '质控中', color: 'text-purple-600', bg: 'bg-purple-100', icon: <CheckCircle size={14} /> },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100', icon: <CheckCircle size={14} /> },
};

// 科室列表
const DEPARTMENTS = ['全部科室', '心内科', '呼吸内科', '内分泌科', '骨科', '急诊科', '普外科', '神经内科', '肾内科'];

// 当前用户模拟（实际应从 useAuth 获取）
const CURRENT_USER_OBJ = {
  id: 1,
  name: '张编码员',
  role: 'coder'  // coder | admin | auditor
};

function WorklistCard({ item, onSelect, selected, onClaim, onRelease, onOpen, currentUser, loadingAction }) {
  const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal;
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const isLoading = loadingAction === item.id;

  // 计算距离截止日的天数
  const daysToDeadline = Math.ceil((new Date(item.drgDeadline) - new Date()) / (1000 * 60 * 60 * 24));
  const isNearDeadline = daysToDeadline <= 3;

  const isMyCase = item.assignee === currentUser;
  const canClaim = item.status === 'pending' && !item.assignee;
  const canRelease = isMyCase && item.status === 'coding';

  return (
    <div
      className={`p-4 rounded-xl border transition-all hover:shadow-md ${
        selected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200 hover:border-blue-200'
      }`}
      onClick={() => onSelect(item)}
    >
      {/* 顶部：病例ID和优先级 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-gray-700">{item.id}</span>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${priority.bg} ${priority.color} ${priority.border}`}>
            {priority.icon}
            {priority.label}
          </span>
          {isNearDeadline && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 flex items-center gap-1 animate-pulse">
              <Clock size={10} />
              距截止{daysToDeadline}天
            </span>
          )}
        </div>
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
          {status.icon}
          {status.label}
        </span>
      </div>

      {/* 患者信息 */}
      <div className="mb-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-medium text-gray-800">{item.patientName}</span>
          <span className="text-sm text-gray-500">{item.age}岁 {item.gender}</span>
        </div>
        <div className="text-sm text-gray-600 mb-1">
          <span className="inline-flex items-center gap-1">
            <Building2 size={12} />
            {item.department}
          </span>
          <span className="mx-2 text-gray-300">|</span>
          <span className="inline-flex items-center gap-1">
            <Activity size={12} />
            {item.diagnosis}
          </span>
        </div>
      </div>

      {/* 底部：日期、时间、指派人、操作按钮 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            出院：{item.dischargeDate}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {item.assignee && (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
              isMyCase ? 'bg-blue-100 text-blue-600' : 'bg-purple-50 text-purple-600'
            }`}>
              <User size={12} />
              {isMyCase ? '我' : item.assignee}
            </span>
          )}
          {item.hasNotes && (
            <span className="text-amber-500" title="有备注信息">📝</span>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
            {canClaim && (
              <button
                onClick={() => onClaim(item.id)}
                disabled={isLoading}
                className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded text-xs transition-all disabled:opacity-50"
              >
                {isLoading ? <Clock size={12} className="animate-spin" /> : <User size={12} />}
                领取
              </button>
            )}
            {canRelease && (
              <button
                onClick={() => onRelease(item.id)}
                disabled={isLoading}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded text-xs transition-all disabled:opacity-50"
              >
                <LogOut size={12} />
                释放
              </button>
            )}
            {isMyCase && (
              <button
                onClick={() => onOpen(item.id)}
                className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-600 hover:bg-green-200 rounded text-xs transition-all"
              >
                <ExternalLink size={12} />
                开始编码
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, trend }) {
  return (
    <div className={`p-4 rounded-xl ${color.bg} border ${color.border}`}>
      <div className="flex items-start justify-between mb-2">
        <span className={`${color.text} opacity-80`}>{icon}</span>
        {trend !== undefined && (
          <span className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold ${color.text} mb-1`}>{value}</div>
      <div className="text-xs text-gray-600">{title}</div>
    </div>
  );
}

export default function WorklistPage({ onNavigateToCase, onBatchCoding }) {
  const { user } = useAuth();
  const [worklist, setWorklist] = useState([]);
  const [selectedCases, setSelectedCases] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  // 默认按用户所属科室过滤（admin除外），普通用户默认显示全部科室
  const [filterDepartment, setFilterDepartment] = useState('全部科室');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('priority');
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);

  // 管理员视图：按科室分组的展开状态
  const isAdmin = user?.role === 'admin';
  const [expandedDepartments, setExpandedDepartments] = useState({});

  // 是否显示管理员分组视图
  const showGroupedView = isAdmin && filterDepartment === '全部科室' && !searchQuery && !loading;

  // 切换科室展开/折叠
  const toggleDepartment = (dept) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [dept]: !prev[dept]
    }));
  };

  // 展开所有科室
  const expandAllDepartments = () => {
    if (!showGroupedView || filteredDepartments.length === 0) return;
    const allExpanded = {};
    filteredDepartments.forEach(dept => {
      allExpanded[dept.department] = true;
    });
    setExpandedDepartments(allExpanded);
  };

  // 折叠所有科室
  const collapseAllDepartments = () => {
    setExpandedDepartments({});
  };

  // 加载工作队列 - 必须定义在 useEffect 之前，因为 useEffect 依赖它
  const loadWorklist = useCallback(async () => {
    setLoading(true);
    try {
      // 尝试调用API，如果失败则使用模拟数据
      let data;
      try {
        // 医生按科室过滤，admin和coder看全部
        const filters = {};
        if (user?.role === 'doctor' && user?.department) {
          filters.department = user.department;
        }
        const result = await worklistAPI.list(filters);
        data = result?.data?.items || [];
      } catch (apiError) {
        console.log('API不可用，使用模拟数据');
        data = TEST_CASES.map((tc, idx) => ({
          id: tc.case_id || tc.id,
          patientName: tc.patient_name || tc.patientName,
          age: tc.age,
          gender: tc.gender,
          admissionDate: tc.admission_date || tc.admissionDate,
          dischargeDate: tc.discharge_date || tc.dischargeDate,
          department: tc.department,
          diagnosis: Array.isArray(tc.diagnosis) ? tc.diagnosis[0] : tc.diagnosis,
          priority: tc.priority || ['urgent', 'high', 'normal', 'low'][idx % 4],
          status: ['pending', 'pending', 'coding', 'quality_check'][idx % 4],
          assignee: null,
          drgDeadline: tc.discharge_date || tc.dischargeDate,
          estimatedTime: 15 + idx * 5,
          hasNotes: idx % 2 === 0,
        }));
      }
      setWorklist(data);
    } catch (error) {
      console.error('加载工作队列失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 初始化：加载测试数据（模拟API返回）
  useEffect(() => {
    loadWorklist();
  }, [loadWorklist]);

  // 过滤和排序
  const filteredList = worklist.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
    if (filterDepartment !== '全部科室' && item.department !== filterDepartment) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!item.patientName.toLowerCase().includes(query) &&
          !item.id.toLowerCase().includes(query) &&
          !item.diagnosis.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'deadline':
        return new Date(a.drgDeadline) - new Date(b.drgDeadline);
      case 'admission':
        return new Date(b.admissionDate) - new Date(a.admissionDate);
      default:
        return 0;
    }
  });

  // 管理员视图：按科室分组
  const filteredDepartments = showGroupedView
    ? Object.entries(
        filteredList.reduce((acc, item) => {
          const dept = item.department || '未知科室';
          if (!acc[dept]) acc[dept] = [];
          acc[dept].push(item);
          return acc;
        }, {})
      )
        .map(([department, items]) => ({
          department,
          count: items.length,
          items: items.sort((a, b) => {
            const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          })
        }))
        .sort((a, b) => b.count - a.count) // 按数量降序
    : [];

  // 统计数据
  const stats = {
    total: worklist.length,
    pending: worklist.filter(i => i.status === 'pending').length,
    coding: worklist.filter(i => i.status === 'coding').length,
    urgent: worklist.filter(i => i.priority === 'urgent').length,
  };

  // 选择病例
  const handleSelectCase = (item) => {
    if (selectedCases.includes(item.id)) {
      setSelectedCases(selectedCases.filter(id => id !== item.id));
    } else {
      setSelectedCases([...selectedCases, item.id]);
    }
  };

  // 领取单个病例
  const handleClaimCase = useCallback(async (caseId) => {
    setLoadingAction(caseId);
    try {
      await worklistAPI.claim(caseId, CURRENT_USER_OBJ.id);
      // 重新从服务器加载最新数据
      await loadWorklist();
      setSelectedCases(prev => prev.filter(id => id !== caseId));
      console.log(`已领取病例: ${caseId}`);
    } catch (error) {
      console.error('领取失败:', error);
      alert(error.message || '领取失败，请重试');
    } finally {
      setLoadingAction(null);
    }
  }, [loadWorklist]);

  // 释放病例
  const handleReleaseCase = useCallback(async (caseId) => {
    setLoadingAction(caseId);
    try {
      // 尝试调用API
      try {
        await worklistAPI.release(caseId, user?.id || 1);
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 更新本地状态
      setWorklist(prev => prev.map(item =>
        item.id === caseId
          ? { ...item, status: 'pending', assignee: null }
          : item
      ));
      console.log(`已释放病例: ${caseId}`);
    } catch (error) {
      console.error('释放失败:', error);
      alert('释放失败，请重试');
    } finally {
      setLoadingAction(null);
    }
  }, []);

  // 打开病例（跳转到编码工作台）
  const handleOpenCase = useCallback((caseId) => {
    console.log('[NAV-FLOW-0] handleOpenCase 触发', { caseId, 当前页面: 'worklist' });
    if (onNavigateToCase) {
      console.log('[NAV-FLOW-0b] 调用 onNavigateToCase');
      onNavigateToCase(caseId);
    } else {
      // 默认跳转到编码工作台
      alert(`即将跳转到病例 ${caseId} 编码工作台`);
    }
  }, [onNavigateToCase]);

  // 批量领取
  const handleBatchAssign = useCallback(async () => {
    if (selectedCases.length === 0) return;

    if (!confirm(`确定领取这 ${selectedCases.length} 份病历吗？`)) return;

    setLoading(true);
    try {
      // 逐个调用API领取
      const results = await Promise.all(
        selectedCases.map(caseId => worklistAPI.claim(caseId, CURRENT_USER_OBJ.id))
      );
      // 检查是否有失败
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        alert(`部分病历领取失败: ${errors.map(e => e.error).join(', ')}`);
      }
      // 重新从服务器加载最新数据
      await loadWorklist();
      setSelectedCases([]);
      alert(`成功领取 ${selectedCases.length - errors.length} 份病历！`);
    } catch (error) {
      console.error('批量领取失败:', error);
      alert('批量领取失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [selectedCases, loadWorklist]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-blue-600" />
              病例管理
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {showGroupedView
                ? `共 ${filteredDepartments.length} 个科室 ${filteredList.length} 份病历`
                : `共 ${filteredList.length} 份待编码病历`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadWorklist}
              disabled={loading}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
            <button
              onClick={handleBatchAssign}
              disabled={selectedCases.length === 0 || loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <User size={16} />
              批量认领 ({selectedCases.length})
            </button>
            <button
              onClick={() => onBatchCoding && onBatchCoding(selectedCases.map(c => c.id))}
              disabled={selectedCases.length === 0 || loading}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <Sparkles size={16} />
              开始批量编码 ({selectedCases.length})
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="px-6 py-4 grid grid-cols-4 gap-4">
        <StatCard
          title="待编码总数"
          value={stats.total}
          icon={<FileText size={20} />}
          color={{ text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' }}
          trend={5}
        />
        <StatCard
          title="待认领"
          value={stats.pending}
          icon={<Hourglass size={20} />}
          color={{ text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100' }}
          trend={-2}
        />
        <StatCard
          title="编码中"
          value={stats.coding}
          icon={<Activity size={20} />}
          color={{ text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' }}
          trend={3}
        />
        <StatCard
          title="紧急病历"
          value={stats.urgent}
          icon={<AlertTriangle size={20} />}
          color={{ text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' }}
          trend={1}
        />
      </div>

      {/* 筛选和搜索栏 */}
      <div className="px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 状态筛选 */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">全部状态</option>
                <option value="pending">待编码</option>
                <option value="coding">编码中</option>
                <option value="quality_check">质控中</option>
                <option value="completed">已完成</option>
              </select>
            </div>

            {/* 优先级筛选 */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部优先级</option>
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="normal">正常</option>
              <option value="low">低</option>
            </select>

            {/* 科室筛选 */}
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            {/* 排序 */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="priority">按优先级</option>
                <option value="deadline">按截止日期</option>
                <option value="admission">按入院日期</option>
              </select>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索病历号、患者姓名、诊断..."
              className="w-full pl-10 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* 列表区域 - 可滚动 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <RefreshCw size={48} className="mb-4 animate-spin" />
            <p className="text-lg">加载中...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText size={48} className="mb-4 opacity-50" />
            <p className="text-lg">没有找到符合条件的病历</p>
            <p className="text-sm">尝试调整筛选条件或搜索关键词</p>
          </div>
        ) : showGroupedView ? (
          // 管理员视图：按科室分组展示
          <div className="space-y-4">
            {/* 分组操作栏 */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-sm text-gray-500">
                共 {filteredDepartments.length} 个科室，{filteredList.length} 份病历
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAllDepartments}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  全部展开
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={collapseAllDepartments}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  全部折叠
                </button>
              </div>
            </div>

            {/* 科室分组列表 */}
            {filteredDepartments.map(({ department, count, items }) => (
              <div key={department} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                {/* 科室标题栏 */}
                <button
                  onClick={() => toggleDepartment(department)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 size={18} className="text-blue-600" />
                    <span className="font-medium text-gray-800">{department}</span>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      {count} 份
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {count > 0 && (
                      <span className="text-xs text-gray-500">
                        待编码: {items.filter(i => i.status === 'pending').length}
                      </span>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedDepartments[department] ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* 科室内的病例列表 */}
                {expandedDepartments[department] && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    {items.map(item => (
                      <WorklistCard
                        key={item.id}
                        item={item}
                        selected={selectedCases.includes(item.id)}
                        onSelect={handleSelectCase}
                        onClaim={handleClaimCase}
                        onRelease={handleReleaseCase}
                        onOpen={handleOpenCase}
                        currentUser={CURRENT_USER_OBJ.name}
                        loadingAction={loadingAction}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // 普通用户视图：扁平列表
          <div className="grid gap-4">
            {filteredList.map(item => (
              <WorklistCard
                key={item.id}
                item={item}
                selected={selectedCases.includes(item.id)}
                onSelect={handleSelectCase}
                onClaim={handleClaimCase}
                onRelease={handleReleaseCase}
                onOpen={handleOpenCase}
                currentUser={CURRENT_USER_OBJ.name}
                loadingAction={loadingAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>显示 {filteredList.length} 条记录，共 {worklist.length} 条</span>
          <div className="flex items-center gap-4">
            <span>已选择 {selectedCases.length} 条</span>
            <span>上次刷新: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
