import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Play, Edit2, Trash2 } from 'lucide-react';
import { listWorkflows, deleteWorkflow } from '../api/workflow';
import WorkflowEditorPage from './WorkflowEditorPage';

const WorkflowPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // 加载工作流列表
  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const data = await listWorkflows();
      setWorkflows(data || []);
    } catch (err) {
      console.error('加载工作流列表失败:', err);
      alert(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  // 删除工作流
  const handleDelete = async (id, name) => {
    if (!confirm(`确定要删除工作流 "${name}" 吗？`)) return;
    try {
      await deleteWorkflow(id);
      loadWorkflows();
      alert('删除成功');
    } catch (err) {
      console.error('删除失败:', err);
      alert(`删除失败: ${err.message}`);
    }
  };

  // 新建工作流
  const handleNew = () => {
    setEditingId('new');
  };

  // 编辑完成返回列表
  const handleSaveAndBack = () => {
    setEditingId(null);
    loadWorkflows();
  };

  // 如果正在编辑，显示编辑器
  if (editingId) {
    return <WorkflowEditorPage onBack={handleSaveAndBack} />;
  }

  return (
    <div className="flex-1 p-6 bg-slate-50 overflow-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">工作流管理</h1>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          新建工作流
        </button>
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-500">
          加载中...
        </div>
      )}

      {!loading && workflows.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
          <GitBranch size={64} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">暂无工作流</h2>
          <p className="text-slate-500 mb-6">点击"新建工作流"开始创建你的第一个可视化工作流</p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            新建工作流
          </button>
        </div>
      )}

      {!loading && workflows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map(workflow => (
            <div key={workflow.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">{workflow.name}</h3>
                  <p className="text-xs text-slate-500">
                    {workflow.nodes?.length || 0} 节点 / {workflow.edges?.length || 0} 边
                  </p>
                </div>
                <GitBranch size={20} className="text-slate-400" />
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setEditingId(workflow.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <Edit2 size={14} />
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(workflow.id, workflow.name)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkflowPage;
