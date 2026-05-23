/**
 * 应用入口组件 - 简化版，不依赖 react-router-dom
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WorklistPage from './pages/WorklistPage';
import WorkspacePage from './pages/WorkspacePage';
import GraphHallPage from './pages/GraphHallPage';
import QualityCheckPage from './pages/QualityCheckPage';
import WorkflowPage from './pages/WorkflowPage';
import QaCenterPage from './pages/QaCenterPage';
import ModelsPage from './pages/ModelsPage';
import SettingsPage from './pages/SettingsPage';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// 路由守卫组件 - 检查用户权限
function ProtectedRoute({ children, requiredPermission, requiredRoles }) {
  const { user, hasPermission } = useAuth();

  // 检查角色
  if (requiredRoles && !requiredRoles.includes(user?.role)) {
    return <DashboardPage />;
  }

  // 检查权限
  if (requiredPermission && !hasPermission(...requiredPermission)) {
    return <DashboardPage />;
  }

  return children;
}

// 简单的路由实现
function SimpleRouter() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // 待处理病例队列 - 传递给workspace页面编码
  const [pendingCaseIds, setPendingCaseIds] = useState([]);
  // 导航到workspace的回调（用于子组件）
  const navigateToWorkspace = useCallback((caseIds) => {
    setPendingCaseIds(caseIds || []);
    setCurrentPage('workspace');
  }, []);

  useEffect(() => {
    // 简单的 URL hash 路由
    const handleHashChange = () => {
      const rawHash = window.location.hash.slice(1) || 'dashboard';
      // 只取路径部分（不含查询参数）
      const page = rawHash.split('?')[0];
      setCurrentPage(page);
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setCurrentPage('dashboard')} />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-white">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          {currentPage === 'dashboard' && <DashboardPage />}
          {currentPage === 'worklist' && (
            <ProtectedRoute requiredPermission={['cases', 'read']}>
              <WorklistPage
                onNavigateToCase={(caseId) => {
                  setPendingCaseIds([caseId]);
                  setCurrentPage('workspace');
                }}
                onBatchCoding={(caseIds) => {
                  setPendingCaseIds(caseIds);
                  setCurrentPage('workspace');
                }}
              />
            </ProtectedRoute>
          )}
          {currentPage === 'workspace' && <WorkspacePage pendingCaseIds={pendingCaseIds} onCasesLoaded={() => setPendingCaseIds([])} />}
          {currentPage === 'graph' && <GraphHallPage />}
          {currentPage === 'quality-check' && (
            <ProtectedRoute requiredPermission={['audit', 'read']}>
              <QualityCheckPage />
            </ProtectedRoute>
          )}
          {currentPage === 'workflow' && <WorkflowPage />}
          {currentPage === 'qa-center' && <QaCenterPage />}
          {currentPage === 'models' && (
            <ProtectedRoute requiredRoles={['admin', 'auditor']}>
              <ModelsPage />
            </ProtectedRoute>
          )}
          {currentPage === 'settings' && (
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SimpleRouter />
    </AuthProvider>
  );
}
