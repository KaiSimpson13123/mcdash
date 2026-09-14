let csrfToken: string | null = null;

export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

export const getCsrfToken = () => csrfToken;

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(options.method?.toUpperCase() || 'GET')) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // sends and receives DASHBOARD_SESSION cookie
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new ApiError(response.status, data?.message || response.statusText, data);
  }

  return data as T;
}

export const api = {
  // Auth
  getStatus: () => request<{ setupRequired: boolean; authenticated: boolean; username?: string; csrfToken?: string }>('/api/auth/status'),
  login: (credentials: { username: string; password: string }) =>
    request<{ success: boolean; username: string; csrfToken: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  setup: (payload: { username: string; password: string }) =>
    request<{ success: boolean; username: string; csrfToken: string }>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Server & Metrics
  getServerInfo: () => request<any>('/api/server'),
  getStats: () => request<any>('/api/stats'),
  getWorld: () => request<any>('/api/world'),
  getPerformance: () => request<any>('/api/performance'),

  // Players
  getPlayers: () => request<any[]>('/api/players'),
  kickPlayer: (uuid: string, reason: string) =>
    request<any>(`/api/players/${uuid}/kick`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  banPlayer: (uuid: string, reason: string) =>
    request<any>(`/api/players/${uuid}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  killPlayer: (uuid: string) =>
    request<any>(`/api/players/${uuid}/kill`, { method: 'POST' }),
  opPlayer: (uuid: string) =>
    request<any>(`/api/players/${uuid}/op`, { method: 'POST' }),
  deopPlayer: (uuid: string) =>
    request<any>(`/api/players/${uuid}/deop`, { method: 'POST' }),
  teleportPlayer: (uuid: string, x: number, y: number, z: number, dimension?: string) =>
    request<any>(`/api/players/${uuid}/teleport`, {
      method: 'POST',
      body: JSON.stringify({ x, y, z, dimension }),
    }),

  // Logs
  getLogs: (params?: { level?: string; search?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.level) q.set('level', params.level);
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', params.limit.toString());
    return request<any[]>(`/api/logs?${q.toString()}`);
  },
  downloadLogsUrl: () => '/api/logs/download',

  // Activity
  getActivity: (params?: { limit?: number; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', params.limit.toString());
    if (params?.category) q.set('category', params.category);
    return request<any[]>(`/api/activity?${q.toString()}`);
  },

  // LuckPerms
  getGroups: () => request<any[]>('/api/luckperms/groups'),
  getGroup: (group: string) => request<any>(`/api/luckperms/group/${group}`),
  getUsers: () => request<any[]>('/api/luckperms/users'),
  getUser: (uuid: string) => request<any>(`/api/luckperms/user/${uuid}`),
  getGroupDistribution: () => request<Record<string, number>>('/api/luckperms/distribution'),

  // Chat
  sendChatMessage: (message: string) =>
    request<any>('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};
