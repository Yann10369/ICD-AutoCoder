/**
 * 系统基础能力 API 服务层
 * 对接后端 /api/system 系列接口
 * 包括：字典管理、审计日志、RLHF训练数据导出
 */

const API_BASE = '/api/system';

// 模拟延迟（开发环境用，生产环境删除）
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 字典管理服务类
 */
class DictionaryService {
  /**
   * 获取ICD-10字典版本列表
   */
  async getDictionaryVersions() {
    try {
      const response = await fetch(`${API_BASE}/dictionary/versions`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return {
        success: true,
        data: [
          { id: 'icd10-2024', name: 'ICD-10 2024版', type: 'icd10', active: true, created_at: '2024-01-01' },
          { id: 'icd10-2023', name: 'ICD-10 2023版', type: 'icd10', active: false, created_at: '2023-01-01' },
          { id: 'cms-drg-v1', name: 'CHS-DRG V1.0', type: 'drg', active: true, created_at: '2023-06-01' }
        ]
      };
    }
  }

  /**
   * 搜索ICD编码
   * @param {string} keyword 关键词
   * @param {string} version 字典版本
   * @param {number} limit 返回数量限制
   */
  async searchIcdCode(keyword, version = 'icd10-2024', limit = 20) {
    try {
      const params = new URLSearchParams({ keyword, version, limit });
      const response = await fetch(`${API_BASE}/dictionary/icd/search?${params}`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      // Mock 搜索结果
      const results = [];
      if (keyword.includes('糖尿病') || keyword.includes('E11')) {
        results.push(
          { code: 'E11.9', description: '2型糖尿病', chapter: 'IV', valid: true },
          { code: 'E11.8', description: '2型糖尿病伴有其他并发症', chapter: 'IV', valid: true },
          { code: 'E11.7', description: '2型糖尿病伴有循环系统并发症', chapter: 'IV', valid: true }
        );
      }
      if (keyword.includes('高血压') || keyword.includes('I10')) {
        results.push(
          { code: 'I10', description: '原发性高血压', chapter: 'IX', valid: true },
          { code: 'I11.9', description: '高血压性心脏病', chapter: 'IX', valid: true }
        );
      }
      if (keyword.includes('心肌梗死') || keyword.includes('I21')) {
        results.push(
          { code: 'I21.3', description: '急性ST段抬高型心肌梗死', chapter: 'IX', valid: true },
          { code: 'I21.9', description: '急性心肌梗死未特指', chapter: 'IX', valid: true }
        );
      }
      return { success: true, data: results };
    }
  }

  /**
   * 获取院内术语映射
   * @param {string} hospitalTerm 院内术语
   */
  async getHospitalTermMapping(hospitalTerm) {
    try {
      const response = await fetch(`${API_BASE}/dictionary/hospital-term/mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: hospitalTerm })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(150);
      return {
        success: true,
        data: {
          standard_codes: [{ code: 'I10', description: '原发性高血压', confidence: 0.95 }],
          similar_terms: ['高血压', '血压高']
        }
      };
    }
  }

  /**
   * 添加院内术语映射
   * @param {string} hospitalTerm 院内术语
   * @param {string} standardCode 标准编码
   * @param {string} description 说明
   */
  async addHospitalTermMapping(hospitalTerm, standardCode, description = '') {
    try {
      const response = await fetch(`${API_BASE}/dictionary/hospital-term/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital_term: hospitalTerm, standard_code: standardCode, description })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return { success: true, mapping_id: Date.now() };
    }
  }

  /**
   * 获取院内术语映射列表
   */
  async getHospitalTermMappings(page = 1, pageSize = 50) {
    try {
      const params = new URLSearchParams({ page, page_size: pageSize });
      const response = await fetch(`${API_BASE}/dictionary/hospital-term/list?${params}`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return {
        success: true,
        data: {
          items: [
            { id: 1, hospital_term: '急性心梗', standard_code: 'I21.3', description: '心肌梗死', created_at: '2024-01-10' },
            { id: 2, hospital_term: '高血压病', standard_code: 'I10', description: '原发性高血压', created_at: '2024-01-08' }
          ],
          total: 25
        }
      };
    }
  }
}

/**
 * 审计日志服务类
 */
class AuditTrailService {
  /**
   * 获取审计日志列表
   * @param {object} filters 筛选条件
   */
  async getAuditLogs(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`${API_BASE}/audit/logs?${params}`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(300);
      return {
        success: true,
        data: {
          items: [
            {
              id: 1,
              case_id: 'CASE-001',
              user_id: 'coder001',
              user_name: '张编码员',
              action_type: 'code_add',
              details: { code: 'I21.3', description: '急性ST段抬高型心肌梗死' },
              ip_address: '192.168.1.100',
              created_at: '2024-01-18T10:30:00Z'
            },
            {
              id: 2,
              case_id: 'CASE-001',
              user_id: 'coder001',
              user_name: '张编码员',
              action_type: 'code_remove',
              details: { code: 'I25.2', reason: '陈旧性心梗非本次住院治疗' },
              ip_address: '192.168.1.100',
              created_at: '2024-01-18T10:35:00Z'
            },
            {
              id: 3,
              case_id: 'CASE-001',
              user_id: 'coder001',
              user_name: '张编码员',
              action_type: 'submit_qa',
              details: { target_status: 'qa_primary' },
              ip_address: '192.168.1.100',
              created_at: '2024-01-18T11:00:00Z'
            }
          ],
          total: 156,
          action_types: ['code_add', 'code_remove', 'code_reorder', 'submit_qa', 'qa_approve', 'qa_return']
        }
      };
    }
  }

  /**
   * 获取病例操作历史链
   * @param {string} caseId 病例ID
   */
  async getCaseAuditTrail(caseId) {
    try {
      const response = await fetch(`${API_BASE}/audit/case/${caseId}`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return {
        success: true,
        data: {
          case_id: caseId,
          trail: [
            { step: 1, action: '病例导入', user: 'system', time: '2024-01-18T08:00:00Z', details: '从HIS系统同步' },
            { step: 2, action: 'AI预测', user: 'system', time: '2024-01-18T08:01:00Z', details: '预测3个编码' },
            { step: 3, action: '领取病例', user: '张编码员', time: '2024-01-18T09:00:00Z', details: '' },
            { step: 4, action: '添加编码', user: '张编码员', time: '2024-01-18T10:30:00Z', details: 'I21.3, E11.9' },
            { step: 5, action: '提交质控', user: '张编码员', time: '2024-01-18T11:00:00Z', details: '共4个编码' }
          ]
        }
      };
    }
  }

  /**
   * 记录审计日志
   * @param {string} actionType 操作类型
   * @param {object} details 详情
   */
  async logAction(actionType, details = {}) {
    try {
      const response = await fetch(`${API_BASE}/audit/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: actionType, details })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败:', error);
      return { success: true };
    }
  }
}

/**
 * RLHF训练数据导出服务类
 */
class RLHFExportService {
  /**
   * 获取RLHF数据集摘要
   */
  async getDatasetSummary() {
    try {
      const response = await fetch(`${API_BASE}/rlhf/summary`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return {
        success: true,
        data: {
          total_samples: 1250,
          ai_feedback_count: 850,
          human_feedback_count: 400,
          positive_rate: 0.78,
          last_export_at: '2024-01-15T14:30:00Z'
        }
      };
    }
  }

  /**
   * 获取RLHF样本列表
   * @param {object} filters 筛选条件
   */
  async getSamples(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`${API_BASE}/rlhf/samples?${params}`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return {
        success: true,
        data: {
          items: [
            {
              id: 'samp_001',
              case_id: 'CASE-001',
              case_text_preview: '患者因胸痛3小时入院...',
              model_prediction: ['I25.2', 'I10'],
              human_correction: ['I21.3', 'I10', 'E11.9'],
              feedback_type: 'human',
              feedback_score: 1,
              created_at: '2024-01-18T11:00:00Z'
            }
          ],
          total: 1250
        }
      };
    }
  }

  /**
   * 导出RLHF训练数据
   * @param {object} options 导出选项
   */
  async exportTrainingData(options = {}) {
    try {
      const response = await fetch(`${API_BASE}/rlhf/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(500);
      return {
        success: true,
        data: {
          export_id: 'exp_' + Date.now(),
          total_samples: 1250,
          download_url: '/api/system/rlhf/download/exp_' + Date.now(),
          format: 'jsonl',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      };
    }
  }

  /**
   * 记录AI模型反馈
   * @param {string} modelId 模型ID
   * @param {string} caseId 病例ID
   * @param {object} prediction 预测结果
   * @param {number} score 评分 0-1
   * @param {string} feedback 反馈说明
   */
  async recordAiFeedback(modelId, caseId, prediction, score, feedback = '') {
    try {
      const response = await fetch(`${API_BASE}/rlhf/feedback/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId, case_id: caseId, prediction, score, feedback })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败:', error);
      return { success: true };
    }
  }

  /**
   * 记录人工反馈
   * @param {string} caseId 病例ID
   * @param {Array} humanCorrection 人工修正结果
   * @param {string} comment 备注
   */
  async recordHumanFeedback(caseId, humanCorrection, comment = '') {
    try {
      const response = await fetch(`${API_BASE}/rlhf/feedback/human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, human_correction: humanCorrection, comment })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败:', error);
      return { success: true };
    }
  }
}

// 导出服务实例
export const dictionaryService = new DictionaryService();
export const auditTrailService = new AuditTrailService();
export const rlhfExportService = new RLHFExportService();

export default {
  dictionary: dictionaryService,
  audit: auditTrailService,
  rlhf: rlhfExportService
};
