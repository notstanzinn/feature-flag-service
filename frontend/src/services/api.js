import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me')
};

export const orgAPI = {
  get: () => api.get('/organizations'),
  getById: (id) => api.get(`/organizations/${id}`)
};

export const projectAPI = {
  getAll: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`)
};

export const environmentAPI = {
  getAll: (projectId) => api.get('/environments', { params: { projectId } }),
  create: (data) => api.post('/environments', data),
  delete: (id) => api.delete(`/environments/${id}`),
  getSDKKeys: (id) => api.get(`/environments/${id}/sdk-keys`)
};

export const flagAPI = {
  getAll: (envId) => api.get('/flags', { params: { envId } }),
  create: (data) => api.post('/flags', data),
  update: (id, data) => api.put(`/flags/${id}`, data),
  delete: (id) => api.delete(`/flags/${id}`)
};

export const evalAPI = {
  evaluate: (envKey, data) => api.post(`/eval/${envKey}`, data),
  getAllFlags: (envKey, userId) => api.get(`/eval/${envKey}/flags`, { params: { userId } }),
  getFlag: (envKey, flagKey, userContext) => api.get(`/eval/${envKey}/${flagKey}`, { params: userContext })
};

export default api;