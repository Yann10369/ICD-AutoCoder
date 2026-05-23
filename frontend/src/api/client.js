/**
 * 统一API客户端封装
 */

const BASE_URL = ''; // 相对路径，由nginx代理到后端

/**
 * 基础请求封装
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}/api${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = data?.message || data?.detail || response.statusText;
      throw new Error(message);
    }

    // 如果是统一APIResponse格式，返回data字段
    if (data && typeof data === 'object' && 'code' in data && 'data' in data) {
      if (data.code !== 200) {
        throw new Error(data.message || 'Request failed');
      }
      return data.data;
    }

    return data;
  } catch (err) {
    console.error(`API请求错误 [${endpoint}]:`, err);
    throw err;
  }
}

/**
 * GET 请求
 */
export function get(endpoint) {
  return request(endpoint, { method: 'GET' });
}

/**
 * POST 请求
 */
export function post(endpoint, body) {
  return request(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT 请求
 */
export function put(endpoint, body) {
  return request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE 请求
 */
export function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

export default {
  get,
  post,
  put,
  delete: del,
};
