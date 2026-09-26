const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

// The access token lives only in memory (never localStorage), so a script injected into the page cannot
// read it from storage. The long-lived refresh token is an httpOnly cookie that JavaScript cannot see.
let accessToken = null;
let refreshPromise = null;
let onUnauthorized = () => {};

function setAccessToken(token) {
  accessToken = token;
}

function clearAccessToken() {
  accessToken = null;
}

function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/**
 * Asks the server for a new session using the refresh cookie. Concurrent callers share ONE request:
 * refresh tokens rotate on every use, so two parallel refreshes would look like token theft.
 */
function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'dukan' },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || 'Session expired');
        accessToken = body.data.accessToken;
        return body.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * request('GET', '/customers', { query: {...} })
 * request('POST', '/customers', { body: {...} })
 */
async function request(method, path, { body, query, retry = true } = {}) {
  let url = `${BASE_URL}${path}`;
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    url += `?${params.toString()}`;
  }

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'dukan',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    try {
      await refreshSession();
      return request(method, path, { body, query, retry: false });
    } catch {
      clearAccessToken();
      onUnauthorized();
      throw new Error('Session expired, please log in again');
    }
  }

  const responseBody = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(responseBody.message || `Request failed: ${res.status}`);
    err.status = res.status;
    err.errors = responseBody.errors;
    throw err;
  }
  return responseBody.data;
}

const api = {
  get: (path, query) => request('GET', path, { query }),
  post: (path, body) => request('POST', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  delete: (path) => request('DELETE', path),
};

export { api, setAccessToken, clearAccessToken, refreshSession, setUnauthorizedHandler, BASE_URL };
