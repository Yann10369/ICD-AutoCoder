import { Network } from 'lucide-react';

// Knowledge path item component
const KnowledgePathItem = ({ entity, related, highlight }) => (
  <div
    className={`p-4 rounded-lg text-left ${
      highlight ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-white border border-gray-300'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="font-semibold text-gray-800">{entity}</span>
      {highlight && <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">高影响</span>}
    </div>
    <div className="flex flex-wrap gap-2 mt-2">
      {related.length > 0 ? (
        related.map((item, idx) => (
          <span
            key={idx}
            className="text-xs bg-white text-gray-700 px-2 py-1 rounded border border-gray-300"
          >
            {item}
          </span>
        ))
      ) : (
        <span className="text-xs text-gray-500">无相关内容</span>
      )}
    </div>
  </div>
);

// Knowledge visualization section
const GraphViewer = ({ predictions }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-4">🧠 知识路径可视化</h2>
    <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300 min-h-96 flex items-center justify-center">
      <div className="text-center">
        <Network size={64} className="text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">诊断知识图谱</h3>
        <p className="text-gray-600 mb-4">基于识别的医学实体构建的关系网络</p>
        {/* Simulated graph nodes */}
        <div className="mt-6 space-y-4">
          <KnowledgePathItem
            entity="患者症状"
            related={predictions.entities?.symptoms || []}
            highlight={true}
          />
          <KnowledgePathItem
            entity="诊断疾病"
            related={predictions.entities?.diseases || []}
            highlight={true}
          />
          <KnowledgePathItem
            entity="治疗方案"
            related={predictions.entities?.procedures || []}
            highlight={false}
          />
        </div>
      </div>
    </div>
    <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
      <p className="text-sm text-indigo-900">
        💡 <strong>可视化说明：</strong> 图中高亮的节点表示对最终ICD编码预测影响最大的医学实体。
        边的粗细表示实体间的关联强度。
      </p>
    </div>
  </div>
);

export default GraphViewer;
