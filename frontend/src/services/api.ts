/**
 * API service for communicating with the backend
 */
import axios from 'axios';
import type { 
  CattleFormData, 
  HealthFilters, 
  VeterinarianFilters, 
  BookingData, 
  ConsultationFilters,
  NotificationPreferences,
  DateRange,
  AnalyticsFilters
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
                   process.env.VITE_API_URL || 
                   (process.env.NODE_ENV === 'production' 
                     ? 'https://cattle-health-backend.onrender.com/api' 
                     : 'http://localhost:8000/api');

// Debug logging for production
if (process.env.NODE_ENV === 'production') {
  console.log('Production API Config:', {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    NODE_ENV: process.env.NODE_ENV,
    API_BASE_URL: API_BASE_URL
  });
}

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
    state?: string;
    city?: string;
    address?: string;
    pincode?: string;
  }) => api.post('/users/register/', userData),
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  getNearbyVeterinarians: () => api.get('/users/nearby-veterinarians/'),
};

// Cattle API
export const cattleAPI = {
  list: () => api.get('/cattle/'),
  
  create: (cattleData: CattleFormData) => {
    const formData = new FormData();
    
    // Add all the cattle data fields
    formData.append('breed', cattleData.breed);
    formData.append('age', cattleData.age.toString());
    formData.append('identification_number', cattleData.identification_number);
    formData.append('gender', cattleData.gender);
    
    if (cattleData.weight !== undefined) {
      formData.append('weight', cattleData.weight.toString());
    }
    
    if (cattleData.metadata) {
      formData.append('metadata', JSON.stringify(cattleData.metadata));
    }
    
    // Add image if provided
    if (cattleData.image) {
      formData.append('image', cattleData.image);
    }
    
    return api.post('/cattle/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  get: (id: string) => api.get(`/cattle/${id}/`),
  
  update: (id: string, cattleData: any) => {
    // Check if we have an image to upload
    if (cattleData.image instanceof File) {
      const formData = new FormData();
      
      // Add all fields to FormData
      Object.keys(cattleData).forEach(key => {
        if (key === 'image') {
          formData.append('image', cattleData.image);
        } else if (key === 'metadata' && cattleData[key]) {
          formData.append('metadata', JSON.stringify(cattleData[key]));
        } else if (cattleData[key] !== undefined && cattleData[key] !== null) {
          formData.append(key, cattleData[key].toString());
        }
      });
      
      return api.patch(`/cattle/${id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      // No image, use regular JSON
      return api.patch(`/cattle/${id}/`, cattleData);
    }
  },
  
  delete: (id: string) => api.delete(`/cattle/${id}/`),
  
  getHistory: (id: string) => api.get(`/health/cattle/${id}/history/`),
  
  // New methods for dashboard features
  getHealthHistory: (id: string, filters?: any) => 
    api.get(`/cattle/${id}/health-history/`, { params: filters }),
  
  exportHealthRecord: (id: string) => 
    api.get(`/cattle/${id}/export-health/`, { responseType: 'blob' }),
  
  getHealthAnalytics: (id: string, dateRange: any) => 
    api.get(`/cattle/${id}/analytics/`, { params: dateRange }),
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
      data.images.forEach((image) => {
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
    const AI_SERVICE_URL = process.env.REACT_APP_AI_SERVICE_URL || 
                          process.env.VITE_AI_SERVICE_URL || 
                          (process.env.NODE_ENV === 'production' 
                            ? 'https://cattle-health-ai.onrender.com' 
                            : 'http://localhost:5000');
    return axios.post(`${AI_SERVICE_URL}/predict`, data);
  },
  
  comprehensiveAnalysis: (formData: FormData) => {
    const AI_SERVICE_URL = process.env.REACT_APP_AI_SERVICE_URL || 
                          process.env.VITE_AI_SERVICE_URL || 
                          (process.env.NODE_ENV === 'production' 
                            ? 'https://cattle-health-ai.onrender.com' 
                            : 'http://localhost:5000');
    return axios.post(`${AI_SERVICE_URL}/comprehensive-analysis`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  validateImageQuality: (formData: FormData) => {
    const AI_SERVICE_URL = process.env.REACT_APP_AI_SERVICE_URL || 
                          process.env.VITE_AI_SERVICE_URL || 
                          (process.env.NODE_ENV === 'production' 
                            ? 'https://cattle-health-ai.onrender.com' 
                            : 'http://localhost:5000');
    return axios.post(`${AI_SERVICE_URL}/validate-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  getModelInfo: () => {
    const AI_SERVICE_URL = process.env.REACT_APP_AI_SERVICE_URL || 
                          process.env.VITE_AI_SERVICE_URL || 
                          (process.env.NODE_ENV === 'production' 
                            ? 'https://cattle-health-ai.onrender.com' 
                            : 'http://localhost:5000');
    return axios.get(`${AI_SERVICE_URL}/model-info`);
  },
  
  getDiseaseInfo: (diseaseName: string) => {
    const AI_SERVICE_URL = process.env.REACT_APP_AI_SERVICE_URL || 
                          process.env.VITE_AI_SERVICE_URL || 
                          (process.env.NODE_ENV === 'production' 
                            ? 'https://cattle-health-ai.onrender.com' 
                            : 'http://localhost:5000');
    return axios.get(`${AI_SERVICE_URL}/disease-info/${diseaseName}`);
  },
};

// Veterinarian API
export const veterinarianAPI = {
  list: (filters?: any) => {
    // If we have location filters, use the nearby endpoint
    if (filters?.latitude && filters?.longitude) {
      return api.get('/consultations/veterinarians/nearby/', { params: filters });
    }
    // Otherwise, get all veterinarians (we'll need to create this endpoint)
    return api.get('/consultations/veterinarians/', { params: filters });
  },
  
  findNearby: (params: {
    latitude: number;
    longitude: number;
    radius?: number;
    specialization?: string;
    emergency_only?: boolean;
  }) => api.get('/consultations/veterinarians/nearby/', { params }),
  
  get: (id: string) => api.get(`/consultations/veterinarians/${id}/`),
  
  getAvailability: (id: string, date: string) => 
    api.get(`/consultations/veterinarians/${id}/availability/`, { params: { date } }),
  
  search: (query: string) => 
    api.get('/consultations/veterinarians/search/', { params: { q: query } }),
  
  register: (veterinarianData: any) => 
    api.post('/consultations/veterinarians/register/', veterinarianData),
};

// Consultation API
export const consultationAPI = {
  book: (bookingData: any) => api.post('/consultations/book/', bookingData),
  
  get: (id: string) => api.get(`/consultations/${id}/`),
  
  list: (filters?: any) => api.get('/consultations/', { params: filters }),
  
  start: (id: string) => api.post(`/consultations/${id}/start/`),
  
  end: (id: string, notes?: string) => 
    api.post(`/consultations/${id}/end/`, { notes }),
  
  cancel: (id: string, reason: string) => 
    api.post(`/consultations/${id}/cancel/`, { reason }),
  
  // Symptom reporting and veterinary notification
  submitSymptomReport: (data: {
    cattle_id: string;
    symptoms: string;
    severity: string;
    is_emergency: boolean;
    ai_predictions?: any[];
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
  }) => api.post('/consultations/symptoms/report/', data),
  
  // Veterinary request management
  getConsultationRequests: (filters?: any) => 
    api.get('/consultations/requests/', { params: filters }),
  
  respondToRequest: (requestId: string, data: {
    action: 'accept' | 'decline' | 'request_info';
    message?: string;
  }) => api.post(`/consultations/requests/${requestId}/respond/`, data),
  
  // Patient management
  getMyPatients: (filters?: any) => 
    api.get('/consultations/patients/', { params: filters }),
  
  getPatientDetail: (patientId: string) => 
    api.get(`/consultations/patients/${patientId}/`),
  
  addPatientNote: (patientId: string, data: {
    note_type: string;
    content: string;
    is_private?: boolean;
  }) => api.post(`/consultations/patients/${patientId}/notes/`, data),
  
  markPatientCompleted: (patientId: string) => 
    api.post(`/consultations/patients/${patientId}/complete/`),
  
  // Dashboard statistics
  getDashboardStats: () => api.get('/consultations/dashboard/stats/'),
  
  // Chat functionality
  sendMessage: (consultationId: string, message: string, image?: File) => {
    const formData = new FormData();
    formData.append('message', message);
    if (image) formData.append('image', image);
    return api.post(`/consultations/${consultationId}/messages/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  getMessages: (consultationId: string) => 
    api.get(`/consultations/${consultationId}/messages/`),
};

// Notification API
export const notificationAPI = {
  list: () => api.get('/notifications/'),
  
  markAsRead: (id: string) => 
    api.patch(`/notifications/${id}/`, { isRead: true }),
  
  markAllAsRead: () => api.post('/notifications/mark-all-read/'),
  
  getPreferences: () => api.get('/notifications/preferences/'),
  
  updatePreferences: (preferences: any) => 
    api.put('/notifications/preferences/', preferences),
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard-stats/'),
  
  getHealthTrends: (filters?: any) => 
    api.get('/analytics/health-trends/', { params: filters }),
  
  getCattleAnalytics: (cattleId: string, filters?: any) => 
    api.get(`/analytics/cattle/${cattleId}/`, { params: filters }),
};

// Dashboard API
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview/'),
  
  getCattleOwnerStats: () => api.get('/dashboard/cattle-owner-stats/'),
  
  getVeterinarianStats: () => api.get('/dashboard/veterinarian-stats/'),
  
  getHealthTrends: (params?: any) => 
    api.get('/dashboard/health-trends/', { params }),
  
  getCattleAnalytics: (params?: any) => 
    api.get('/dashboard/cattle-analytics/', { params }),
  
  getHealthAnalytics: (params?: any) => 
    api.get('/dashboard/health-analytics/', { params }),
  
  getRegionalDiseaseMap: (params?: any) => 
    api.get('/dashboard/regional-disease-map/', { params }),
  
  getVeterinarianPerformance: (params?: any) => 
    api.get('/dashboard/veterinarian-performance/', { params }),
  
  getOutbreakAlerts: () => api.get('/dashboard/outbreak-alerts/'),
  
  getNotificationSummary: () => api.get('/dashboard/notification-summary/'),
  
  refreshData: () => api.post('/dashboard/refresh/'),
};

export default api;