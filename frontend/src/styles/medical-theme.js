/**
 * 医疗级生产力工具配色规范
 * 设计原则：降噪、语义化、层次化、护眼
 * 配色比例：中性色 80% + 品牌色 15% + 语义色 5%
 */

// ========== 核心配色 Token ==========
export const MEDICAL_COLORS = {
  // 中性色（占据 80% 界面）- 灰阶层次
  neutral: {
    bg: 'bg-slate-50',           // 页面背景：极浅灰
    card: 'bg-white',            // 卡片背景：纯白
    border: 'border-slate-200',  // 边框：浅灰
    borderLight: 'border-slate-100',
    textPrimary: 'text-slate-800',     // 核心数据：深灰
    textSecondary: 'text-slate-600',   // 次要信息：中灰
    textTertiary: 'text-slate-400',    // 辅助文案：浅灰
    textMuted: 'text-slate-500',       // 弱化文字
  },

  // 品牌色（占据 15%）- 科技蓝（莫兰迪低饱和）
  brand: {
    primary: 'bg-slate-700',            // 主按钮：深灰蓝
    primaryHover: 'hover:bg-slate-800',
    primaryText: 'text-slate-700',
    accent: 'bg-teal-600',              // 强调色：选中状态
    accentText: 'text-teal-600',
    accentLight: 'bg-teal-50',          // 强调色（浅）：背景
    accentBorder: 'border-teal-200',
    tabActive: 'text-slate-800 border-slate-700 bg-white',
    tabInactive: 'text-slate-500 border-transparent hover:text-slate-700 bg-slate-50',
  },

  // 语义色（占据 <5%，极克制使用）- 只用于"指示灯"功能
  semantic: {
    // 成功/通过 - 莫兰迪绿
    success: 'bg-emerald-500',
    successLight: 'bg-emerald-50',
    successText: 'text-emerald-600',
    successBorder: 'border-emerald-200',

    // 警告/需复核 - 莫兰迪橙
    warning: 'bg-amber-500',
    warningLight: 'bg-amber-50',
    warningText: 'text-amber-600',
    warningBorder: 'border-amber-200',

    // 危险/亏损/驳回 - 莫兰迪红（极克制使用）
    danger: 'bg-red-600',
    dangerLight: 'bg-red-50',
    dangerText: 'text-red-600',
    dangerBorder: 'border-red-200',

    // 信息/建议 - 莫兰迪蓝
    info: 'bg-blue-500',
    infoLight: 'bg-blue-50',
    infoText: 'text-blue-600',
    infoBorder: 'border-blue-200',
  },

  // 置信度配色 - 柔和的渐进色
  confidence: {
    high: 'bg-emerald-100 text-emerald-700',     // ≥80%
    medium: 'bg-amber-100 text-amber-700',        // 50-80%
    low: 'bg-slate-200 text-slate-600',           // <50%
  },

  // NER 实体高亮 - 极浅底色 + 下划线（不干扰阅读）
  entity: {
    // 疾病：极浅的蓝 + 下划线
    disease: 'bg-blue-50 border-b border-blue-300 text-blue-800',
    // 症状：极浅的橙 + 下划线
    symptom: 'bg-amber-50 border-b border-amber-300 text-amber-800',
    // 手术：极浅的绿 + 下划线
    operation: 'bg-emerald-50 border-b border-emerald-300 text-emerald-800',
    // 药物：极浅的紫 + 下划线
    drug: 'bg-violet-50 border-b border-violet-300 text-violet-800',
    // 检验：极浅的灰 + 下划线
    lab: 'bg-slate-100 border-b border-slate-300 text-slate-700',
  },

  // 证据高亮 - 柔和闪烁，低饱和
  evidence: {
    high: 'bg-emerald-100 text-emerald-800 border-b-2 border-emerald-400',
    medium: 'bg-amber-100 text-amber-800 border-b-2 border-amber-400',
    low: 'bg-slate-200 text-slate-700 border-b-2 border-slate-400',
    default: 'bg-blue-50 text-blue-700 border-b border-blue-200',
  },
};

// ========== 卡片阴影层次 ==========
export const CARD_SHADOWS = {
  sm: 'shadow-sm',              // 轻微阴影
  md: 'shadow',                 // 默认阴影
  lg: 'shadow-md',              // 悬浮卡片
  hover: 'hover:shadow-md hover:translate-y-[-1px] transition-all',
};

// ========== 按钮样式规范 ==========
export const BUTTON_STYLES = {
  primary: 'bg-slate-700 text-white hover:bg-slate-800 transition-colors',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 transition-colors',
  danger: 'bg-red-600 text-white hover:bg-red-700 transition-colors',
  ghost: 'text-slate-600 hover:bg-slate-100 transition-colors',
};

export default MEDICAL_COLORS;
