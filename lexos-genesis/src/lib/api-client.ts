import axios, { AxiosInstance, AxiosError } from 'axios';

// API client configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Token management
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('auth_token', token);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_token');
  }
};

// Initialize token from localStorage
const storedToken = localStorage.getItem('auth_token');
if (storedToken) {
  setAuthToken(storedToken);
}

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching issues
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Try to refresh token
      try {
        const response = await apiClient.post('/auth/refresh');
        const { token } = response.data;
        setAuthToken(token);
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        setAuthToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response?.data) {
      const errorMessage = (error.response.data as any).error || error.message;
      return Promise.reject(new Error(errorMessage));
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const api = {
  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiClient.post('/auth/login', credentials),
    register: (data: { email: string; password: string; name: string }) =>
      apiClient.post('/auth/register', data),
    logout: () => apiClient.post('/auth/logout'),
    refresh: () => apiClient.post('/auth/refresh'),
    me: () => apiClient.get('/auth/me'),
    updateProfile: (data: any) => apiClient.put('/auth/profile', data),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/auth/change-password', data),
  },

  // Agents
  agents: {
    list: () => apiClient.get('/agents'),
    get: (id: string) => apiClient.get(`/agents/${id}`),
    create: (data: any) => apiClient.post('/agents', data),
    update: (id: string, data: any) => apiClient.put(`/agents/${id}`, data),
    delete: (id: string) => apiClient.delete(`/agents/${id}`),
    start: (id: string) => apiClient.post(`/agents/${id}/start`),
    stop: (id: string) => apiClient.post(`/agents/${id}/stop`),
    restart: (id: string) => apiClient.post(`/agents/${id}/restart`),
    logs: (id: string) => apiClient.get(`/agents/${id}/logs`),
    metrics: (id: string) => apiClient.get(`/agents/${id}/metrics`),
    modify: (id: string, modification: any) => 
      apiClient.post(`/agents/${id}/modify`, modification),
  },

  // Conversations
  conversations: {
    list: () => apiClient.get('/conversations'),
    get: (id: string) => apiClient.get(`/conversations/${id}`),
    create: (data: any) => apiClient.post('/conversations', data),
    update: (id: string, data: any) => apiClient.put(`/conversations/${id}`, data),
    delete: (id: string) => apiClient.delete(`/conversations/${id}`),
    messages: (id: string) => apiClient.get(`/conversations/${id}/messages`),
    sendMessage: (id: string, message: any) =>
      apiClient.post(`/conversations/${id}/messages`, message),
  },

  // Tasks
  tasks: {
    list: () => apiClient.get('/tasks'),
    get: (id: string) => apiClient.get(`/tasks/${id}`),
    create: (data: any) => apiClient.post('/tasks', data),
    update: (id: string, data: any) => apiClient.put(`/tasks/${id}`, data),
    delete: (id: string) => apiClient.delete(`/tasks/${id}`),
    execute: (id: string) => apiClient.post(`/tasks/${id}/execute`),
    cancel: (id: string) => apiClient.post(`/tasks/${id}/cancel`),
    retry: (id: string) => apiClient.post(`/tasks/${id}/retry`),
  },

  // Models
  models: {
    list: () => apiClient.get('/models'),
    get: (id: string) => apiClient.get(`/models/${id}`),
    create: (data: any) => apiClient.post('/models', data),
    update: (id: string, data: any) => apiClient.put(`/models/${id}`, data),
    delete: (id: string) => apiClient.delete(`/models/${id}`),
    test: (id: string) => apiClient.post(`/models/${id}/test`),
  },

  // Files
  files: {
    list: () => apiClient.get('/files'),
    upload: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    download: (id: string) => apiClient.get(`/files/${id}/download`),
    delete: (id: string) => apiClient.delete(`/files/${id}`),
  },

  // System
  system: {
    status: () => apiClient.get('/system/status'),
    metrics: () => apiClient.get('/system/metrics'),
    logs: () => apiClient.get('/system/logs'),
    health: () => apiClient.get('/health'),
  },

  // Memory
  memory: {
    search: (query: string) => apiClient.get('/memory/search', { params: { q: query } }),
    store: (data: any) => apiClient.post('/memory/store', data),
    get: (id: string) => apiClient.get(`/memory/${id}`),
    update: (id: string, data: any) => apiClient.put(`/memory/${id}`, data),
    delete: (id: string) => apiClient.delete(`/memory/${id}`),
  },
};

export default apiClient;