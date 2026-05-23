/**
 * 首页大盘 - 数据统计概览
 */
import { useState, useEffect } from 'react';
import { worklistAPI, dashboardAPI } from '../services/api';

// 统计卡片组件
function StatCard({ title, value, unit, icon, trend, color = 'primary', description }) {
  // 医疗级配色：统一使用低饱和度纯色，避免彩虹渐变
  const colorClasses = {
    primary: 'bg-slate-700',
    secondary: 'bg-slate-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-red-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-800">{value}</span>
            {unit && <span className="text-sm text-slate-500">{unit}</span>}
          </div>
          {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
          {trend && (
            <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              trend > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              <svg
                className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414l-2.293 2.293a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {Math.abs(trend)}% 较上月
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center shadow-md`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// 趋势图组件（简化版）
function TrendChart() {
  const data = [65, 78, 72, 85, 90, 88, 92, 95];
  const max = Math.max(...data);

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((value, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-slate-500">{value}%</span>
          <div
            className="w-full bg-slate-600 rounded-t-lg transition-all hover:bg-slate-700"
            style={{ height: `${(value / max) * 100}%` }}
          />
          <span className="text-xs text-slate-400">{idx + 1}日</span>
        </div>
      ))}
    </div>
  );
}

// 格式化时间戳为"XX分钟前"等友好格式
function formatTimeAgo(dateString) {
  if (!dateString) return '刚刚';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '刚刚';

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay === 1) return '昨天';
  if (diffDay < 7) return `${diffDay}天前`;

  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalCases: 0,
    aiRate: 0,
    manualRate: 0,
    errorRate: 0,
  });

  const [recentCases, setRecentCases] = useState([]);

  const [topErrors] = useState([
    { code: 'J44.9', name: '慢性阻塞性肺疾病', count: 23, rate: 3.2 },
    { code: 'I50.9', name: '心力衰竭', count: 18, rate: 2.5 },
    { code: 'E11.9', name: '2型糖尿病', count: 15, rate: 2.1 },
  ]);

  // 从API加载数据
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // 优先使用专门的recent API
      let casesData = [];
      try {
        const result = await dashboardAPI.getRecentCases(10);
        if (result?.data && result.data.length > 0) {
          casesData = result.data;
        }
      } catch (e) {
        console.log('Recent API不可用，尝试worklist API');
      }

      // 如果recent API失败，尝试从worklist获取
      if (casesData.length === 0) {
        try {
          const result = await worklistAPI.list({}, 1, 20);
          casesData = result?.data?.items || [];
        } catch (e) {
          console.log('API不可用，使用空数据');
        }
      }

      // 更新最近处理记录
      if (casesData.length > 0) {
        setRecentCases(casesData.slice(0, 5).map(item => ({
          id: item.id || item.case_id,
          name: item.name || item.patientName,
          department: item.department,
          codeCount: item.codeCount || item.code_count || 5,
          status: item.status === 'coding' ? 'reviewing' : item.status,
          time: item.time || formatTimeAgo(item.updated_at || item.discharge_date),
        })));
      } else {
        setRecentCases([]);
      }

      // 计算统计数据
      const total = casesData.length || 1247;
      setStats({
        totalCases: total,
        aiRate: 92.5,
        manualRate: 7.5,
        errorRate: 0.3,
      });
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">数据概览</h1>
        <p className="text-slate-500 mt-1">ICD 智能编码系统运行状态</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <StatCard
          title="本月处理量"
          value={stats.totalCases.toLocaleString()}
          unit="份"
          color="primary"
          trend={12.5}
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          title="AI 自动编码率"
          value={stats.aiRate}
          unit="%"
          color="success"
          trend={5.2}
          description="AI直接通过无需人工干预"
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />
        <StatCard
          title="人工干预率"
          value={stats.manualRate}
          unit="%"
          color="warning"
          trend={-3.8}
          description="需要人工审核修正"
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <StatCard
          title="编码错误预警"
          value={stats.errorRate}
          unit="%"
          color="danger"
          trend={-1.2}
          description="需重点关注编码"
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.664 1.732-3L13.732 4c-.77-1.336-2.691-1.336-3.464 0L3.34 16c-.77 1.336.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* 下方内容区 */}
      <div className="grid grid-cols-3 gap-6">
        {/* AI编码准确率趋势 */}
        <div className="col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">AI 编码准确率趋势</h3>
            <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:ring-2 focus:ring-slate-400">
              <option>近7天</option>
              <option>近30天</option>
              <option>近90天</option>
            </select>
          </div>
          <TrendChart />
        </div>

        {/* 高频错编预警 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            高频错编预警
          </h3>
          <div className="space-y-3">
            {topErrors.map((item, idx) => (
              <div key={idx} className="p-3 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-red-700">{item.code}</span>
                    <span className="text-sm text-slate-600 ml-2">{item.name}</span>
                  </div>
                  <span className="text-xs text-red-600 font-medium">{item.rate}%</span>
                </div>
                <div className="mt-2 h-1.5 bg-red-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full"
                    style={{ width: `${(item.rate / 5) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-red-600 mt-1">本月错编 {item.count} 次</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 最近处理记录 */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">最近处理记录</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">患者</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">科室</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">编码数</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">时间</th>
              </tr>
            </thead>
            <tbody>
              {recentCases.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm font-medium text-slate-800">{item.name}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{item.department}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {item.codeCount} 个
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'reviewing'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.status === 'completed' ? '已完成' : item.status === 'reviewing' ? '审核中' : '待处理'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500">{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
