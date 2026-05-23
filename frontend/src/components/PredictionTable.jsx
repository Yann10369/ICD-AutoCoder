// Entity box component - 医疗级配色
const EntityBox = ({ title, items, color }) => {
  const colorClasses = {
    red: 'bg-slate-100 text-slate-700 border-slate-300',
    yellow: 'bg-slate-100 text-slate-700 border-slate-300',
    green: 'bg-slate-100 text-slate-700 border-slate-300',
  };
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200">
      <h4 className="font-semibold text-slate-800 mb-3">{title}</h4>
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
          <span className="text-slate-500 text-sm">未检测到相关实体</span>
        )}
      </div>
    </div>
  );
};

// ICD prediction bar component - 医疗级配色
const ICDPredictionBar = ({ code, description, probability, rank }) => (
  <div className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-8 h-8 bg-slate-600 text-white rounded-full text-center leading-8 font-bold text-sm">
            {rank}
          </span>
          <span className="font-semibold text-slate-800">{code}</span>
        </div>
        <p className="text-sm text-slate-600 mt-1">{description}</p>
      </div>
      <span className="text-lg font-bold text-slate-600">
        {(probability * 100).toFixed(1)}%
      </span>
    </div>
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div
        className="bg-slate-600 h-2 rounded-full transition-all"
        style={{ width: `${probability * 100}%` }}
      ></div>
    </div>
  </div>
);

// Statistics card component - 医疗级配色
const StatCard = ({ label, value, icon }) => (
  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
    <div className="text-3xl mb-2 text-slate-500">{icon}</div>
    <p className="text-sm text-slate-600">{label}</p>
    <p className="text-2xl font-bold text-slate-700 mt-1">{value}</p>
  </div>
);

// Prediction results section
const PredictionTable = ({ predictions }) => (
  <div className="grid grid-cols-2 gap-6 h-full">
    {/* 左侧：ICD编码预测表格 */}
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3">ICD 编码</th>
            <th className="px-4 py-3">诊断名称</th>
            <th className="px-4 py-3">概率</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {(predictions.icdPredictions || []).map((pred, i) => (
            <tr key={i} className={i === 0 ? "bg-slate-50" : ""}>
              <td className="px-4 py-3 font-mono font-bold text-slate-700">{pred.code}</td>
              <td className="px-4 py-3 text-slate-700">
                {pred.description || pred.name || pred.code}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${pred.probability > 0.8 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{width: `${pred.probability * 100}%`}}
                    ></div>
                  </div>
                  <span className="text-xs text-slate-500">{(pred.probability * 100).toFixed(0)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* 右侧：实体识别摘要和统计 */}
    <div className="flex flex-col gap-4">
      {/* 实体识别摘要 */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/60">
        <h4 className="font-bold text-slate-700 mb-3 text-xs uppercase flex items-center gap-2">
          医学实体识别摘要
        </h4>
        <div className="space-y-2">
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

      {/* 统计信息 */}
      <div className="grid grid-cols-2 gap-3">
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
  </div>
);

export default PredictionTable;
