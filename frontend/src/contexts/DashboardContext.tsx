import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { cattleAPI, healthAPI, dashboardAPI, veterinarianAPI, consultationAPI, notificationAPI } from '../services/api';
import { Cattle, SymptomEntry, Veterinarian, Consultation, Notification } from '../types';

// State interface
interface DashboardState {
  // Cattle management
  cattle: Cattle[];
  selectedCattle: Cattle | null;
  
  // Health data
  healthHistory: Record<string, SymptomEntry[]>;
  recentSymptoms: SymptomEntry[];
  
  // Veterinarians
  veterinarians: Veterinarian[];
  
  // Consultations
  consultations: Consultation[];
  activeConsultation: Consultation | null;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // Dashboard statistics
  dashboardStats: any;
  
  // UI state
  loading: Record<string, boolean>;
  errors: Record<string, string>;
  
  // Cache and sync
  lastSyncTime: number;
  pendingChanges: any[];
  isOffline: boolean;
}

// Action types
type DashboardAction =
  | { type: 'SET_LOADING'; payload: { key: string; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { key: string; error: string } }
  | { type: 'CLEAR_ERROR'; payload: string }
  | { type: 'SET_CATTLE'; payload: Cattle[] }
  | { type: 'ADD_CATTLE'; payload: Cattle }
  | { type: 'UPDATE_CATTLE'; payload: Cattle }
  | { type: 'DELETE_CATTLE'; payload: string }
  | { type: 'SELECT_CATTLE'; payload: Cattle | null }
  | { type: 'SET_HEALTH_HISTORY'; payload: { cattleId: string; history: SymptomEntry[] } }
  | { type: 'SET_RECENT_SYMPTOMS'; payload: SymptomEntry[] }
  | { type: 'SET_VETERINARIANS'; payload: Veterinarian[] }
  | { type: 'SET_CONSULTATIONS'; payload: Consultation[] }
  | { type: 'SET_ACTIVE_CONSULTATION'; payload: Consultation | null }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'SET_DASHBOARD_STATS'; payload: any }
  | { type: 'SET_OFFLINE_STATUS'; payload: boolean }
  | { type: 'ADD_PENDING_CHANGE'; payload: any }
  | { type: 'CLEAR_PENDING_CHANGES' }
  | { type: 'UPDATE_SYNC_TIME'; payload: number };

// Initial state
const initialState: DashboardState = {
  cattle: [],
  selectedCattle: null,
  healthHistory: {},
  recentSymptoms: [],
  veterinarians: [],
  consultations: [],
  activeConsultation: null,
  notifications: [],
  unreadCount: 0,
  dashboardStats: null,
  loading: {},
  errors: {},
  lastSyncTime: 0,
  pendingChanges: [],
  isOffline: false,
};

// Reducer
function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.loading },
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.error },
      };
    
    case 'CLEAR_ERROR':
      const { [action.payload]: removed, ...remainingErrors } = state.errors;
      return { ...state, errors: remainingErrors };
    
    case 'SET_CATTLE':
      return { ...state, cattle: action.payload };
    
    case 'ADD_CATTLE':
      return { ...state, cattle: [...state.cattle, action.payload] };
    
    case 'UPDATE_CATTLE':
      return {
        ...state,
        cattle: state.cattle.map(c => c.id === action.payload.id ? action.payload : c),
        selectedCattle: state.selectedCattle?.id === action.payload.id ? action.payload : state.selectedCattle,
      };
    
    case 'DELETE_CATTLE':
      return {
        ...state,
        cattle: state.cattle.filter(c => c.id !== action.payload),
        selectedCattle: state.selectedCattle?.id === action.payload ? null : state.selectedCattle,
      };
    
    case 'SELECT_CATTLE':
      return { ...state, selectedCattle: action.payload };
    
    case 'SET_HEALTH_HISTORY':
      return {
        ...state,
        healthHistory: { ...state.healthHistory, [action.payload.cattleId]: action.payload.history },
      };
    
    case 'SET_RECENT_SYMPTOMS':
      return { ...state, recentSymptoms: action.payload };
    
    case 'SET_VETERINARIANS':
      return { ...state, veterinarians: action.payload };
    
    case 'SET_CONSULTATIONS':
      return { ...state, consultations: action.payload };
    
    case 'SET_ACTIVE_CONSULTATION':
      return { ...state, activeConsultation: action.payload };
    
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.isRead).length,
      };
    
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => 
          n.id === action.payload ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    
    case 'SET_DASHBOARD_STATS':
      return { ...state, dashboardStats: action.payload };
    
    case 'SET_OFFLINE_STATUS':
      return { ...state, isOffline: action.payload };
    
    case 'ADD_PENDING_CHANGE':
      return { ...state, pendingChanges: [...state.pendingChanges, action.payload] };
    
    case 'CLEAR_PENDING_CHANGES':
      return { ...state, pendingChanges: [] };
    
    case 'UPDATE_SYNC_TIME':
      return { ...state, lastSyncTime: action.payload };
    
    default:
      return state;
  }
}

