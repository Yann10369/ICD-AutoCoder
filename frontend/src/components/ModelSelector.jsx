// Model card component
const ModelCard = ({ selected, onClick, name, desc }) => (
  <div
    onClick={onClick}
    className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
      selected
        ? 'border-indigo-600 bg-indigo-50'
        : 'border-gray-300 bg-white hover:border-indigo-400'
    }`}
  >
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-semibold text-gray-800">{name}</h3>
        <p className="text-sm text-gray-600 mt-1">{desc}</p>
      </div>
      {selected && <div className="w-5 h-5 bg-indigo-600 rounded-full"></div>}
    </div>
  </div>
);

// Slider parameter component
const SliderParam = ({ label, value, min, max, step, onChange, desc }) => (
  <div>
    <div className="flex justify-between items-center mb-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <span className="text-lg font-semibold text-indigo-600">{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
    />
    <p className="text-xs text-gray-500 mt-1">{desc}</p>
  </div>
);

// Model config section
const ModelSelector = ({
  selectedModel,
  modelParams,
  onModelChange,
  onParamChange,
  onSubmit,
}) => (
  <div className="space-y-6">
    <div>
      <label className="block text-lg font-semibold text-gray-800 mb-3">
        选择预测模型
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { id: 'small', name: '轻量级模型', desc: '快速、低资源' },
          { id: 'llm', name: 'LLM模型', desc: '准确率高、响应慢' },
          { id: 'hybrid', name: '混合模型', desc: '平衡性能与准确率' },
        ].map(model => (
          <ModelCard
            key={model.id}
            selected={selectedModel === model.id}
            onClick={() => onModelChange(model.id)}
            name={model.name}
            desc={model.desc}
          />
        ))}
      </div>
    </div>
    <div className="bg-gray-50 p-6 rounded-lg">
      <label className="block text-lg font-semibold text-gray-800 mb-4">
        模型参数调整
      </label>
      <div className="space-y-4">
        <SliderParam
          label="温度 (Temperature)"
          value={modelParams.temperature}
          min={0}
          max={1}
          step={0.1}
          onChange={(value) => onParamChange('temperature', value)}
          desc="控制输出的随机性，0=确定性，1=最大随机"
        />
        <SliderParam
          label="Top-K 参数"
          value={modelParams.topK}
          min={1}
          max={20}
          step={1}
          onChange={(value) => onParamChange('topK', value)}
          desc="保留概率最高的K个预测结果"
        />
        <SliderParam
          label="置信度阈值 (Threshold)"
          value={modelParams.threshold}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => onParamChange('threshold', value)}
          desc="只显示置信度高于此阈值的预测"
        />
      </div>
    </div>
    {/* Submit button */}
    <div className="pt-4">
      <button
        onClick={onSubmit}
        className="w-full py-3 px-6 rounded-lg font-semibold text-white text-lg transition-all bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl"
      >
        ✓ 确认配置并返回输入界面
      </button>
    </div>
  </div>
);

export default ModelSelector;
