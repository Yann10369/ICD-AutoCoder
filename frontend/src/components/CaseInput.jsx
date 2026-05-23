// Case input section
const CaseInput = ({
  caseText,
  onCaseChange,
  onSubmit,
  loading,
}) => {
  const text = caseText || '';
  const hasText = text.trim();
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && hasText) {
        onSubmit();
      }
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <textarea
          value={text}
          onChange={onCaseChange}
          onKeyDown={handleKeyDown}
          placeholder="粘贴病例信息...例如：患者，男性，45岁，主诉头痛、发热3天..."
          className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg focus:border-gray-500 focus:outline-none resize-none select-text"
          disabled={loading}
        />
      </div>
    </div>
  );
};

export default CaseInput;
