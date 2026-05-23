/**
 * 工作流 API 封装
 */
import client from './client';

export function listWorkflows() {
  return client.get('/workflow');
}

export function getWorkflow(id) {
  return client.get(`/workflow/${id}`);
}

export function saveWorkflow(data) {
  return client.post('/workflow', data);
}

export function updateWorkflow(id, data) {
  return client.put(`/workflow/${id}`, data);
}

export function deleteWorkflow(id) {
  return client.del(`/workflow/${id}`);
}

export function executeWorkflow(workflow, input) {
  return client.post('/workflow/execute', {
    workflow,
    input,
  });
}
