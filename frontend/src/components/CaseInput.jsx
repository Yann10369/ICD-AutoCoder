import { ArrowUp } from 'lucide-react';

// Case input section
const CaseInput = ({
  caseText,
  onCaseChange,
  onSubmit,
  loading,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && caseText.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <textarea
          value={caseText}
          onChange={onCaseChange}
          onKeyDown={handleKeyDown}
          placeholder="粘贴病例信息...例如：患者，男性，45岁，主诉头痛、发热3天..."
          className="w-full h-32 p-4 pr-14 border-2 border-gray-300 rounded-lg focus:border-gray-500 focus:outline-none resize-none"
          disabled={loading}
        />
        <button
          onClick={onSubmit}
          disabled={loading || !caseText.trim()}
          className={`absolute right-3 bottom-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            loading || !caseText.trim()
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-black hover:bg-gray-800 cursor-pointer'
          }`}
          title="开始分析"
        >
          <ArrowUp size={20} className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default CaseInput;
