/**
 * 编码工作台 API 服务层
 * 对接后端 /api/coding-workbench 系列接口
 * 统一管理编码池、质量校验、DRG建议等API调用
 */

const API_BASE = '/api/coding-workbench';

// 模拟延迟（开发环境用，生产环境删除）
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 编码池服务类
 */
class CodingPoolService {
  /**
   * 获取病例的编码池
   * @param {string} caseId 病例ID
   */
  async getCodingPool(caseId) {
    try {
      const response = await fetch(`${API_BASE}/pool/${caseId}`);
      if (!response.ok) throw new Error('获取编码池失败');
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      // Mock 数据
      await delay(300);
      return {
        success: true,
        data: {
          principal_dx: null,
          secondary_dx: [],
          procedures: []
        }
      };
    }
  }

  /**
   * 设置主要诊断
   * @param {string} caseId 病例ID
   * @param {object} codeItem 编码项 {code, description, evidence, source}
   */
  async setPrincipalDx(caseId, codeItem) {
    try {
      const response = await fetch(`${API_BASE}/pool/${caseId}/principal-dx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codeItem)
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return {
        success: true,
        data: { principal_dx: codeItem },
        warnings: [],
        need_confirm: false
      };
    }
  }

  /**
   * 添加其他诊断
   * @param {string} caseId 病例ID
   * @param {object} codeItem 编码项
   */
  async addSecondaryDx(caseId, codeItem) {
    try {
      const response = await fetch(`${API_BASE}/pool/${caseId}/secondary-dx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codeItem)
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return { success: true, index: 0 };
    }
  }

  /**
   * 添加手术操作
   * @param {string} caseId 病例ID
   * @param {object} codeItem 编码项
   */
  async addProcedure(caseId, codeItem) {
    try {
      const response = await fetch(`${API_BASE}/pool/${caseId}/procedures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codeItem)
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return { success: true, index: 0 };
    }
  }

  /**
   * 调整编码顺序
   * @param {string} caseId 病例ID
   * @param {string} category secondary_dx / procedures
   * @param {number} oldIndex 原位置
   * @param {number} newIndex 新位置
   */
  async reorderCodes(caseId, category, oldIndex, newIndex) {
    try {
      const response = await fetch(`${API_BASE}/pool/${caseId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, oldIndex, newIndex })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return { success: true };
    }
  }

  /**
   * 将副诊提升为主诊
   * @param {string} caseId 病例ID
   * @param {number} index 副诊索引
   */
  async promoteToPrincipal(caseId, index) {
    try {
      const response = await fetch(`${API_BASE}/pool/${caseId}/promote-principal/${index}`, {
        method: 'PUT'
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return { success: true };
    }
  }

  /**
   * 删除编码
   * @param {string} caseId 病例ID
   * @param {string} category 分区
   * @param {number} index 索引
   */
  async removeCode(caseId, category, index) {
    try {
      const response = await fetch(`${API_BASE}/pool/${caseId}/code`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, index })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return { success: true };
    }
  }

  /**
   * 批量导入预测结果
   * @param {string} caseId 病例ID
   * @param {Array} predictions 预测编码列表
   */
  async batchImportCodes(caseId, predictions) {
    try {
      const response = await fetch(`${API_BASE}/pool/${caseId}/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(500);
      return {
        success: true,
        imported: predictions.length,
        as_principal: 1,
        as_secondary: predictions.length - 1
      };
    }
  }
}

/**
 * 编码质量校验服务类
 */
class CodingValidationService {
  /**
   * 执行完整的编码质量校验
   * @param {string} caseId 病例ID
   */
  async validateCodingPool(caseId) {
    try {
      const response = await fetch(`${API_BASE}/pool/${caseId}/validate`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(400);
      // Mock 校验结果
      return {
        success: true,
        canSubmit: true,
        data: {
          score: 85,
          errors: [
            {
              type: 'completeness',
              severity: 'warning',
              message: '建议补充至少1个合并症编码以提高DRG权重',
              code: null,
              fixable: false,
              details: '补充并发症编码可以提高约0.1-0.3的DRG权重'
            },
            {
              type: 'principal_diagnosis',
              severity: 'suggestion',
              message: '主要诊断编码I21.3建议核对是否为主要治疗原因',
              code: 'I21.3',
              fixable: false,
              details: '主要诊断应选择本次住院主要治疗的疾病'
            }
          ],
          stats: {
            principal_dx_set: true,
            secondary_dx_count: 3,
            procedure_count: 0,
            special_coding_complete: true
          }
        }
      };
    }
  }

  /**
   * 特殊编码检测
   * @param {string} caseId 病例ID
   * @param {string} caseText 病历文本
   */
  async detectSpecialCoding(caseId, caseText) {
    try {
      const response = await fetch(`${API_BASE}/special-coding/detect/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseText })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(300);
      return {
        success: true,
        data: {
          tumor_mcodes: [],
          external_causes: [],
          star_dagger_missing: [],
          warnings: []
        }
      };
    }
  }
}

/**
 * DRG 优化建议服务类
 */
class DrgSuggestionService {
  /**
   * 获取DRG优化建议
   * @param {string} caseId 病例ID
   * @param {string} caseText 病历文本（用于证据定位）
   */
  async getDrgSuggestions(caseId, caseText = '') {
    try {
      const response = await fetch(`${API_BASE}/drg-suggestions/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseText })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(500);
      // Mock DRG建议数据
      return {
        success: true,
        data: {
          currentDrg: 'FK29',
          currentWeight: 2.85,
          estimatedPayment: 42750,
          suggestions: [
            {
              id: 'sugg_001',
              type: 'complication',
              code: 'E11.9',
              description: '2型糖尿病',
              keyword: '糖尿病',
              reason: '病历中提及糖尿病史，建议添加并发症编码',
              weightDelta: 0.15,
              estimatedGain: 2250,
              originalDrg: 'FK29',
              newDrg: 'FK21',
              evidence: {
                found: true,
                start: 120,
                end: 135,
                snippet: '既往有高血压、糖尿病史'
              }
            },
            {
              id: 'sugg_002',
              type: 'complication',
              code: 'I10',
              description: '原发性高血压',
              keyword: '高血压',
              reason: '病历中提及高血压史，建议添加合并症编码',
              weightDelta: 0.08,
              estimatedGain: 1200,
              originalDrg: 'FK29',
              newDrg: 'FK21',
              evidence: {
                found: true,
                start: 115,
                end: 125,
                snippet: '既往有高血压病史'
              }
            }
          ],
          totalPotentialGain: 3450
        }
      };
    }
  }

  /**
   * 应用DRG建议
   * @param {string} caseId 病例ID
   * @param {string} suggestionId 建议ID
   */
  async applySuggestion(caseId, suggestionId) {
    try {
      const response = await fetch(`${API_BASE}/drg-suggestions/${caseId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(300);
      return { success: true };
    }
  }

  /**
   * 计算DRG边际收益
   * @param {string} caseId 病例ID
   * @param {object} suggestion 建议
   */
  async calculateMarginalGain(caseId, suggestion) {
    try {
      const response = await fetch(`${API_BASE}/drg-suggestions/${caseId}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suggestion)
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return {
        success: true,
        weightDelta: 0.15,
        estimatedGain: 2250
      };
    }
  }
}

// 导出服务实例
export const codingPoolService = new CodingPoolService();
export const codingValidationService = new CodingValidationService();
export const drgSuggestionService = new DrgSuggestionService();

export default {
  codingPool: codingPoolService,
  validation: codingValidationService,
  drg: drgSuggestionService
};
