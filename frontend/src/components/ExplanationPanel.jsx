// Keyword heat item component - 医疗级配色
const KeywordHeatItem = ({ keyword, heat, rank }) => (
  <div className="bg-white p-3 rounded-lg border border-slate-200">
    <div className="flex items-center justify-between mb-2">
      <span className="font-medium text-slate-800">
        {rank}. {keyword}
      </span>
      <span className="text-sm font-semibold text-amber-600">
        热度: {(heat * 100).toFixed(0)}%
      </span>
    </div>
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div
        className="bg-slate-600 h-2 rounded-full transition-all"
        style={{ width: `${heat * 100}%` }}
      ></div>
    </div>
  </div>
);

// Feature importance bar component - 医疗级配色
const FeatureImportanceBar = ({ feature, importance, rank }) => (
  <div className="bg-white p-3 rounded-lg border border-slate-200">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-slate-700">
        {rank}. {feature}
      </span>
      <span className="text-sm font-bold text-emerald-600">
        {(importance * 100).toFixed(1)}%
      </span>
    </div>
    <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
      <div
        className="bg-emerald-500 h-2 rounded-full transition-all"
        style={{ width: `${importance * 100}%` }}
      ></div>
    </div>
  </div>
);

// Decision step component - 医疗级配色
const DecisionStep = ({ step, description, confidence }) => (
  <div className="bg-white p-4 rounded-lg border-l-4 border-slate-500">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <span className="inline-block w-6 h-6 bg-slate-600 text-white rounded-full text-center leading-6 font-bold text-sm mr-3">
          {step}
        </span>
        <span className="text-slate-800">{description}</span>
      </div>
      <span className="text-sm font-semibold text-slate-600">
        置信度: {(confidence * 100).toFixed(1)}%
      </span>
    </div>
  </div>
);

// Explanation analysis section - 医疗级配色
const ExplanationPanel = ({ predictions }) => {
  // 优先使用AI模型返回的explanation
  const explanation = predictions?.explanation;

  // 如果有AI模型返回的解释，直接显示
  if (explanation) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-50 p-6 rounded-lg border-l-4 border-slate-500">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">AI模型解释</h3>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 如果没有AI解释，显示原有的分析（兼容旧格式）
  return (
    <div className="space-y-6">
      {/* Keyword heatmap analysis */}
      <div className="bg-slate-50 p-6 rounded-lg border-l-4 border-amber-500">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">关键词热度分析</h3>
        <div className="space-y-3">
          {(predictions?.keywordHeatmap || []).length > 0 ? (
            (predictions.keywordHeatmap || []).map((keyword, idx) => (
              <KeywordHeatItem
                key={idx}
                keyword={keyword.term}
                heat={keyword.importance}
                rank={idx + 1}
              />
            ))
          ) : (
            <p className="text-slate-500">暂无关键词热度分析数据</p>
          )}
        </div>
      </div>
      {/* Feature importance */}
      <div className="bg-slate-50 p-6 rounded-lg border-l-4 border-emerald-500">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">特征重要性排名</h3>
        <div className="space-y-2">
          {(predictions?.featureImportance || []).length > 0 ? (
            (predictions.featureImportance || []).map((feature, idx) => (
              <FeatureImportanceBar
                key={idx}
                feature={feature.name}
                importance={feature.score}
                rank={idx + 1}
              />
            ))
          ) : (
            <p className="text-slate-500">暂无特征重要性数据</p>
          )}
        </div>
      </div>
      {/* Model decision path */}
      <div className="bg-slate-50 p-6 rounded-lg border-l-4 border-slate-500">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">模型决策路径</h3>
        <div className="space-y-3">
          {(predictions?.decisionPath || []).length > 0 ? (
            (predictions.decisionPath || []).map((step, idx) => (
              <DecisionStep
                key={idx}
                step={idx + 1}
                description={step.description}
                confidence={step.confidence}
              />
            ))
          ) : (
            <p className="text-slate-500">暂无决策路径数据</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplanationPanel;
