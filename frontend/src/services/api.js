/**
 * 统一API服务入口
 * 封装所有后端API调用
 */

const API_BASE = '/api';

// 通用请求处理
export const request = async (url, options = {}) => {
  try {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('access_token');

    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API请求失败 [${url}]:`, error);
    throw error;
  }
};

// ==================== 数据字段映射 ====================
// 后端返回字段 → 前端期望字段
const mapWorklistItem = (item) => ({
  id: item.case_id,
  patientName: item.patient_name,
  age: item.age || 0,
  gender: item.gender || '',
  admissionDate: item.admission_date,
  dischargeDate: item.discharge_date,
  department: item.department,
  diagnosis: item.admission_diagnosis,
  priority: item.priority === 'emergency' ? 'urgent' : item.priority,
  status: mapStatus(item.status),
  assignee: item.assigned_coder_name,
  drgDeadline: item.discharge_date, // 使用出院日期作为截止
  estimatedTime: Math.round((item.sla_remaining_seconds || 3600) / 60),
  hasNotes: false,
});

// 状态映射：后端 → 前端
const mapStatus = (status) => {
  const statusMap = {
    'pending_coding': 'pending',
    'coding_in_progress': 'coding',
    'pending_qa': 'quality_check',
    'qa_rejected': 'qa_rejected',
    'archived': 'completed',
  };
  return statusMap[status] || status;
};

const mapQaItem = (item) => ({
  id: item.case_id,
  patientName: item.patient_name,
  age: item.age || 0,
  gender: item.gender || '',
  department: item.department,
  diagnosis: item.admission_diagnosis,
  coderName: item.assigned_coder_name || '未知',
  submittedAt: item.submitted_at || item.coding_start_time || new Date().toISOString(),
  codingDuration: Math.round((item.coding_duration_seconds || 0) / 60),
  codeCount: item.code_count || 0,
  status: mapStatus(item.status),
  qaScore: item.qa_score || 0,
  aiAcceptanceRate: item.ai_acceptance_rate || 0,
});

/**
 * 预测服务
 */
export const predictAPI = {
  // 执行ICD编码预测
  predict: async (caseText, modelId = 'hybrid') => {
    return request('/predict', {
      method: 'POST',
      body: JSON.stringify({ caseText, modelId }),
    });
  },

  // 获取样例病例
  getSampleCases: async () => {
    return request('/predict/samples');
  },

  // 批量预测
  batchPredict: async (cases) => {
    return request('/predict/batch', {
      method: 'POST',
      body: JSON.stringify({ cases }),
    });
  },
};

/**
 * 解释服务
 */
export const explainAPI = {
  // 生成编码解释
  generate: async (caseText, codes) => {
    return request('/explain', {
      method: 'POST',
      body: JSON.stringify({ caseText, codes }),
    });
  },

  // 获取证据定位
  getEvidence: async (caseText, code) => {
    return request('/explain/evidence', {
      method: 'POST',
      body: JSON.stringify({ caseText, code }),
    });
  },
};

/**
 * 知识图谱服务
 */
export const graphAPI = {
  // 搜索编码
  search: async (keyword) => {
    return request(`/graph/search?q=${encodeURIComponent(keyword)}`);
  },

  // 获取编码详情
  getDetail: async (code) => {
    return request(`/graph/code/${encodeURIComponent(code)}`);
  },

  // 获取父子关系
  getHierarchy: async (code) => {
    return request(`/graph/hierarchy/${encodeURIComponent(code)}`);
  },

  // 获取相关编码
  getRelated: async (code, limit = 10) => {
    return request(`/graph/related/${encodeURIComponent(code)}?limit=${limit}`);
  },

  // 获取图谱数据（可视化用）
  getGraphData: async (rootCode, depth = 2) => {
    return request(`/graph/visualize/${encodeURIComponent(rootCode)}?depth=${depth}`);
  },
};

/**
 * 模型服务
 */
export const modelsAPI = {
  // 获取可用模型列表
  list: async () => {
    return request('/models');
  },

  // 获取模型详情
  getDetail: async (modelId) => {
    return request(`/models/${modelId}`);
  },

  // 获取模型性能指标
  getMetrics: async (modelId) => {
    return request(`/models/${modelId}/metrics`);
  },
};

/**
 * 模型配置服务
 */
export const modelConfigAPI = {
  list: async () => request('/model-configs'),
  get: async (id) => request(`/model-configs/${id}`),
  create: async (config) => request('/model-configs', { method: 'POST', body: JSON.stringify(config) }),
  update: async (id, config) => request(`/model-configs/${id}`, { method: 'PUT', body: JSON.stringify(config) }),
  delete: async (id) => request(`/model-configs/${id}`, { method: 'DELETE' }),
};

/**
 * 工作流服务
 */
export const workflowAPI = {
  list: async () => request('/workflow'),
  get: async (id) => request(`/workflow/${id}`),
  create: async (workflow) => request('/workflow', { method: 'POST', body: JSON.stringify(workflow) }),
  update: async (id, workflow) => request(`/workflow/${id}`, { method: 'PUT', body: JSON.stringify(workflow) }),
  delete: async (id) => request(`/workflow/${id}`, { method: 'DELETE' }),
  execute: async (id, input) => request(`/workflow/${id}/execute`, { method: 'POST', body: JSON.stringify(input) }),
};

/**
 * 编码工作台服务
 */
export const codingWorkbenchAPI = {
  // 获取编码池
  getPool: async (caseId) => {
    const result = await request(`/coding-workbench/pool/${caseId}`);
    return result.data || result;
  },

  // 设置主要诊断
  setPrincipalDx: async (caseId, codeItem) => {
    const result = await request(`/coding-workbench/pool/${caseId}/principal-dx`, {
      method: 'POST',
      body: JSON.stringify({
        code: codeItem.code,
        description: codeItem.description,
        confidence: codeItem.confidence || 0.9,
        evidence: codeItem.evidence,
        source: codeItem.source || 'ai_suggested'
      }),
    });
    return result.data || result;
  },

  // 添加其他诊断
  addSecondaryDx: async (caseId, codeItem) => {
    const result = await request(`/coding-workbench/pool/${caseId}/secondary-dx`, {
      method: 'POST',
      body: JSON.stringify({
        code: codeItem.code,
        description: codeItem.description,
        confidence: codeItem.confidence || 0.9,
        evidence: codeItem.evidence,
        source: codeItem.source || 'ai_suggested'
      }),
    });
    return result.data || result;
  },

  // 添加手术操作
  addProcedure: async (caseId, codeItem) => {
    const result = await request(`/coding-workbench/pool/${caseId}/procedures`, {
      method: 'POST',
      body: JSON.stringify({
        code: codeItem.code,
        description: codeItem.description,
        confidence: codeItem.confidence || 0.9,
        evidence: codeItem.evidence,
        source: codeItem.source || 'ai_suggested'
      }),
    });
    return result.data || result;
  },

  // 重新排序编码
  reorderCodes: async (caseId, category, oldIndex, newIndex) => request(`/coding-workbench/pool/${caseId}/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ category, old_index: oldIndex, new_index: newIndex }),
  }),

  // 删除编码
  removeCode: async (caseId, category, index) => request(`/coding-workbench/pool/${caseId}/code`, {
    method: 'DELETE',
    body: JSON.stringify({ category, index }),
  }),

  // 编码校验 (GET endpoint)
  validate: async (caseId) => {
    const result = await request(`/coding-workbench/pool/${caseId}/validate`);
    return result.data || result;
  },

  // 批量导入预测结果
  batchImport: async (caseId, predictions) => {
    const result = await request(`/coding-workbench/pool/${caseId}/batch-import`, {
      method: 'POST',
      body: JSON.stringify({ predictions }),
    });
    return result;
  },

  // DRG建议
  getDrgSuggestions: async (caseId, caseText) => {
    const result = await request(`/coding-workbench/drg-suggestions/${caseId}`, {
      method: 'POST',
      body: JSON.stringify({ caseText: caseText || '' }),
    });
    return result.data || result;
  },

  // 应用DRG建议
  applyDrgSuggestion: async (caseId, suggestionId) => request(`/coding-workbench/drg-suggestions/${caseId}/apply`, {
    method: 'POST',
    body: JSON.stringify({ suggestion_id: suggestionId }),
  }),

  // 特殊编码检测
  detectSpecialCoding: async (caseId, caseText) => {
    const result = await request(`/coding-workbench/special-coding/detect/${caseId}`, {
      method: 'POST',
      body: JSON.stringify({ caseText: caseText || '' }),
    });
    return result.data || result;
  },
};

