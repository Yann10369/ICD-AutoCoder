import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 错误边界组件，捕获渲染错误
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React渲染错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '800px',
          margin: '2rem auto',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          backgroundColor: '#fef2f2'
        }}>
          <h1 style={{ color: '#dc2626', fontSize: '1.5rem', marginBottom: '1rem' }}>
            应用渲染出错
          </h1>
          <p style={{ marginBottom: '1rem', color: '#4b5563' }}>
            请打开浏览器开发者工具 (F12) → Console 标签查看详细错误信息：
          </p>
          <pre style={{
            padding: '1rem',
            backgroundColor: '#1f2937',
            color: '#f9fafb',
            borderRadius: '4px',
            overflowX: 'auto',
            fontSize: '0.875rem'
          }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

