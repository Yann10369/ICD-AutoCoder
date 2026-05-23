/**
 * 系统设置页面
 * 根据用户角色显示不同的设置项
 * - 管理员：全部设置项
 * - 医生：仅个人设置（通知、外观）
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Settings,
  Users,
  BookOpen,
  FileText,
  Shield,
  Database,
  Bell,
  Palette,
  Save,
  RotateCcw,
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Eye
} from 'lucide-react';

// 管理员可用的菜单
const ADMIN_MENU_ITEMS = [
  { id: 'users', label: '用户管理', icon: <Users size={18} /> },
  { id: 'dictionary', label: '字典管理', icon: <BookOpen size={18} /> },
  { id: 'system', label: '系统配置', icon: <Shield size={18} /> },
  { id: 'logs', label: '操作日志', icon: <FileText size={18} /> },
  { id: 'notifications', label: '通知设置', icon: <Bell size={18} /> },
  { id: 'appearance', label: '界面外观', icon: <Palette size={18} /> },
];

// 编码员可用的菜单（个人设置 + 编码相关）
const CODER_MENU_ITEMS = [
  { id: 'notifications', label: '通知设置', icon: <Bell size={18} /> },
  { id: 'coding_pref', label: '编码偏好', icon: <Settings size={18} /> },
  { id: 'appearance', label: '界面外观', icon: <Palette size={18} /> },
];

// 医生可用的菜单（仅个人设置）
const DOCTOR_MENU_ITEMS = [
  { id: 'notifications', label: '通知设置', icon: <Bell size={18} /> },
  { id: 'appearance', label: '界面外观', icon: <Palette size={18} /> },
];

// 根据角色获取菜单
const getMenuItems = (role) => {
  if (role === 'admin') return ADMIN_MENU_ITEMS;
  if (role === 'coder') return CODER_MENU_ITEMS;
  // 医生、质控员、viewer 等显示个人设置
  return DOCTOR_MENU_ITEMS;
};

function UsersPanel() {
  const [users, setUsers] = useState([
    { id: 1, username: 'admin', full_name: '系统管理员', role: 'admin', email: 'admin@hospital.com', status: 'active', created_at: '2023-10-01' },
    { id: 2, username: 'coder01', full_name: '张编码员', role: 'coder', email: 'coder01@hospital.com', status: 'active', created_at: '2023-11-15' },
    { id: 3, username: 'coder02', full_name: '李编码员', role: 'coder', email: 'coder02@hospital.com', status: 'active', created_at: '2023-12-01' },
    { id: 4, username: 'qa01', full_name: '王质控员', role: 'qa_officer', email: 'qa01@hospital.com', status: 'active', created_at: '2023-12-10' },
    { id: 5, username: 'doctor01', full_name: '赵医生', role: 'doctor', email: 'doctor01@hospital.com', status: 'inactive', created_at: '2024-01-05' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  const roleLabels = {
    admin: '管理员',
    coder: '编码员',
    qa_officer: '质控员',
    doctor: '医生',
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">用户列表</h2>
        <button className="px-3 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-1">
          <Plus size={14} />
          添加用户
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索用户名或姓名..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">用户名</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">姓名</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">角色</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">邮箱</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">状态</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">创建时间</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                      <User size={14} className="text-slate-500" />
                    </div>
                    <span className="font-medium text-slate-700">{user.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{user.full_name}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                    {roleLabels[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 text-sm">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 text-xs ${
                    user.status === 'active' ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                    {user.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {user.status === 'active' ? '正常' : '禁用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-sm">{user.created_at}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
                      <Edit size={14} />
                    </button>
                    <button className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DictionaryPanel() {
  const [dicts] = useState([
    { id: 'icd10', name: 'ICD-10 疾病编码', version: '2024版', count: 28567, last_update: '2024-01-15' },
    { id: 'icd9cm3', name: 'ICD-9-CM-3 手术编码', version: '2023版', count: 4589, last_update: '2023-12-01' },
    { id: 'departments', name: '科室字典', version: 'v1.2', count: 42, last_update: '2024-01-10' },
    { id: 'drugs', name: '药品字典', version: '2024Q1', count: 12580, last_update: '2024-01-08' },
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">字典管理</h2>
        <button className="px-3 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-1">
          <Database size={14} />
          导入字典
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {dicts.map((dict) => (
          <div key={dict.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{dict.name}</h3>
                <p className="text-sm text-slate-500 mt-1">ID: {dict.id}</p>
              </div>
              <button className="flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded text-sm transition-colors">
                <Eye size={14} />
                查看
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold text-slate-700">{dict.count.toLocaleString()}</div>
                <div className="text-xs text-slate-500">条目数</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-sm font-medium text-slate-700">{dict.version}</div>
                <div className="text-xs text-slate-500">版本</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-sm font-medium text-slate-700">{dict.last_update}</div>
                <div className="text-xs text-slate-500">更新时间</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemConfigPanel() {
  const [config, setConfig] = useState({
    max_qa_cases_per_day: 50,
    auto_qa_threshold: 0.95,
    coding_timeout_minutes: 30,
    enable_drg_recommendation: true,
    enable_code_validation: true,
    enable_audit_log: true,
    default_model: 'hybrid',
    backup_frequency: 'daily',
  });

  const handleSave = () => {
    alert('配置已保存！');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">系统配置</h2>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors flex items-center gap-1">
            <RotateCcw size={14} />
            重置
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-1"
          >
            <Save size={14} />
            保存配置
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">每日最大质控数</label>
            <input
              type="number"
              value={config.max_qa_cases_per_day}
              onChange={(e) => setConfig({ ...config, max_qa_cases_per_day: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">自动通过质控阈值</label>
            <input
              type="number"
              step="0.01"
              value={config.auto_qa_threshold}
              onChange={(e) => setConfig({ ...config, auto_qa_threshold: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">编码超时时间（分钟）</label>
            <input
              type="number"
              value={config.coding_timeout_minutes}
              onChange={(e) => setConfig({ ...config, coding_timeout_minutes: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">默认模型</label>
            <select
              value={config.default_model}
              onChange={(e) => setConfig({ ...config, default_model: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
            >
              <option value="hybrid">混合模型</option>
              <option value="rule_based">规则模型</option>
              <option value="deep_learning">深度学习模型</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">备份频率</label>
            <select
              value={config.backup_frequency}
              onChange={(e) => setConfig({ ...config, backup_frequency: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
            >
              <option value="hourly">每小时</option>
              <option value="daily">每天</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h3 className="font-medium text-slate-700 mb-4">功能开关</h3>
          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={config.enable_drg_recommendation}
                onChange={(e) => setConfig({ ...config, enable_drg_recommendation: e.target.checked })}
                className="w-4 h-4 text-slate-600 rounded focus:ring-slate-400"
              />
              <span className="text-sm text-slate-700">启用 DRG 推荐</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={config.enable_code_validation}
                onChange={(e) => setConfig({ ...config, enable_code_validation: e.target.checked })}
                className="w-4 h-4 text-slate-600 rounded focus:ring-slate-400"
              />
              <span className="text-sm text-slate-700">启用编码校验</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={config.enable_audit_log}
                onChange={(e) => setConfig({ ...config, enable_audit_log: e.target.checked })}
                className="w-4 h-4 text-slate-600 rounded focus:ring-slate-400"
              />
              <span className="text-sm text-slate-700">启用审计日志</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogsPanel() {
  const [logs] = useState([
    { id: 1, user: 'admin', action: '用户登录', ip: '192.168.1.100', time: '2024-01-20 14:30:25', status: 'success' },
    { id: 2, user: 'coder01', action: '提交质控', ip: '192.168.1.101', time: '2024-01-20 14:25:18', status: 'success' },
    { id: 3, user: 'qa01', action: '质控通过', ip: '192.168.1.102', time: '2024-01-20 14:20:05', status: 'success' },
    { id: 4, user: 'admin', action: '修改系统配置', ip: '192.168.1.100', time: '2024-01-20 13:45:33', status: 'success' },
    { id: 5, user: 'doctor01', action: '用户登录', ip: '192.168.1.103', time: '2024-01-20 13:30:00', status: 'failed' },
    { id: 6, user: 'coder02', action: '开始编码', ip: '192.168.1.104', time: '2024-01-20 12:15:42', status: 'success' },
    { id: 7, user: 'admin', action: '更新字典', ip: '192.168.1.100', time: '2024-01-20 11:00:15', status: 'success' },
    { id: 8, user: 'qa01', action: '打回重编', ip: '192.168.1.102', time: '2024-01-20 10:30:55', status: 'success' },
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">操作日志</h2>
        <button className="px-3 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-1">
          <FileText size={14} />
          导出日志
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">时间</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">用户</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">操作</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">IP地址</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Clock size={14} />
                    {log.time}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700 font-medium">{log.user}</td>
                <td className="px-4 py-3 text-slate-600">{log.action}</td>
                <td className="px-4 py-3 text-slate-500 text-sm font-mono">{log.ip}</td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 text-xs ${
                    log.status === 'success' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {log.status === 'success' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {log.status === 'success' ? '成功' : '失败'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const { user, token } = useAuth();
  const [settings, setSettings] = useState({
    email_enabled: true,
    browser_enabled: true,
    sound_enabled: false,
    notify_case_assigned: true,
    notify_case_rejected: true,
    notify_case_approved: true,
    notify_qa_pending: true,
    notify_system_update: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 获取通知设置
  useEffect(() => {
    if (!user || !token) return;

    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/auth/users/${user.username}/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (err) {
        console.error('获取通知设置失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user, token]);

  const handleSave = async () => {
    if (!user || !token) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/auth/users/${user.username}/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        alert('通知设置已保存！');
      } else {
        alert('保存失败，请重试');
      }
    } catch (err) {
      console.error('保存通知设置失败:', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">通知设置</h2>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
        >
          <Save size={14} />
          保存设置
        </button>
      </div>

      <div className="space-y-6">
        {/* 通知渠道 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">通知渠道</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-medium text-slate-700">邮件通知</div>
                <div className="text-sm text-slate-500">重要事件将发送到您的邮箱</div>
              </div>
              <button
                onClick={() => handleToggle('email_enabled')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.email_notifications ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.email_notifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-medium text-slate-700">浏览器通知</div>
                <div className="text-sm text-slate-500">桌面推送通知</div>
              </div>
              <button
                onClick={() => handleToggle('browser_enabled')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.browser_notifications ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.browser_notifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-medium text-slate-700">声音提醒</div>
                <div className="text-sm text-slate-500">新通知时播放提示音</div>
              </div>
              <button
                onClick={() => handleToggle('sound_enabled')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.sound_notifications ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.sound_notifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 工作通知 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">工作通知</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-700">质控任务分配</span>
              <button
                onClick={() => handleToggle('notify_case_assigned')}
                className={`w-10 h-5 rounded-full transition-colors ${
                  settings.qa_assigned ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.qa_assigned ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-700">质控完成通知</span>
              <button
                onClick={() => handleToggle('notify_case_approved')}
                className={`w-10 h-5 rounded-full transition-colors ${
                  settings.qa_completed ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.qa_completed ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-700">病例即将超时</span>
              <button
                onClick={() => handleToggle('notify_qa_pending')}
                className={`w-10 h-5 rounded-full transition-colors ${
                  settings.case_expiring ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.case_expiring ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-700">病例已超时</span>
              <button
                onClick={() => handleToggle('notify_case_rejected')}
                className={`w-10 h-5 rounded-full transition-colors ${
                  settings.case_overdue ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.case_overdue ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 系统通知 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">系统通知</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-700">系统更新通知</span>
              <button
                onClick={() => handleToggle('notify_system_update')}
                className={`w-10 h-5 rounded-full transition-colors ${
                  settings.system_update ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.system_update ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-700">周报推送</span>
              <button
                onClick={() => handleToggle('weekly_report')}
                className={`w-10 h-5 rounded-full transition-colors ${
                  settings.weekly_report ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.weekly_report ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-700">每日摘要</span>
              <button
                onClick={() => handleToggle('daily_digest')}
                className={`w-10 h-5 rounded-full transition-colors ${
                  settings.daily_digest ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.daily_digest ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 免打扰时段 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">免打扰时段</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-medium text-slate-700">启用免打扰</div>
                <div className="text-sm text-slate-500">免打扰时段内仅接收紧急通知</div>
              </div>
              <button
                onClick={() => handleToggle('quiet_hours_enabled')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.quiet_hours_enabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.quiet_hours_enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {settings.quiet_hours_enabled && (
              <div className="grid grid-cols-2 gap-4 pl-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">开始时间</label>
                  <input
                    type="time"
                    value={settings.quiet_hours_start}
                    onChange={(e) => setSettings({ ...settings, quiet_hours_start: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">结束时间</label>
                  <input
                    type="time"
                    value={settings.quiet_hours_end}
                    onChange={(e) => setSettings({ ...settings, quiet_hours_end: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearancePanel() {
  const [settings, setSettings] = useState({
    theme: 'light',
    primary_color: 'blue',
    sidebar_width: 240,
    font_size: 'medium',
    compact_mode: false,
    show_avatars: true,
    animation_enabled: true,
    reduced_motion: false,
    show_line_numbers: true,
    code_theme: 'github-light',
    language: 'zh-CN',
    date_format: 'YYYY-MM-DD',
    time_format: '24h',
  });

  const themes = [
    { id: 'light', name: '浅色模式', preview: 'bg-white', text: 'text-slate-800' },
    { id: 'dark', name: '深色模式', preview: 'bg-slate-800', text: 'text-white' },
    { id: 'system', name: '跟随系统', preview: 'bg-gradient-to-r from-white to-slate-800', text: 'text-slate-800' },
  ];

  const colorOptions = [
    { id: 'blue', color: 'bg-blue-600', name: '蓝色' },
    { id: 'green', color: 'bg-emerald-600', name: '绿色' },
    { id: 'purple', color: 'bg-purple-600', name: '紫色' },
    { id: 'orange', color: 'bg-orange-600', name: '橙色' },
    { id: 'red', color: 'bg-red-600', name: '红色' },
    { id: 'cyan', color: 'bg-cyan-600', name: '青色' },
  ];

  const fontSizes = [
    { id: 'small', label: '小', value: '13px' },
    { id: 'medium', label: '中', value: '14px' },
    { id: 'large', label: '大', value: '15px' },
  ];

  const handleSave = () => {
    alert('外观设置已保存！');
  };

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">界面外观</h2>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
        >
          <Save size={14} />
          保存设置
        </button>
      </div>

      <div className="space-y-6">
        {/* 主题选择 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">主题设置</h3>
          <div className="grid grid-cols-3 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSettings({ ...settings, theme: theme.id })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  settings.theme === theme.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-full h-16 rounded-lg ${theme.preview} mb-3 flex items-center justify-center border border-slate-200`}>
                  <div className="flex gap-1">
                    <div className="w-2 h-4 bg-slate-300 rounded" />
                    <div className="w-8 h-4 bg-slate-200 rounded" />
                    <div className="w-4 h-4 bg-slate-300 rounded" />
                  </div>
                </div>
                <div className={`text-sm font-medium ${theme.text}`}>{theme.name}</div>
                {settings.theme === theme.id && (
                  <div className="text-xs text-blue-600 mt-1">已选中</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 主题色 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">主题色</h3>
          <div className="flex gap-3">
            {colorOptions.map((color) => (
              <button
                key={color.id}
                onClick={() => setSettings({ ...settings, primary_color: color.id })}
                className={`w-12 h-12 rounded-full ${color.color} flex items-center justify-center transition-transform hover:scale-110 ${
                  settings.primary_color === color.id
                    ? 'ring-4 ring-offset-2 ring-slate-300'
                    : ''
                }`}
                title={color.name}
              >
                {settings.primary_color === color.id && (
                  <CheckCircle size={20} className="text-white" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 基础显示设置 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">显示设置</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-700">紧凑模式</div>
                <div className="text-sm text-slate-500">减少组件间距，显示更多内容</div>
              </div>
              <button
                onClick={() => handleToggle('compact_mode')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.compact_mode ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.compact_mode ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-700">显示头像</div>
                <div className="text-sm text-slate-500">在列表中显示用户头像</div>
              </div>
              <button
                onClick={() => handleToggle('show_avatars')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.show_avatars ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.show_avatars ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-700">动画效果</div>
                <div className="text-sm text-slate-500">启用页面过渡和交互动画</div>
              </div>
              <button
                onClick={() => handleToggle('animation_enabled')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.animation_enabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.animation_enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-700">减少动画</div>
                <div className="text-sm text-slate-500">减少动画持续时间和幅度</div>
              </div>
              <button
                onClick={() => handleToggle('reduced_motion')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.reduced_motion ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    settings.reduced_motion ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 字体大小 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">字体大小</h3>
          <div className="flex gap-3">
            {fontSizes.map((size) => (
              <button
                key={size.id}
                onClick={() => setSettings({ ...settings, font_size: size.id })}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all text-center ${
                  settings.font_size === size.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div style={{ fontSize: size.value }}>{size.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 区域设置 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">区域设置</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">语言</label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              >
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁體中文</option>
                <option value="en-US">English (US)</option>
                <option value="ja-JP">日本語</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">日期格式</label>
              <select
                value={settings.date_format}
                onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              >
                <option value="YYYY-MM-DD">2024-01-20</option>
                <option value="DD/MM/YYYY">20/01/2024</option>
                <option value="MM/DD/YYYY">01/20/2024</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">时间格式</label>
              <select
                value={settings.time_format}
                onChange={(e) => setSettings({ ...settings, time_format: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              >
                <option value="24h">24小时制</option>
                <option value="12h">12小时制</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodingPrefsPanel() {
  const [prefs, setPrefs] = useState({
    auto_validate: true,
    auto_ner_highlight: true,
    show_icd_descriptions: true,
    default_top_k: 10,
    confirmation_required: true,
    auto_save_interval: 30,
    preferred_code_format: 'full',
    show_confidence_threshold: 0.5,
    enable_shortcuts: true,
    auto_submit_qa: false,
  });

  const handleSave = () => {
    alert('编码偏好已保存！');
  };

  const handleToggle = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">编码偏好设置</h2>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
        >
          <Save size={14} />
          保存设置
        </button>
      </div>

      <div className="space-y-6">
        {/* 编码辅助 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">编码辅助</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-medium text-slate-700">自动校验</div>
                <div className="text-sm text-slate-500">编码时自动检查冲突和异常</div>
              </div>
              <button
                onClick={() => handleToggle('auto_validate')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  prefs.auto_validate ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    prefs.auto_validate ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-medium text-slate-700">NER实体高亮</div>
                <div className="text-sm text-slate-500">自动高亮病历中的医学实体</div>
              </div>
              <button
                onClick={() => handleToggle('auto_ner_highlight')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  prefs.auto_ner_highlight ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    prefs.auto_ner_highlight ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-medium text-slate-700">显示ICD描述</div>
                <div className="text-sm text-slate-500">编码时显示完整的中文描述</div>
              </div>
              <button
                onClick={() => handleToggle('show_icd_descriptions')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  prefs.show_icd_descriptions ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    prefs.show_icd_descriptions ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-medium text-slate-700">提交需确认</div>
                <div className="text-sm text-slate-500">提交质控前需要二次确认</div>
              </div>
              <button
                onClick={() => handleToggle('confirmation_required')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  prefs.confirmation_required ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    prefs.confirmation_required ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 预测参数 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">预测参数</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">默认显示数量</label>
              <select
                value={prefs.default_top_k}
                onChange={(e) => setPrefs({ ...prefs, default_top_k: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              >
                <option value={5}>5条</option>
                <option value={10}>10条</option>
                <option value={15}>15条</option>
                <option value={20}>20条</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">置信度阈值</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={prefs.show_confidence_threshold}
                onChange={(e) => setPrefs({ ...prefs, show_confidence_threshold: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">编码格式</label>
              <select
                value={prefs.preferred_code_format}
                onChange={(e) => setPrefs({ ...prefs, preferred_code_format: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              >
                <option value="full">完整格式 (I21.901)</option>
                <option value="short">短格式 (I21.9)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">自动保存间隔（秒）</label>
              <input
                type="number"
                min="10"
                max="300"
                value={prefs.auto_save_interval}
                onChange={(e) => setPrefs({ ...prefs, auto_save_interval: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* 快捷键 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">快捷键</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-medium text-slate-700">启用快捷键</div>
                <div className="text-sm text-slate-500">使用键盘快捷键提高效率</div>
              </div>
              <button
                onClick={() => handleToggle('enable_shortcuts')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  prefs.enable_shortcuts ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    prefs.enable_shortcuts ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-medium text-slate-700">编码完成后自动提交质控</div>
                <div className="text-sm text-slate-500">减少点击步骤（需确认）</div>
              </div>
              <button
                onClick={() => handleToggle('auto_submit_qa')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  prefs.auto_submit_qa ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                    prefs.auto_submit_qa ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeMenu, setActiveMenu] = useState('notifications');
  const menuItems = getMenuItems(user?.role);

  // 页面标题根据角色变化
  const pageTitle = user?.role === 'admin' ? '系统设置' : '个人设置';
  const pageDesc = user?.role === 'admin'
    ? '管理系统配置、用户账号、字典数据等'
    : '管理您的个人信息、通知偏好和界面外观';

  const renderContent = () => {
    switch (activeMenu) {
      case 'users': return <UsersPanel />;
      case 'dictionary': return <DictionaryPanel />;
      case 'system': return <SystemConfigPanel />;
      case 'logs': return <LogsPanel />;
      case 'notifications': return <NotificationsPanel />;
      case 'appearance': return <AppearancePanel />;
      case 'coding_pref': return <CodingPrefsPanel />;
      default: return <NotificationsPanel />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="text-slate-600" />
          {pageTitle}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {pageDesc}
        </p>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden flex p-6">
        {/* 左侧菜单 */}
        <div className="w-56 shrink-0">
          <nav className="bg-white rounded-xl border border-slate-200 p-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeMenu === item.id
                    ? 'bg-slate-100 text-slate-800 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {activeMenu === item.id && <ChevronRight size={16} className="ml-auto" />}
              </button>
            ))}
          </nav>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 ml-6 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
