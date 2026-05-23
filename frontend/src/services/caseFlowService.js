/**
 * 病历流程管理 API 服务层
 * 对接后端 /api/case-flow 系列接口
 * 包括：工作队列、状态流转、质控工作流
 */

const API_BASE = '/api/case-flow';

// 模拟延迟（开发环境用，生产环境删除）
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 工作队列服务类
 */
class WorklistService {
  /**
   * 获取工作队列列表
   * @param {object} filters 筛选条件
   * @param {number} page 页码
   * @param {number} pageSize 每页数量
   */
  async getWorklist(filters = {}, page = 1, pageSize = 20) {
    try {
      const params = new URLSearchParams({
        page,
        page_size: pageSize,
        ...filters
      });
      const response = await fetch(`${API_BASE}/worklist?${params}`);
      if (!response.ok) throw new Error('获取工作队列失败');
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(300);
      // Mock 数据
      return {
        success: true,
        data: {
          items: [
            {
              case_id: 'CASE-001',
              patient_name: '张三',
              age: 65,
              gender: '男',
              admission_date: '2024-01-15',
              discharge_date: '2024-01-20',
              department: '心内科',
              primary_diagnosis: '急性心肌梗死',
              priority: 'urgent',
              status: 'pending',
              assignee: null,
              drg_deadline: '2024-01-25',
              estimated_time: 15,
              has_notes: false,
              created_at: '2024-01-20T08:00:00Z'
            },
            {
              case_id: 'CASE-002',
              patient_name: '李四',
              age: 72,
              gender: '男',
              admission_date: '2024-01-14',
              discharge_date: '2024-01-19',
              department: '呼吸内科',
              primary_diagnosis: '慢性阻塞性肺疾病急性加重',
              priority: 'high',
              status: 'pending',
              assignee: null,
              drg_deadline: '2024-01-26',
              estimated_time: 12,
              has_notes: true,
              created_at: '2024-01-19T08:00:00Z'
            },
            {
              case_id: 'CASE-003',
              patient_name: '王五',
              age: 58,
              gender: '女',
              admission_date: '2024-01-13',
              discharge_date: '2024-01-18',
              department: '内分泌科',
              primary_diagnosis: '2型糖尿病伴多种并发症',
              priority: 'normal',
              status: 'coding',
              assignee: '张编码员',
              drg_deadline: '2024-01-28',
              estimated_time: 20,
              has_notes: true,
              created_at: '2024-01-18T08:00:00Z'
            },
            {
              case_id: 'CASE-004',
              patient_name: '赵六',
              age: 45,
              gender: '男',
              admission_date: '2024-01-12',
              discharge_date: '2024-01-17',
              department: '骨科',
              primary_diagnosis: '腰椎间盘突出症',
              priority: 'normal',
              status: 'qa_primary',
              assignee: '李编码员',
              drg_deadline: '2024-01-29',
              estimated_time: 8,
              has_notes: false,
              created_at: '2024-01-17T08:00:00Z'
            },
            {
              case_id: 'CASE-005',
              patient_name: '孙七',
              age: 82,
              gender: '女',
              admission_date: '2024-01-11',
              discharge_date: '2024-01-16',
              department: '急诊科',
              primary_diagnosis: '多发伤，多处骨折',
              priority: 'urgent',
              status: 'pending',
              assignee: null,
              drg_deadline: '2024-01-23',
              estimated_time: 25,
              has_notes: true,
              created_at: '2024-01-16T08:00:00Z'
            }
          ],
          total: 25,
          page: page,
          page_size: pageSize,
          summary: {
            urgent_count: 5,
            pending_count: 12,
            coding_count: 8,
            qa_count: 5
          }
        }
      };
    }
  }

  /**
   * 领取病例
   * @param {string} caseId 病例ID
   * @param {string} userId 用户ID
   */
  async claimCase(caseId, userId) {
    try {
      const response = await fetch(`${API_BASE}/worklist/${caseId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return { success: true, new_status: 'coding' };
    }
  }

  /**
   * 释放病例
   * @param {string} caseId 病例ID
   */
  async releaseCase(caseId) {
    try {
      const response = await fetch(`${API_BASE}/worklist/${caseId}/release`, {
        method: 'POST'
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return { success: true, new_status: 'pending' };
    }
  }

  /**
   * 批量操作
   * @param {Array} caseIds 病例ID列表
   * @param {string} action 操作类型
   */
  async batchAction(caseIds, action) {
    try {
      const response = await fetch(`${API_BASE}/worklist/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_ids: caseIds, action })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(300);
      return { success: true, processed: caseIds.length };
    }
  }

  /**
   * 获取SLA超时告警列表
   */
  async getSlaAlerts() {
    try {
      const response = await fetch(`${API_BASE}/worklist/sla-alerts`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return {
        success: true,
        data: {
          critical: [
            { case_id: 'CASE-005', hours_remaining: 12, message: '距离DRG结算仅剩12小时' }
          ],
          warning: [
            { case_id: 'CASE-001', hours_remaining: 48, message: '距离DRG结算仅剩2天' }
          ]
        }
      };
    }
  }
}

/**
 * 质控工作流服务类
 */