// Context interface
interface DashboardContextType {
  state: DashboardState;
  
  // Cattle management
  loadCattle: () => Promise<void>;
  addCattle: (cattleData: any) => Promise<Cattle>;
  updateCattle: (id: string, cattleData: any) => Promise<Cattle>;
  deleteCattle: (id: string) => Promise<void>;
  selectCattle: (cattle: Cattle | null) => void;
  
  // Health history
  loadHealthHistory: (cattleId: string, filters?: any) => Promise<void>;
  exportHealthRecord: (cattleId: string) => Promise<void>;
  
  // Veterinarians
  loadVeterinarians: (filters?: any) => Promise<void>;
  
  // Consultations
  loadConsultations: () => Promise<void>;
  bookConsultation: (bookingData: any) => Promise<Consultation>;
  startConsultation: (consultationId: string) => Promise<void>;
  endConsultation: (consultationId: string, notes?: string) => Promise<void>;
  
  // Notifications
  loadNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  
  // Dashboard stats
  loadDashboardStats: () => Promise<void>;
  
  // Utility functions
  clearError: (key: string) => void;
  refreshAll: () => Promise<void>;
  syncPendingChanges: () => Promise<void>;
}

// Create context
const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Cache utilities
const CACHE_KEYS = {
  CATTLE: 'dashboard_cattle',
  STATS: 'dashboard_stats',
  NOTIFICATIONS: 'dashboard_notifications',
  PENDING_CHANGES: 'dashboard_pending_changes',
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key: string) => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.warn('Cache write error:', error);
  }
};

