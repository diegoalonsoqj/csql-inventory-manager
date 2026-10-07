const BASE = import.meta.env.VITE_API_URL ?? '/api';

const CSRF_COOKIE = 'csqlim_csrf';

// Limpieza única: elimina el token que versiones previas guardaban en
// localStorage (ahora la sesión vive en una cookie httpOnly). Inofensivo si no existe.
try { localStorage.removeItem('csqlim_token'); } catch { /* ignore */ }

// Lee el valor de una cookie legible por JS (la de sesión es httpOnly y NO se lee).
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// Notifica a la app cuando la sesión deja de ser válida (401) para forzar logout.
function emitUnauthorized() {
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function buildHeaders(method, extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  // El token CSRF solo es necesario en métodos que modifican estado.
  if (MUTATING.has((method ?? 'GET').toUpperCase())) {
    const csrf = getCookie(CSRF_COOKIE);
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  return headers;
}

async function request(path, options = {}) {
  const method = options.method ?? 'GET';
  const res = await fetch(`${BASE}${path}`, {
    // Cookies (sesión httpOnly + CSRF) viajan solas al ser mismo-origen.
    credentials: 'same-origin',
    ...options,
    headers: buildHeaders(method, options.headers),
  });

  if (res.status === 401) {
    emitUnauthorized();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // ── Auth ──────────────────────────────────────────────
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),
  changePassword: (body) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  updateAppearance: (body) => request('/auth/appearance', { method: 'PATCH', body: JSON.stringify(body) }),

  // ── Usuarios (admin) ──────────────────────────────────
  getUsers: (params) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/users?${qs}`);
  },
  createUser: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  resetUserPassword: (id, password) =>
    request(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // ── Settings ──────────────────────────────────────────
  getSettings: () => request('/settings'),
  getPublicSettings: () => request('/settings/public'),
  updateSettings: (body) => request('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  testAdConnection: (body) =>
    request('/settings/ad/test', { method: 'POST', body: JSON.stringify(body) }),
  testGcpCredential: (service_account_json) =>
    request('/settings/gcp/test', {
      method: 'POST',
      body: JSON.stringify(service_account_json ? { service_account_json } : {}),
    }),

  // ── Datos ─────────────────────────────────────────────
  getDashboardSummary: () => request('/dashboard/summary'),
  getInstances: (params) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/instances?${qs}`);
  },
  getInstance: (id) => request(`/instances/${id}`),
  getInstanceDatabases: (id) => request(`/instances/${id}/databases`),
  getProjects: () => request('/projects/simple'),
  getProjectsList: (params) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/projects?${qs}`);
  },
  createProject: (body) => request('/projects', { method: 'POST', body: JSON.stringify(body) }),
  toggleProject: (projectId) => request(`/projects/${projectId}/toggle`, { method: 'PATCH' }),
  getFilterOptions: () => request('/instances/filter-options'),
  triggerSync: () => request('/sync', { method: 'POST' }),
  getSyncStatus: () => request('/sync/status'),

  // Descarga autenticada del Excel: GET, la cookie de sesión viaja sola.
  downloadExcel: async (params) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    const res = await fetch(`${BASE}/export/excel?${qs}`, { credentials: 'same-origin' });
    if (res.status === 401) {
      emitUnauthorized();
      throw new Error('Sesión expirada');
    }
    if (!res.ok) throw new Error(`No se pudo exportar (HTTP ${res.status})`);

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? 'inventario.xlsx';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
