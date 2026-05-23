/**
 * NER质量控制服务
 * 调用NER和ICD预测服务，为质控页面提供统一的AI预测结果
 */

const NER_SERVICE_URL = 'http://localhost:8002';
const PLM_ICD_SERVICE_URL = 'http://localhost:8001';

// 通用请求处理
const request = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
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

/**
 * NER质量控制服务
 */
class NerQualityService {
  /**
   * 获取NER实体识别结果
   * @param {string} text 医疗文本
   * @returns {Promise<Array>} 实体列表
   */
  async getEntities(text) {
    if (!text || text.trim() === '') {
      return [];
    }

    try {
      const result = await request(`${NER_SERVICE_URL}/models/ner/predict`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      return result.entities || [];
    } catch (error) {
      console.error('NER识别失败:', error);
      return [];
    }
  }

  /**
   * 获取ICD编码预测结果
   * @param {string} text 医疗文本
   * @param {number} topK 返回数量
   * @param {number} threshold 置信度阈值
   * @returns {Promise<Array>} ICD编码列表
   */
  async getIcdPredictions(text, topK = 10, threshold = 0.01) {
    if (!text || text.trim() === '') {
      return [];
    }

    try {
      const result = await request(`${PLM_ICD_SERVICE_URL}/models/plm-icd/predict`, {
        method: 'POST',
        body: JSON.stringify({ text, top_k: topK, threshold }),
      });
      return result.results || [];
    } catch (error) {
      console.error('ICD预测失败:', error);
      return [];
    }
  }

  /**
   * 获取联合预测结果（NER + ICD）
   * @param {string} text 医疗文本
   * @param {Object} options 配置选项
   * @returns {Promise<Object>} 联合预测结果
   */
  async getCombinedPrediction(text, options = {}) {
    const { topK = 10, threshold = 0.01 } = options;

    if (!text || text.trim() === '') {
      return {
        entities: [],
        icdPredictions: [],
        text: '',
      };
    }

    // 并行调用NER和ICD服务
    const [entities, icdPredictions] = await Promise.all([
      this.getEntities(text),
      this.getIcdPredictions(text, topK, threshold),
    ]);

    // 实体按类型分组
    const groupedEntities = this.groupEntitiesByType(entities);

    return {
      entities,
      groupedEntities,
      icdPredictions,
      text,
      entityCount: entities.length,
      icdCount: icdPredictions.length,
    };
  }

  /**
   * 按类型分组实体
   * @param {Array} entities 实体列表
   * @returns {Object} 分组后的实体
   */
  groupEntitiesByType(entities) {
    const groups = {
      Disease: [],
      Drug: [],
      Procedure: [],
      Problem: [],
      Other: [],
    };

    entities.forEach(entity => {
      const type = entity.entity_group || entity.entity_group || 'Other';
      if (groups[type]) {
        groups[type].push(entity);
      } else {
        groups.Other.push(entity);
      }
    });

    return groups;
  }

  /**
   * 获取服务健康状态
   * @returns {Promise<Object>} 健康状态
   */
  async getHealthStatus() {
    try {
      const [nerHealth, icdHealth] = await Promise.all([
        request(`${NER_SERVICE_URL}/models/ner/health`).catch(() => ({ status: 'unavailable' })),
        request(`${PLM_ICD_SERVICE_URL}/models/plm-icd/health`).catch(() => ({ status: 'unavailable' })),
      ]);

      return {
        ner: nerHealth.status === 'healthy',
        icd: icdHealth.status === 'healthy',
        nerModel: nerHealth.model || 'unknown',
        icdModel: icdHealth.model || 'unknown',
      };
    } catch (error) {
      console.error('获取健康状态失败:', error);
      return {
        ner: false,
        icd: false,
        nerModel: 'unknown',
        icdModel: 'unknown',
      };
    }
  }
}

// 导出服务实例
export const nerQualityService = new NerQualityService();

export default nerQualityService;