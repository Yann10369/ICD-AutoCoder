import React, { useState } from 'react';
import { updateConfig } from '../../api/modelConfigs';
import { TestTube2, Save, Edit2 } from 'lucide-react';

const SmallModelDetail = ({ model, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: model?.name || '',
    size: model?.size || '',
    description: model?.description || '',
    enabled: model?.enabled !== false,
    dockerImage: model?.dockerImage || '',
  });

  // 当切换模型时更新表单
  React.useEffect(() => {
    if (model) {
      setFormData({
        name: model.name || '',
        size: model.size || '',
        description: model.description || '',
        enabled: model.enabled !== false,
        dockerImage: model.dockerImage || '',
      });
      setIsEditing(false);
    }
  }, [model]);

  if (!model) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <p className="text-sm">请从左侧选择一个小模型查看详情</p>
      </div>
    );
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleToggleEnabled = async () => {
    if (!isEditing) {
      // 非编辑模式下直接切换
      await saveChanges({
        ...formData,
        enabled: !formData.enabled
      });
    } else {
      handleChange('enabled', !formData.enabled);
    }
  };

  const saveChanges = async (data) => {
    setSaving(true);
    try {
      const updated = {
        ...model.data,
        name: data.name,
        size: parseFloat(data.size) || data.size,
        description: data.description,
        enabled: data.enabled,
        dockerImage: data.dockerImage,
        category: 'small'
      };

      const result = await updateConfig(model.id, updated);
      onUpdate?.();
      setFormData({
        name: result.name,
        size: result.size,
        description: result.description,
        enabled: result.enabled !== false,
        dockerImage: result.dockerImage,
      });
      setIsEditing(false);
      alert('保存成功');
    } catch (err) {
      console.error('保存失败:', err);
      alert(`保存失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    saveChanges(formData);
  };

  const handleTestConnection = async () => {
    // TODO: 实现测试连接API
    alert('测试连接功能待实现');
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">小模型详情</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit2 size={14} />
            编辑
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* 基本信息 */}
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 模型名称 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                模型名称
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="输入模型名称"
                />
              ) : (
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
                  {formData.name || '未设置'}
                </div>
              )}
            </div>

            {/* 模型大小 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                模型大小 (MB)
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => handleChange('size', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="例如: 256"
                />
              ) : (
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
                  {formData.size ? `${formData.size} MB` : '未设置'}
                </div>
              )}
            </div>
          </div>

          {/* 启用状态 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              启用状态
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleEnabled}
                disabled={(isEditing && saving)}
                className={`
                  relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${formData.enabled ? 'bg-blue-600' : 'bg-slate-200'}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200
                    ${formData.enabled ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
              <span className={`text-sm font-medium ${formData.enabled ? 'text-green-600' : 'text-slate-500'}`}>
                {formData.enabled ? '已启用' : '已禁用'}
              </span>
            </div>
          </div>

          {/* Docker 镜像 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Docker 镜像地址
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.dockerImage}
                onChange={(e) => handleChange('dockerImage', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors font-mono text-sm"
                placeholder="例如: registry.example.com/models/caml:v1.0"
              />
            ) : (
              <code className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm block break-all">
                {formData.dockerImage || '未设置'}
              </code>
            )}
          </div>

          {/* 主要特点 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              主要特点
            </label>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
                placeholder="描述模型的主要特点、适用场景等..."
              />
            ) : (
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 min-h-[100px] whitespace-pre-wrap">
                {formData.description || '暂无描述'}
              </div>
            )}
          </div>
        </section>

        {/* 操作按钮 */}
        {isEditing && (
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={handleTestConnection}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <TestTube2 size={16} />
              测试连接
            </button>
            <div className="flex-1" />
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save size={16} />
                  保存修改
                </>
              )}
            </button>
          </div>
        )}

        {!isEditing && (
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={handleTestConnection}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <TestTube2 size={16} />
              测试连接
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmallModelDetail;
