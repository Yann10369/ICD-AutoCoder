// Entity box component
const EntityBox = ({ title, items, color }) => {
  const colorClasses = {
    red: 'bg-red-100 text-red-800 border-red-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    green: 'bg-green-100 text-green-800 border-green-300',
  };
  return (
    <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
      <h4 className="font-semibold text-gray-800 mb-3">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item, idx) => (
            <span
              key={idx}
              className={`px-3 py-1 rounded-full text-sm font-medium border ${colorClasses[color]}`}
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-gray-500 text-sm">未检测到相关实体</span>
        )}
      </div>
    </div>
  );
};

// ICD prediction bar component
const ICDPredictionBar = ({ code, description, probability, rank }) => (
  <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-8 h-8 bg-indigo-600 text-white rounded-full text-center leading-8 font-bold text-sm">
            {rank}
          </span>
          <span className="font-semibold text-gray-800">{code}</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      <span className="text-lg font-bold text-indigo-600">
        {(probability * 100).toFixed(1)}%
      </span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-indigo-600 h-2 rounded-full transition-all"
        style={{ width: `${probability * 100}%` }}
      ></div>
    </div>
  </div>
);

// Statistics card component
const StatCard = ({ label, value, icon }) => (
  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
    <div className="text-3xl mb-2">{icon}</div>
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-2xl font-bold text-indigo-600 mt-1">{value}</p>
  </div>
);

// Prediction results section
const PredictionTable = ({ predictions }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-4">ICD编码预测结果</h2>
    {/* Medical entity recognition results */}
    <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
      <h3 className="text-lg font-semibold text-blue-900 mb-3">医学实体识别</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EntityBox
          title="疾病 (Disease)"
          items={predictions.entities?.diseases || []}
          color="red"
        />
        <EntityBox
          title="症状 (Symptom)"
          items={predictions.entities?.symptoms || []}
          color="yellow"
        />
        <EntityBox
          title="操作 (Procedure)"
          items={predictions.entities?.procedures || []}
          color="green"
        />
      </div>
    </div>
    {/* ICD code prediction */}
    <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-500">
      <h3 className="text-lg font-semibold text-indigo-900 mb-4">ICD编码预测</h3>
      <div className="space-y-3">
        {(predictions.icdPredictions || []).map((pred, idx) => (
          <ICDPredictionBar
            key={idx}
            code={pred.code}
            description={pred.description}
            probability={pred.probability}
            rank={idx + 1}
          />
        ))}
      </div>
    </div>
    {/* Statistics */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        label="识别实体数"
        value={predictions.entityCount || 0}
        icon=""
      />
      <StatCard
        label="预测编码数"
        value={predictions.icdPredictions?.length || 0}
        icon=""
      />
      <StatCard
        label="平均置信度"
        value={`${((predictions.avgConfidence || 0) * 100).toFixed(1)}%`}
        icon=""
      />
      <StatCard
        label="处理时间"
        value={`${predictions.processingTime || 0}ms`}
        icon=""
      />
    </div>
  </div>
);

export default PredictionTable;
