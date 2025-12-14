/**
 * API service for communicating with the backend
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/users/refresh/`, {
            refresh: refreshToken,
          });
          const newToken = response.data.access;
          localStorage.setItem('access_token', newToken);
          
          // Retry the original request
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(error.config);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/users/login/', { email, password }),
  
  register: (userData: {
    email: string;
    password: string;
    password_confirm: string;
    name: string;
    phone: string;
    role: string;
  }) => api.post('/users/register/', userData),
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// Cattle API
export const cattleAPI = {
  list: () => api.get('/cattle/'),
  
  create: (cattleData: {
    breed: string;
    age: number;
    identification_number: string;
    gender: string;
    weight?: number;
    metadata?: any;
  }) => api.post('/cattle/', cattleData),
  
  get: (id: string) => api.get(`/cattle/${id}/`),
  
  update: (id: string, cattleData: any) => api.patch(`/cattle/${id}/`, cattleData),
  
  delete: (id: string) => api.delete(`/cattle/${id}/`),
  
  getHistory: (id: string) => api.get(`/health/cattle/${id}/history/`),
};

// Health API
export const healthAPI = {
  submitSymptoms: (data: {
    cattle_id: string;
    symptoms: string;
    severity: string;
    additional_notes?: string;
    images?: File[];
  }) => {
    const formData = new FormData();
    formData.append('cattle_id', data.cattle_id);
    formData.append('symptoms', data.symptoms);
    formData.append('severity', data.severity);
    if (data.additional_notes) {
      formData.append('additional_notes', data.additional_notes);
    }
    if (data.images) {
      data.images.forEach((image, index) => {
        formData.append('images', image);
      });
    }
    
    return api.post('/health/submit/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  getSymptoms: () => api.get('/health/symptoms/'),
  
  getTreatmentRecommendations: (data: {
    disease_predictions: any[];
    cattle_metadata?: any;
    preference?: string;
  }) => api.post('/health/treatments/recommend/', data),
  
  getCattleTreatments: (cattleId: string, data: {
    disease_predictions: any[];
    preference?: string;
  }) => api.post(`/health/cattle/${cattleId}/treatments/`, data),
};

// AI Service API (direct to AI service)
export const aiAPI = {
  predict: (data: {
    symptoms: string;
    images?: string[];
    cattle_metadata?: any;
  }) => {
    const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:5000';
    return axios.post(`${AI_SERVICE_URL}/predict`, data);
  },
};

export default api;