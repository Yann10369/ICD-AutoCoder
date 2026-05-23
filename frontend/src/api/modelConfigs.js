const BASE = '/api/model-configs';

const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

async function request(path = '', options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    headers: defaultHeaders,
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = data?.detail || response.statusText;
    throw new Error(detail);
  }
  return data;
}

export function listConfigs() {
  return request('');
}

export function createConfig(payload) {
  return request('', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateConfig(id, payload) {
  return request(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteConfig(id) {
  return request(`/${id}`, {
    method: 'DELETE',
  });
}

export function validateConfig(id) {
  return request(`/${id}/validate`, {
    method: 'POST',
  });
}

export function testGraphConnection(id) {
  return request(`/${id}/test-graph`, {
    method: 'POST',
  });
}

export function toggleEnabled(id) {
  return request(`/${id}/toggle-enabled`, {
    method: 'POST',
  });
}
