/**
 * 质控审核页面 - 高级编码员进行终末质控
 */
import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Clock,
  ChevronDown,
  Eye
} from 'lucide-react';

const MOCK_QA_DATA = [
  {
    id: 'CASE-003',
    patientName: '王五',
    age: 58,
    gender: '女',
    department: '内分泌科',
    diagnosis: '2型糖尿病伴多种并发症',
    coder: '张编码员',
    codingTime: 18,
    submittedAt: '2024-01-18 14:30',
    status: 'pending_qa',
    codes: [
      { code: 'E11.9', description: '2型糖尿病', confidence: 0.92 },
      { code: 'E11.42', description: '2型糖尿病伴多发性神经病', confidence: 0.85 },
      { code: 'I10', description: '原发性高血压', confidence: 0.78 },
    ],
    hasIssues: false,
    qaNotes: '',
  },
  {
    id: 'CASE-007',
    patientName: '吴九',
    age: 68,
    gender: '男',
    department: '心内科',
    diagnosis: '急性前壁心肌梗死',
    coder: '李编码员',
    codingTime: 25,
    submittedAt: '2024-01-18 15:45',
    status: 'pending_qa',
    codes: [
      { code: 'I21.0', description: '急性前壁心肌梗死', confidence: 0.95 },
      { code: 'I25.10', description: '动脉粥样硬化性心脏病', confidence: 0.88 },
      { code: 'E11.9', description: '2型糖尿病', confidence: 0.82 },
    ],
    hasIssues: true,
    qaNotes: '建议补充胸痛作为并发症编码',
  },
];

function QACard({ item, onApprove, onReject }) {
  const [showIssues, setShowIssues] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono font-semibold text-gray-700">{item.id}</span>
              {item.hasIssues && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                  <AlertTriangle size={10} />
                  存在问题
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm mt-2">
              <span className="font-medium text-gray-800">{item.patientName}</span>
              <span className="text-gray-500">{item.age}岁 {item.gender}</span>
              <span className="text-gray-500">{item.department}</span>
              <span className="text-gray-600">{item.diagnosis}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-700 mb-2">编码列表</div>
        {item.codes.map((code, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100 mb-2">
            <div className="flex items-center gap-2">
              {idx === 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">主诊</span>}
              <span className="font-mono font-medium text-sm text-teal-700">{code.code}</span>
              <span className="text-sm text-gray-600">{code.description}</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              {Math.round(code.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>

      <div className="border-b border-gray-100">
        <button
          onClick={() => setShowIssues(!showIssues)}
          className="w-full p-3 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            问题标记与修改意见
          </span>
          <ChevronDown size={16} className={showIssues ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
        {showIssues && item.qaNotes && (
          <div className="p-4 bg-amber-50 border-t border-amber-100">
            <div className="p-2 bg-white rounded-lg border border-amber-200">
              <div className="text-xs font-medium text-amber-700 mb-1">已有质控意见：</div>
              <div className="text-sm text-amber-800">{item.qaNotes}</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 flex items-center justify-end gap-2">
        <button
          onClick={() => onReject(item)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all font-medium"
        >
          <XCircle size={16} />
          打回重编
        </button>
        <button
          onClick={() => onApprove(item)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-medium shadow-sm"
        >
          <CheckCircle size={16} />
          通过
        </button>
      </div>
    </div>
  );
}

export default function QualityCheckPage() {
  const [qaList, setQaList] = useState(MOCK_QA_DATA);

  const stats = {
    total: qaList.length,
    pending: qaList.filter(i => i.status === 'pending_qa').length,
    completed: qaList.filter(i => i.status === 'qa_approved').length,
  };

  const handleApprove = (item) => {
    setQaList(qaList.map(i => i.id === item.id ? { ...i, status: 'qa_approved' } : i));
    alert('病历 ' + item.id + ' 已通过质控');
  };

  const handleReject = (item) => {
    setQaList(qaList.map(i => i.id === item.id ? { ...i, status: 'qa_rejected', hasIssues: true } : i));
    alert('病历 ' + item.id + ' 已打回重编');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <CheckCircle className="text-green-600" />
          质控审核
        </h1>
        <p className="text-sm text-gray-500 mt-1">对编码终末质控，确保编码准确性和DRG入组正确性</p>
      </div>

      <div className="px-6 py-4 grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-blue-600 mb-1">{stats.total}</div>
          <div className="text-xs text-gray-500">待审核总数</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-amber-600 mb-1">{stats.pending}</div>
          <div className="text-xs text-gray-500">待质控</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-green-600 mb-1">{stats.completed}</div>
          <div className="text-xs text-gray-500">已通过</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {qaList.map(item => (
          <QACard key={item.id} item={item} onApprove={handleApprove} onReject={handleReject} />
        ))}
      </div>

      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="text-sm text-gray-500">显示 {qaList.length} 条记录</div>
      </div>
    </div>
  );
}
