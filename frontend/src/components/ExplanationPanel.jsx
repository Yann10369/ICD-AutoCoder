// Keyword heat item component
const KeywordHeatItem = ({ keyword, heat, rank }) => (
  <div className="bg-white p-3 rounded-lg border border-gray-200">
    <div className="flex items-center justify-between mb-2">
      <span className="font-medium text-gray-800">
        {rank}. {keyword}
      </span>
      <span className="text-sm font-semibold text-orange-600">
        热度: {(heat * 100).toFixed(0)}%
      </span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-gradient-to-r from-yellow-400 to-orange-600 h-2 rounded-full transition-all"
        style={{ width: `${heat * 100}%` }}
      ></div>
    </div>
  </div>
);

// Feature importance bar component
const FeatureImportanceBar = ({ feature, importance, rank }) => (
  <div className="bg-white p-3 rounded-lg border border-gray-200">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">
        {rank}. {feature}
      </span>
      <span className="text-sm font-bold text-green-600">
        {(importance * 100).toFixed(1)}%
      </span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
      <div
        className="bg-green-500 h-2 rounded-full transition-all"
        style={{ width: `${importance * 100}%` }}
      ></div>
    </div>
  </div>
);

// Decision step component
const DecisionStep = ({ step, description, confidence }) => (
  <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <span className="inline-block w-6 h-6 bg-purple-600 text-white rounded-full text-center leading-6 font-bold text-sm mr-3">
          {step}
        </span>
        <span className="text-gray-800">{description}</span>
      </div>
      <span className="text-sm font-semibold text-purple-600">
        置信度: {(confidence * 100).toFixed(1)}%
      </span>
    </div>
  </div>
);

// Explanation analysis section
const ExplanationPanel = ({ predictions }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-4"> 可解释性分析</h2>
    {/* Keyword heatmap analysis */}
    <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-500">
      <h3 className="text-lg font-semibold text-yellow-900 mb-4">关键词热度分析</h3>
      <div className="space-y-3">
        {(predictions.keywordHeatmap || []).map((keyword, idx) => (
          <KeywordHeatItem
            key={idx}
            keyword={keyword.term}
            heat={keyword.importance}
            rank={idx + 1}
          />
        ))}
      </div>
    </div>
    {/* Feature importance */}
    <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
      <h3 className="text-lg font-semibold text-green-900 mb-4">特征重要性排名</h3>
      <div className="space-y-2">
        {(predictions.featureImportance || []).map((feature, idx) => (
          <FeatureImportanceBar
            key={idx}
            feature={feature.name}
            importance={feature.score}
            rank={idx + 1}
          />
        ))}
      </div>
    </div>
    {/* Model decision path */}
    <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500">
      <h3 className="text-lg font-semibold text-purple-900 mb-4">模型决策路径</h3>
      <div className="space-y-3">
        {(predictions.decisionPath || []).map((step, idx) => (
          <DecisionStep
            key={idx}
            step={idx + 1}
            description={step.description}
            confidence={step.confidence}
          />
        ))}
      </div>
    </div>
  </div>
);

export default ExplanationPanel;
