const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4100';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get:    (path) => request(path),
  post:   (path, body) => request(path, { method: 'POST', body }),
  put:    (path, body) => request(path, { method: 'PUT', body }),
  patch:  (path, body) => request(path, { method: 'PATCH', body }),
  del:    (path) => request(path, { method: 'DELETE' }),
};

export { API_URL };
