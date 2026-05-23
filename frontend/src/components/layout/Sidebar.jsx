/**
 * 左侧导航栏
 */
import { useAuth } from '../../contexts/AuthContext';


const menuItems = [
  {
    path: 'dashboard',
    name: '首页大盘',
    requiredPermission: null,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    path: 'worklist',
    name: '病例管理',
    requiredPermission: ['cases', 'read'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    path: 'workspace',
    name: '编码平台',
    requiredPermission: ['predict', 'create'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    path: 'quality-check',
    name: '质控审核',
    requiredPermission: ['audit', 'read'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    path: 'graph',
    name: '知识图谱',
    requiredPermission: ['graph', 'read'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    path: 'workflow',
    name: '工作流编辑器',
    requiredPermission: ['workflow', 'read'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    path: 'models',
    name: '模型仓库',
    requiredPermission: ['system', 'config'],
    roles: ['admin', 'auditor'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    path: 'settings',
    name: '设置',  // 所有角色可见，具体名称在SettingsPage中根据角色调整
    requiredPermission: null,  // 所有登录用户都可访问设置页面
    roles: null,  // 不限制角色
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// 过滤菜单项 - 根据用户权限
function filterMenuItems(items, user, hasPermission) {
  return items.filter(item => {
    // 如果指定了角色要求，检查角色
    if (item.roles && !item.roles.includes(user?.role)) {
      return false;
    }
    // 如果指定了权限要求，检查权限
    if (item.requiredPermission) {
      return hasPermission(...item.requiredPermission);
    }
    return true;
  });
}

export default function Sidebar({ collapsed, onToggle, currentPage, onNavigate }) {
  const { user, logout, hasPermission } = useAuth();

  // 根据用户权限过滤菜单
  const visibleMenuItems = filterMenuItems(menuItems, user, hasPermission);

  return (
    <div className={`h-full bg-gray-100 text-gray-800 flex flex-col transition-all duration-300 border-r border-gray-200 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo 区域 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && (
          <span className="font-bold text-lg text-gray-800">ICD 编码</span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
        >
          <svg className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {visibleMenuItems.map((item) => (
            <li key={item.path}>
              <button
                onClick={() => {
                  window.location.hash = item.path;
                  onNavigate(item.path);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  currentPage === item.path
                    ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 用户信息 */}
      <div className="p-3 border-t border-gray-200">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
            {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-gray-800">{user?.full_name || user?.username}</div>
              <div className="text-xs text-gray-500">
                {user?.role === 'admin' ? '管理员' : user?.role === 'coder' ? '编码员' : user?.role === 'doctor' ? '医生' : user?.role}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => {
                logout();
                window.location.hash = 'login';
              }}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              title="退出登录"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