/**
 * 工作队列服务
 */
export const worklistAPI = {
  // 获取队列列表
  list: async (filters = {}, page = 1, pageSize = 20) => {
    const params = new URLSearchParams({
      page,
      page_size: pageSize,
      user_id: filters.user_id || 1,
      user_role: filters.user_role || 'coder',
    });
    // 处理布尔类型和特殊筛选参数
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'user_id' || key === 'user_role' || key === 'page' || key === 'page_size') return;
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const result = await request(`/case-flow/worklist?${params}`);
    return {
      ...result,
      data: result.data ? {
        ...result.data,
        items: (result.data.items || []).map(mapWorklistItem)
      } : result.data
    };
  },

  // 领取病例
  claim: async (caseId, userId) => request(`/case-flow/worklist/${caseId}/claim?user_id=${userId}&user_name=`, {
    method: 'POST',
  }),

  // 释放病例
  release: async (caseId, userId = 1) => request(`/case-flow/worklist/${caseId}/release?user_id=${userId}`, {
    method: 'POST',
  }),

  // 批量操作
  batchAction: async (caseIds, action) => request('/case-flow/worklist/batch', {
    method: 'POST',
    body: JSON.stringify({ case_ids: caseIds, action }),
  }),

  // 获取SLA告警
  getSlaAlerts: async () => request('/case-flow/worklist/sla-alerts'),

  // 获取队列摘要
  getSummary: async (userId = 1, userRole = 'coder') => {
    const result = await request(`/case-flow/worklist?user_id=${userId}&user_role=${userRole}&page=1&page_size=1000`);
    return result.data?.summary || {};
  },
};

