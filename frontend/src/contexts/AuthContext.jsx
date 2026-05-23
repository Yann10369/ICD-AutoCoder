/**
 * 认证上下文 - 管理用户登录状态和权限
 */
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初始化时检查登录状态
    const savedToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('解析用户信息失败:', e);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('用户名或密码错误');
      }

      const data = await response.json();

      setToken(data.access_token);
      setUser(data.user);

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  };

  const hasPermission = (resource, action) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    // 角色权限映射
    const rolePermissions = {
      doctor: {
        cases: ['read', 'create'],
        predict: ['create'],
        graph: ['read'],
      },
      coder: {
        cases: ['read', 'update'],
        predict: ['create', 'update'],
        graph: ['read'],
      },
      auditor: {
        cases: ['read', 'update'],
        audit: ['read'],
        predict: ['read'],
      },
      viewer: {
        cases: ['read'],
        predict: ['read'],
        graph: ['read'],
      },
    };

    const permissions = rolePermissions[user.role] || {};
    return permissions[resource]?.includes(action) || false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      hasPermission,
      isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
