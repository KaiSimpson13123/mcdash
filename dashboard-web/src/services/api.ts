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
  changePassword: (payload: { username?: string; currentPassword?: string; newPassword: string }) =>
    request<{ success: boolean; message: string; username?: string }>('/api/auth/password', {
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

  // Whitelist
  getWhitelist: () =>
    request<{ enabled: boolean; count: number; entries: { name: string; uuid?: string }[] }>('/api/whitelist'),
  addToWhitelist: (name: string) =>
    request<{ success: boolean; message: string; name: string }>('/api/whitelist/add', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  removeFromWhitelist: (name: string) =>
    request<{ success: boolean; message: string; name: string }>(`/api/whitelist/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
  toggleWhitelist: (enabled: boolean) =>
    request<{ success: boolean; enabled: boolean; message: string }>('/api/whitelist/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),

  // Player Full Details (Sudo privileged)
  getPlayerFullDetails: (uuid: string) =>
    request<any>(`/api/players/${uuid}/full`),

  // File Explorer
  listFiles: (path?: string) => {
    const q = path ? `?path=${encodeURIComponent(path)}` : '';
    return request<{
      currentPath: string;
      parentPath: string | null;
      canWrite: boolean;
      items: Array<{
        name: string;
        path: string;
        isDirectory: boolean;
        size: number;
        lastModified: string;
        extension: string;
      }>;
    }>(`/api/files/list${q}`);
  },
  readFile: (path: string) =>
    request<{
      name: string;
      path: string;
      content: string;
      size: number;
      lastModified: string;
      canWrite: boolean;
    }>(`/api/files/read?path=${encodeURIComponent(path)}`),
  downloadFileUrl: (path: string) => `/api/files/download?path=${encodeURIComponent(path)}`,
  saveFile: (path: string, content: string) =>
    request<{ success: boolean; message: string; path: string }>('/api/files/save', {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    }),
  uploadFile: (dirPath: string, file: File) => {
    const formData = new FormData();
    formData.append('path', dirPath);
    formData.append('file', file);
    return request<{ success: boolean; message: string; name: string; path: string }>('/api/files/upload', {
      method: 'POST',
      body: formData,
    });
  },
  deleteFile: (path: string) =>
    request<{ success: boolean; message: string; path: string }>('/api/files/delete', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),
  createFileOrDir: (payload: { path: string; name: string; isDirectory: boolean }) =>
    request<{ success: boolean; message: string; path: string }>('/api/files/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  renameFile: (payload: { path: string; newName: string }) =>
    request<{ success: boolean; message: string; path: string }>('/api/files/rename', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Console Execution (privileged to sudo user)
  executeConsoleCommand: (command: string) =>
    request<{ success: boolean; command: string; message: string }>('/api/console/execute', {
      method: 'POST',
      body: JSON.stringify({ command }),
    }),

  // Tactical Radar & Map (Sudo exclusive)
  getMapData: (dimension?: string) => {
    const q = dimension ? `?dimension=${encodeURIComponent(dimension)}` : '';
    return request<MapDataResponse>(`/api/sudo/map${q}`);
  },
  getMapWaypoints: () => request<MapWaypoint[]>('/api/sudo/map/waypoints'),
  createMapWaypoint: (payload: { name: string; x: number; z: number; dimension: string; color?: string }) =>
    request<MapWaypoint>('/api/sudo/map/waypoints', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteMapWaypoint: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/sudo/map/waypoints/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  teleportOnMap: (payload: { uuid: string; x: number; y: number; z: number; dimension: string }) =>
    request<{ success: boolean; message: string }>('/api/sudo/map/teleport', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export interface MapDimension {
  id: string;
  name: string;
  loadedChunks: number;
  playerCount: number;
  worldBorder: {
    centerX: number;
    centerZ: number;
    size: number;
  };
  spawn: {
    x: number;
    y: number;
    z: number;
  };
}

export interface MapPlayer {
  uuid: string;
  username: string;
  dimension: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  maxHealth: number;
  gameMode: string;
  ping: number;
  isOp: boolean;
  chunkX: number;
  chunkZ: number;
}

export interface MapWaypoint {
  id: string;
  name: string;
  x: number;
  z: number;
  dimension: string;
  color: string;
  isSystem?: boolean;
}

export interface MapDataResponse {
  selectedDimension: string;
  dimensions: MapDimension[];
  players: MapPlayer[];
  waypoints: MapWaypoint[];
}