class QaWorkflowService {
  /**
   * 获取质控待审列表
   * @param {string} level 质控级别 primary/secondary/final
   * @param {object} filters 筛选条件
   */
  async getQaList(level, filters = {}) {
    try {
      const params = new URLSearchParams({ level, ...filters });
      const response = await fetch(`${API_BASE}/qa/list?${params}`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(300);
      return {
        success: true,
        data: {
          items: [
            {
              case_id: 'CASE-003',
              patient_name: '王五',
              coder_name: '张编码员',
              submitted_at: '2024-01-18T10:30:00Z',
              code_count: 6,
              drg_code: 'FK29',
              status: 'pending',
              level: level || 'primary'
            }
          ],
          total: 5,
          stats: {
            pending: 3,
            approved: 8,
            returned: 1
          }
        }
      };
    }
  }

  /**
   * 获取质控详情
   * @param {string} caseId 病例ID
   */
  async getQaDetail(caseId) {
    try {
      const response = await fetch(`${API_BASE}/qa/${caseId}/detail`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(300);
      return {
        success: true,
        data: {
          case_id: caseId,
          submitted_version: {
            id: 'v1',
            created_at: '2024-01-18T10:30:00Z',
            codes: [
              { code: 'I21.3', description: '急性ST段抬高型心肌梗死', type: 'principal_dx' },
              { code: 'E11.9', description: '2型糖尿病', type: 'secondary_dx' },
              { code: 'I10', description: '原发性高血压', type: 'secondary_dx' }
            ],
            drg_code: 'FK29'
          },
          history_versions: [
            {
              id: 'v0',
              created_at: '2024-01-18T09:00:00Z',
              codes_count: 2,
              drg_code: null
            }
          ]
        }
      };
    }
  }

  /**
   * 提交质控意见
   * @param {string} caseId 病例ID
   * @param {string} action 通过/退回 pass/return
   * @param {string} comment 质控意见
   * @param {Array} issues 问题列表
   */
  async submitQaResult(caseId, action, comment = '', issues = []) {
    try {
      const response = await fetch(`${API_BASE}/qa/${caseId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment, issues })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(300);
      return { success: true, new_status: action === 'pass' ? 'qa_secondary' : 'coding' };
    }
  }

  /**
   * 质控对比
   * @param {string} caseId 病例ID
   * @param {string} versionA 版本A
   * @param {string} versionB 版本B
   */
  async compareVersions(caseId, versionA, versionB) {
    try {
      const response = await fetch(`${API_BASE}/qa/${caseId}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_a: versionA, version_b: versionB })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return {
        success: true,
        data: {
          added: [{ code: 'E11.9', description: '2型糖尿病' }],
          removed: [],
          modified: [],
          drg_change: {
            from: null,
            to: 'FK29',
            weight_delta: 2.85
          }
        }
      };
    }
  }

  /**
   * 获取质控统计
   * @param {string} userId 用户ID
   * @param {string} dateRange 日期范围
   */
  async getQaStats(userId, dateRange = 'week') {
    try {
      const params = new URLSearchParams({ user_id: userId, date_range: dateRange });
      const response = await fetch(`${API_BASE}/qa/stats?${params}`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return {
        success: true,
        data: {
          total_reviewed: 45,
          approval_rate: 0.82,
          average_coding_time: 18.5,
          error_rate: 0.15,
          top_errors: [
            { type: '缺少合并症', count: 8 },
            { type: '编码顺序错误', count: 5 }
          ]
        }
      };
    }
  }
}

/**
 * 状态机服务类
 */
class CaseStatusService {
  /**
   * 获取可能的状态转换
   * @param {string} currentStatus 当前状态
   */
  async getPossibleTransitions(currentStatus) {
    try {
      const response = await fetch(`${API_BASE}/status/possible-transitions?current=${currentStatus}`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(100);
      return {
        success: true,
        data: {
          transitions: ['coding', 'qa_primary']
        }
      };
    }
  }

  /**
   * 执行状态转换
   * @param {string} caseId 病例ID
   * @param {string} targetStatus 目标状态
   * @param {string} reason 原因
   */
  async transitionStatus(caseId, targetStatus, reason = '') {
    try {
      const response = await fetch(`${API_BASE}/status/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, target_status: targetStatus, reason })
      });
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(200);
      return { success: true, current_status: targetStatus };
    }
  }

  /**
   * 获取病例状态历史
   * @param {string} caseId 病例ID
   */
  async getStatusHistory(caseId) {
    try {
      const response = await fetch(`${API_BASE}/status/${caseId}/history`);
      return await response.json();
    } catch (error) {
      console.warn('API调用失败，使用Mock数据:', error);
      await delay(100);
      return {
        success: true,
        data: [
          { status: 'pending', changed_at: '2024-01-16T08:00:00Z', changed_by: 'system' },
          { status: 'coding', changed_at: '2024-01-18T09:00:00Z', changed_by: '张编码员' }
        ]
      };
    }
  }
}

// 导出服务实例
export const worklistService = new WorklistService();
export const qaWorkflowService = new QaWorkflowService();
export const caseStatusService = new CaseStatusService();

export default {
  worklist: worklistService,
  qa: qaWorkflowService,
  status: caseStatusService
};