/**
 * 质控服务
 */
export const qaAPI = {
  // 获取待审列表 (使用 pending/list 端点)
  getQaList: async (status = 'pending_qa', filters = {}) => {
    const params = new URLSearchParams({ limit: filters.limit || 50, ...filters });
    const result = await request(`/case-flow/qa/pending/list?${params}`);
    return {
      ...result,
      data: (result.data || []).map(mapQaItem)
    };
  },

  // 获取质控详情
  getQaDetail: async (caseId) => request(`/case-flow/qa/${caseId}/comparison`),

  // 质控决策 (通过/打回/强行通过)
  submitQaResult: async (caseId, decision, comment, issues = []) => {
    // decision: approve, reject, force_approve
    return request(`/case-flow/qa/${caseId}/decision?decision=${decision}&comment=${encodeURIComponent(comment)}&qa_officer_id=1`, {
      method: 'POST',
    });
  },

  // 获取质控对比视图
  getComparisonView: async (caseId) => request(`/case-flow/qa/${caseId}/comparison`),

  // 版本对比
  compareVersions: async (caseId, versionA, versionB) => request(`/case-flow/qa/${caseId}/compare`, {
    method: 'POST',
    body: JSON.stringify({ version_a: versionA, version_b: versionB }),
  }),

  // 获取质控统计
  getStats: async (qaOfficerId = null, days = 30) => {
    const params = new URLSearchParams({ days, ...(qaOfficerId && { qa_officer_id: qaOfficerId }) });
    return request(`/case-flow/qa/statistics?${params}`);
  },

  // 获取质控历史记录
  getHistory: async (caseId) => request(`/case-flow/qa/${caseId}/history`),
};

/**
 * Dashboard服务 - 获取首页数据
 */
export const dashboardAPI = {
  // 获取最近处理记录
  getRecentCases: async (limit = 10, userId = null) => {
    const params = new URLSearchParams({ limit });
    if (userId) params.append('user_id', userId);
    const result = await request(`/case-flow/recent?${params}`);
    return result;
  },

  // 获取病例操作历史
  getCaseHistory: async (caseId, limit = 50) => {
    return request(`/case-flow/recent/${caseId}/history?limit=${limit}`);
  },
};

/**
 * 字典服务
 */
export const dictionaryAPI = {
  // 获取字典版本
  getVersions: async () => request('/system/dictionary/versions'),

  // 搜索ICD编码
  searchIcd: async (keyword, version = 'icd10-2024', limit = 20) => {
    const params = new URLSearchParams({ keyword, version, limit });
    return request(`/system/dictionary/icd/search?${params}`);
  },

  // 获取院内术语映射
  getHospitalTermMapping: async (term) => request('/system/dictionary/hospital-term/mapping', {
    method: 'POST',
    body: JSON.stringify({ term }),
  }),

  // 添加院内术语映射
  addHospitalTermMapping: async (term, standardCode, description) => request('/system/dictionary/hospital-term/add', {
    method: 'POST',
    body: JSON.stringify({ hospital_term: term, standard_code: standardCode, description }),
  }),

  // 获取映射列表
  getMappings: async (page = 1, pageSize = 50) => {
    const params = new URLSearchParams({ page, page_size: pageSize });
    return request(`/system/dictionary/hospital-term/list?${params}`);
  },
};

/**
 * 审计日志服务
 */
export const auditAPI = {
  // 获取日志列表
  getLogs: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    return request(`/system/audit/logs?${params}`);
  },

  // 获取病例审计链
  getCaseAuditTrail: async (caseId) => request(`/system/audit/case/${caseId}`),

  // 记录操作
  logAction: async (actionType, details = {}) => request('/system/audit/log', {
    method: 'POST',
    body: JSON.stringify({
      action_type: actionType,
      details,
      case_id: details?.caseId || details?.case_id || 'UNKNOWN',
      user_id: 1,  // 默认用户ID，后续从认证上下文获取
    }),
  }),
};

/**
 * 系统健康检查
 */
export const healthAPI = {
  check: async () => request('/'),
  backendInfo: async () => request('/'),
};

export default {
  predict: predictAPI,
  explain: explainAPI,
  graph: graphAPI,
  models: modelsAPI,
  modelConfig: modelConfigAPI,
  workflow: workflowAPI,
  codingWorkbench: codingWorkbenchAPI,
  worklist: worklistAPI,
  qa: qaAPI,
  dictionary: dictionaryAPI,
  audit: auditAPI,
  health: healthAPI,
};