// Provider component
export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // Utility functions
  const setLoading = useCallback((key: string, loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { key, loading } });
  }, []);

  const setError = useCallback((key: string, error: string) => {
    dispatch({ type: 'SET_ERROR', payload: { key, error } });
  }, []);

  const clearError = useCallback((key: string) => {
    dispatch({ type: 'CLEAR_ERROR', payload: key });
  }, []);

  // Optimistic updates helper
  const withOptimisticUpdate = useCallback(async <T,>(
    operation: () => Promise<T>,
    optimisticUpdate: () => void,
    rollback: () => void
  ): Promise<T> => {
    optimisticUpdate();
    try {
      const result = await operation();
      return result;
    } catch (error) {
      rollback();
      throw error;
    }
  }, []);

  // Cattle management
  const loadCattle = useCallback(async () => {
    setLoading('cattle', true);
    clearError('cattle');
    
    try {
      // Try cache first
      const cachedCattle = getCachedData(CACHE_KEYS.CATTLE);
      if (cachedCattle && !navigator.onLine) {
        dispatch({ type: 'SET_CATTLE', payload: cachedCattle });
        return;
      }

      const response = await cattleAPI.list();
      let cattleData = response.data;
      
      if (cattleData && typeof cattleData === 'object' && 'results' in cattleData) {
        cattleData = cattleData.results;
      }
      
      const cattle = Array.isArray(cattleData) ? cattleData : [];
      dispatch({ type: 'SET_CATTLE', payload: cattle });
      
      // Cache the data
      setCachedData(CACHE_KEYS.CATTLE, cattle);
      dispatch({ type: 'UPDATE_SYNC_TIME', payload: Date.now() });
      
    } catch (error: any) {
      console.error('Failed to load cattle:', error);
      setError('cattle', 'Failed to load cattle. Please try again.');
      
      // Try to use cached data as fallback
      const cachedCattle = getCachedData(CACHE_KEYS.CATTLE);
      if (cachedCattle) {
        dispatch({ type: 'SET_CATTLE', payload: cachedCattle });
      }
    } finally {
      setLoading('cattle', false);
    }
  }, [setLoading, clearError, setError]);

  const addCattle = useCallback(async (cattleData: any): Promise<Cattle> => {
    setLoading('addCattle', true);
    clearError('addCattle');
    
    try {
      if (!navigator.onLine) {
        // Store as pending change
        const pendingChange = { type: 'ADD_CATTLE', data: cattleData, timestamp: Date.now() };
        dispatch({ type: 'ADD_PENDING_CHANGE', payload: pendingChange });
        
        // Create optimistic cattle object
        const optimisticCattle: Cattle = {
          id: `temp_${Date.now()}`,
          ...cattleData,
          owner: 'current_user',
        };
        
        dispatch({ type: 'ADD_CATTLE', payload: optimisticCattle });
        return optimisticCattle;
      }

      const response = await cattleAPI.create(cattleData);
      const newCattle = response.data;
      
      dispatch({ type: 'ADD_CATTLE', payload: newCattle });
      
      // Update cache
      const updatedCattle = [...state.cattle, newCattle];
      setCachedData(CACHE_KEYS.CATTLE, updatedCattle);
      
      return newCattle;
    } catch (error: any) {
      console.error('Failed to add cattle:', error);
      setError('addCattle', 'Failed to add cattle. Please try again.');
      throw error;
    } finally {
      setLoading('addCattle', false);
    }
  }, [state.cattle, setLoading, clearError, setError]);

  const updateCattle = useCallback(async (id: string, cattleData: any): Promise<Cattle> => {
    setLoading('updateCattle', true);
    clearError('updateCattle');
    
    const originalCattle = state.cattle.find(c => c.id === id);
    
    return withOptimisticUpdate(
      async () => {
        if (!navigator.onLine) {
          const pendingChange = { type: 'UPDATE_CATTLE', id, data: cattleData, timestamp: Date.now() };
          dispatch({ type: 'ADD_PENDING_CHANGE', payload: pendingChange });
          throw new Error('Offline - change queued for sync');
        }

        const response = await cattleAPI.update(id, cattleData);
        const updatedCattle = response.data;
        
        // Update cache
        const updatedCattleList = state.cattle.map(c => c.id === id ? updatedCattle : c);
        setCachedData(CACHE_KEYS.CATTLE, updatedCattleList);
        
        return updatedCattle;
      },
      () => {
        if (originalCattle) {
          const updatedCattle = { ...originalCattle, ...cattleData };
          dispatch({ type: 'UPDATE_CATTLE', payload: updatedCattle });
        }
      },
      () => {
        if (originalCattle) {
          dispatch({ type: 'UPDATE_CATTLE', payload: originalCattle });
        }
      }
    ).finally(() => {
      setLoading('updateCattle', false);
    });
  }, [state.cattle, setLoading, clearError, withOptimisticUpdate]);

  const deleteCattle = useCallback(async (id: string): Promise<void> => {
    setLoading('deleteCattle', true);
    clearError('deleteCattle');
    
    const originalCattle = state.cattle.find(c => c.id === id);
    
    return withOptimisticUpdate(
      async () => {
        if (!navigator.onLine) {
          const pendingChange = { type: 'DELETE_CATTLE', id, timestamp: Date.now() };
          dispatch({ type: 'ADD_PENDING_CHANGE', payload: pendingChange });
          return;
        }

        await cattleAPI.delete(id);
        
        // Update cache
        const updatedCattle = state.cattle.filter(c => c.id !== id);
        setCachedData(CACHE_KEYS.CATTLE, updatedCattle);
      },
      () => {
        dispatch({ type: 'DELETE_CATTLE', payload: id });
      },
      () => {
        if (originalCattle) {
          dispatch({ type: 'ADD_CATTLE', payload: originalCattle });
        }
      }
    ).finally(() => {
      setLoading('deleteCattle', false);
    });
  }, [state.cattle, setLoading, clearError, withOptimisticUpdate]);

  const selectCattle = useCallback((cattle: Cattle | null) => {
    dispatch({ type: 'SELECT_CATTLE', payload: cattle });
  }, []);

  // Health history
  const loadHealthHistory = useCallback(async (cattleId: string, filters?: any) => {
    setLoading('healthHistory', true);
    clearError('healthHistory');
    
    try {
      const response = await cattleAPI.getHealthHistory(cattleId, filters);
      const history = Array.isArray(response.data) ? response.data : [];
      dispatch({ type: 'SET_HEALTH_HISTORY', payload: { cattleId, history } });
    } catch (error: any) {
      console.error('Failed to load health history:', error);
      setError('healthHistory', 'Failed to load health history.');
    } finally {
      setLoading('healthHistory', false);
    }
  }, [setLoading, clearError, setError]);

  const exportHealthRecord = useCallback(async (cattleId: string) => {
    setLoading('exportHealth', true);
    clearError('exportHealth');
    
    try {
      const response = await cattleAPI.exportHealthRecord(cattleId);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cattle_${cattleId}_health_record.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error: any) {
      console.error('Failed to export health record:', error);
      setError('exportHealth', 'Failed to export health record.');
    } finally {
      setLoading('exportHealth', false);
    }
  }, [setLoading, clearError, setError]);

  // Dashboard stats
  const loadDashboardStats = useCallback(async () => {
    setLoading('dashboardStats', true);
    clearError('dashboardStats');
    
    try {
      // Try cache first if offline
      const cachedStats = getCachedData(CACHE_KEYS.STATS);
      if (cachedStats && !navigator.onLine) {
        dispatch({ type: 'SET_DASHBOARD_STATS', payload: cachedStats });
        return;
      }

      const response = await dashboardAPI.getCattleOwnerStats();
      dispatch({ type: 'SET_DASHBOARD_STATS', payload: response.data });
      
      // Cache the stats
      setCachedData(CACHE_KEYS.STATS, response.data);
      
    } catch (error: any) {
      console.error('Failed to load dashboard stats:', error);
      setError('dashboardStats', 'Failed to load statistics.');
      
      // Try cached data as fallback
      const cachedStats = getCachedData(CACHE_KEYS.STATS);
      if (cachedStats) {
        dispatch({ type: 'SET_DASHBOARD_STATS', payload: cachedStats });
      }
    } finally {
      setLoading('dashboardStats', false);
    }
  }, [setLoading, clearError, setError]);

  // Notifications
  const loadNotifications = useCallback(async () => {
    setLoading('notifications', true);
    clearError('notifications');
    
    try {
      const response = await notificationAPI.list();
      const notifications = Array.isArray(response.data) ? response.data : [];
      dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
      
      // Cache notifications
      setCachedData(CACHE_KEYS.NOTIFICATIONS, notifications);
      
    } catch (error: any) {
      console.error('Failed to load notifications:', error);
      setError('notifications', 'Failed to load notifications.');
      
      // Try cached notifications
      const cachedNotifications = getCachedData(CACHE_KEYS.NOTIFICATIONS);
      if (cachedNotifications) {
        dispatch({ type: 'SET_NOTIFICATIONS', payload: cachedNotifications });
      }
    } finally {
      setLoading('notifications', false);
    }
  }, [setLoading, clearError, setError]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead();
      const updatedNotifications = state.notifications.map(n => ({ ...n, isRead: true }));
      dispatch({ type: 'SET_NOTIFICATIONS', payload: updatedNotifications });
    } catch (error: any) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [state.notifications]);

  // Sync pending changes
  const syncPendingChanges = useCallback(async () => {
    if (state.pendingChanges.length === 0 || !navigator.onLine) {
      return;
    }

    setLoading('sync', true);
    
    try {
      for (const change of state.pendingChanges) {
        switch (change.type) {
          case 'ADD_CATTLE':
            await cattleAPI.create(change.data);
            break;
          case 'UPDATE_CATTLE':
            await cattleAPI.update(change.id, change.data);
            break;
          case 'DELETE_CATTLE':
            await cattleAPI.delete(change.id);
            break;
        }
      }
      
      dispatch({ type: 'CLEAR_PENDING_CHANGES' });
      
      // Reload data after sync
      await loadCattle();
      
    } catch (error: any) {
      console.error('Failed to sync pending changes:', error);
      setError('sync', 'Failed to sync offline changes.');
    } finally {
      setLoading('sync', false);
    }
  }, [state.pendingChanges, loadCattle, setLoading, setError]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      loadCattle(),
      loadDashboardStats(),
      loadNotifications(),
    ]);
  }, [loadCattle, loadDashboardStats, loadNotifications]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_OFFLINE_STATUS', payload: false });
      syncPendingChanges();
    };

    const handleOffline = () => {
      dispatch({ type: 'SET_OFFLINE_STATUS', payload: true });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial status
    dispatch({ type: 'SET_OFFLINE_STATUS', payload: !navigator.onLine });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingChanges]);

  // Placeholder implementations for remaining functions
  const loadVeterinarians = useCallback(async (filters?: any) => {
    // Implementation would go here
  }, []);

  const loadConsultations = useCallback(async () => {
    // Implementation would go here
  }, []);

  const bookConsultation = useCallback(async (bookingData: any): Promise<Consultation> => {
    // Implementation would go here
    throw new Error('Not implemented');
  }, []);

  const startConsultation = useCallback(async (consultationId: string) => {
    // Implementation would go here
  }, []);

  const endConsultation = useCallback(async (consultationId: string, notes?: string) => {
    // Implementation would go here
  }, []);

  const contextValue: DashboardContextType = {
    state,
    loadCattle,
    addCattle,
    updateCattle,
    deleteCattle,
    selectCattle,
    loadHealthHistory,
    exportHealthRecord,
    loadVeterinarians,
    loadConsultations,
    bookConsultation,
    startConsultation,
    endConsultation,
    loadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    loadDashboardStats,
    clearError,
    refreshAll,
    syncPendingChanges,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

// Hook to use the dashboard context
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export default DashboardContext;