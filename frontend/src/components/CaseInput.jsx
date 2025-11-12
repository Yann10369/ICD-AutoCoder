// Checkbox option component
const CheckboxOption = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 accent-indigo-600"
    />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

// Case input section
const CaseInput = ({
  caseText,
  language,
  preprocessOptions,
  onCaseChange,
  onLanguageChange,
  onPreprocessChange,
  onSubmit,
  loading,
}) => (
  <div className="space-y-6">
    <div>
      <label className="block text-lg font-semibold text-gray-800 mb-3">
        📋 病例信息输入
      </label>
      <textarea
        value={caseText}
        onChange={onCaseChange}
        placeholder="粘贴病例信息...例如：患者，男性，45岁，主诉头痛、发热3天..."
        className="w-full h-48 p-4 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
      />
      <p className="text-sm text-gray-500 mt-2">
        💡 提示：输入越详细，预测结果越准确
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Language selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          🌐 选择语言
        </label>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>
      {/* Preprocess options */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          ⚙️ 预处理选项
        </label>
        <div className="space-y-2">
          <CheckboxOption
            label="去除停用词"
            checked={preprocessOptions.removeStopwords}
            onChange={() => onPreprocessChange('removeStopwords')}
          />
          <CheckboxOption
            label="保留数字"
            checked={preprocessOptions.keepNumbers}
            onChange={() => onPreprocessChange('keepNumbers')}
          />
          <CheckboxOption
            label="术语标准化"
            checked={preprocessOptions.standardizeTerms}
            onChange={() => onPreprocessChange('standardizeTerms')}
          />
        </div>
      </div>
    </div>
    <button
      onClick={onSubmit}
      disabled={loading}
      className={`w-full py-3 px-6 rounded-lg font-semibold text-white text-lg transition-all ${
        loading
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl'
      }`}
    >
      {loading ? '⏳ 分析中...' : '🚀 开始分析'}
    </button>
  </div>
);

export default CaseInput;
