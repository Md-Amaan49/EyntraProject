import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { DashboardProvider, useDashboard } from '../DashboardContext';
import { cattleAPI, dashboardAPI, notificationAPI } from '../../services/api';

// Mock APIs
jest.mock('../../services/api', () => ({
  cattleAPI: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getHealthHistory: jest.fn(),
    exportHealthRecord: jest.fn(),
  },
  dashboardAPI: {
    getCattleOwnerStats: jest.fn(),
  },
  notificationAPI: {
    list: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  },
}));

const mockCattleAPI = cattleAPI as jest.Mocked<typeof cattleAPI>;
const mockDashboardAPI = dashboardAPI as jest.Mocked<typeof dashboardAPI>;
const mockNotificationAPI = notificationAPI as jest.Mocked<typeof notificationAPI>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock navigator.onLine
const mockNavigator = {
  onLine: true,
};
Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DashboardProvider>{children}</DashboardProvider>
);

describe('DashboardContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigator.onLine = true;
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Context Provider', () => {
    test('should provide dashboard context', () => {
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(result.current.state).toBeDefined();
      expect(result.current.loadCattle).toBeDefined();
      expect(result.current.addCattle).toBeDefined();
    });

    test('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useDashboard());
      }).toThrow('useDashboard must be used within a DashboardProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cattle Management', () => {
    test('should load cattle successfully', async () => {
      const mockCattle = [
        { 
          id: '1', 
          breed: 'Holstein', 
          age: 3, 
          identification_number: 'H001', 
          gender: 'female' as const, 
          health_status: 'healthy' as const, 
          is_archived: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];
      
      mockCattleAPI.list.mockResolvedValue({ 
        data: mockCattle,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      await act(async () => {
        await result.current.loadCattle();
      });
      
      expect(result.current.state.cattle).toEqual(mockCattle);
      expect(result.current.state.loading.cattle).toBe(false);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    test('should handle cattle loading error', async () => {
      mockCattleAPI.list.mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      await act(async () => {
        await result.current.loadCattle();
      });
      
      expect(result.current.state.errors.cattle).toBe('Failed to load cattle. Please try again.');
      expect(result.current.state.loading.cattle).toBe(false);
    });

    test('should add cattle successfully', async () => {
      const newCattleData = { breed: 'Jersey', age: 2, identification_number: 'J001', gender: 'male' as const };
      const createdCattle = { 
        id: '2', 
        ...newCattleData, 
        health_status: 'healthy' as const,
        is_archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      mockCattleAPI.create.mockResolvedValue({ 
        data: createdCattle,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any
      });
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      let addedCattle: any;
      await act(async () => {
        addedCattle = await result.current.addCattle(newCattleData);
      });
      
      expect(addedCattle).toEqual(createdCattle);
      expect(result.current.state.cattle).toContain(createdCattle);
    });

    test('should update cattle successfully', async () => {
      const initialCattle = { 
        id: '1', 
        breed: 'Holstein', 
        age: 3, 
        identification_number: 'H001', 
        gender: 'female' as const, 
        health_status: 'healthy' as const,
        is_archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      const updatedData = { age: 4 };
      const updatedCattle = { ...initialCattle, ...updatedData };
      
      mockCattleAPI.update.mockResolvedValue({ 
        data: updatedCattle,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      // Set initial state
      act(() => {
        result.current.state.cattle = [initialCattle];
      });
      
      await act(async () => {
        await result.current.updateCattle('1', updatedData);
      });
      
      expect(mockCattleAPI.update).toHaveBeenCalledWith('1', updatedData);
    });

    test('should delete cattle successfully', async () => {
      const cattleToDelete = { 
        id: '1', 
        breed: 'Holstein', 
        age: 3, 
        identification_number: 'H001', 
        gender: 'female' as const, 
        health_status: 'healthy' as const,
        is_archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      mockCattleAPI.delete.mockResolvedValue({
        data: {},
        status: 204,
        statusText: 'No Content',
        headers: {},
        config: {} as any
      });
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      // Set initial state
      act(() => {
        result.current.state.cattle = [cattleToDelete];
      });
      
      await act(async () => {
        await result.current.deleteCattle('1');
      });
      
      expect(mockCattleAPI.delete).toHaveBeenCalledWith('1');
    });

    test('should select cattle', () => {
      const cattle = { 
        id: '1', 
        breed: 'Holstein', 
        age: 3, 
        identification_number: 'H001', 
        gender: 'female' as const, 
        health_status: 'healthy' as const,
        is_archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      act(() => {
        result.current.selectCattle(cattle);
      });
      
      expect(result.current.state.selectedCattle).toEqual(cattle);
    });
  });

  describe('Dashboard Statistics', () => {
    test('should load dashboard stats successfully', async () => {
      const mockStats = { totalCattle: 5, healthyCattle: 4, sickCattle: 1, underTreatment: 0 };
      
      mockDashboardAPI.getCattleOwnerStats.mockResolvedValue({ 
        data: mockStats,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      await act(async () => {
        await result.current.loadDashboardStats();
      });
      
      expect(result.current.state.dashboardStats).toEqual(mockStats);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    test('should handle dashboard stats loading error', async () => {
      mockDashboardAPI.getCattleOwnerStats.mockRejectedValue(new Error('API error'));
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      await act(async () => {
        await result.current.loadDashboardStats();
      });
      
      expect(result.current.state.errors.dashboardStats).toBe('Failed to load statistics.');
    });
  });

  describe('Notifications', () => {
    test('should load notifications successfully', async () => {
      const mockNotifications = [
        { 
          id: '1', 
          type: 'alert' as const, 
          title: 'Test', 
          body: 'Test notification', 
          priority: 'medium' as const, 
          isRead: false, 
          createdAt: new Date('2024-01-01T00:00:00Z')
        }
      ];
      
      mockNotificationAPI.list.mockResolvedValue({ 
        data: mockNotifications,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      await act(async () => {
        await result.current.loadNotifications();
      });
      
      expect(result.current.state.notifications).toEqual(mockNotifications);
      expect(result.current.state.unreadCount).toBe(1);
    });

    test('should mark notification as read', async () => {
      const notification = { 
        id: '1', 
        type: 'alert' as const, 
        title: 'Test', 
        body: 'Test notification', 
        priority: 'medium' as const, 
        isRead: false, 
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      
      mockNotificationAPI.markAsRead.mockResolvedValue({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      // Set initial state
      act(() => {
        result.current.state.notifications = [notification];
        result.current.state.unreadCount = 1;
      });
      
      await act(async () => {
        await result.current.markNotificationAsRead('1');
      });
      
      expect(mockNotificationAPI.markAsRead).toHaveBeenCalledWith('1');
    });
  });

  describe('Offline Functionality', () => {
    test('should use cached data when offline', async () => {
      const cachedCattle = [{ 
        id: '1', 
        breed: 'Holstein', 
        age: 3, 
        identification_number: 'H001', 
        gender: 'female' as const, 
        health_status: 'healthy' as const,
        is_archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }];
      
      mockNavigator.onLine = false;
      mockCattleAPI.list.mockRejectedValue(new Error('Network error'));
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        data: cachedCattle,
        timestamp: Date.now(),
      }));
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      await act(async () => {
        await result.current.loadCattle();
      });
      
      expect(result.current.state.cattle).toEqual(cachedCattle);
    });

    test('should queue changes when offline', async () => {
      mockNavigator.onLine = false;
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      await act(async () => {
        await result.current.addCattle({ breed: 'Jersey', age: 2 });
      });
      
      expect(result.current.state.pendingChanges.length).toBeGreaterThan(0);
    });

    test('should sync pending changes when online', async () => {
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      // First, go offline and add cattle to create pending changes
      mockNavigator.onLine = false;
      
      await act(async () => {
        await result.current.addCattle({ breed: 'Jersey', age: 2, identification_number: 'J001', gender: 'male' });
      });
      
      // Verify pending changes were created
      expect(result.current.state.pendingChanges.length).toBeGreaterThan(0);
      
      // Now go back online and set up API mocks
      mockNavigator.onLine = true;
      mockCattleAPI.create.mockResolvedValue({ 
        data: { id: '1', breed: 'Jersey' },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any
      });
      mockCattleAPI.list.mockResolvedValue({ 
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });
      
      await act(async () => {
        await result.current.syncPendingChanges();
      });
      
      expect(mockCattleAPI.create).toHaveBeenCalled();
      expect(result.current.state.pendingChanges).toHaveLength(0);
    });
  });

  describe('Loading States', () => {
    test('should manage loading states correctly', async () => {
      mockCattleAPI.list.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      act(() => {
        result.current.loadCattle();
      });
      
      expect(result.current.state.loading.cattle).toBe(true);
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });
      
      expect(result.current.state.loading.cattle).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should clear errors', () => {
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      // Set an error
      act(() => {
        result.current.state.errors.cattle = 'Test error';
      });
      
      act(() => {
        result.current.clearError('cattle');
      });
      
      expect(result.current.state.errors.cattle).toBeUndefined();
    });
  });

  describe('Optimistic Updates', () => {
    test('should perform optimistic updates for cattle operations', async () => {
      const initialCattle = { 
        id: '1', 
        breed: 'Holstein', 
        age: 3, 
        identification_number: 'H001', 
        gender: 'female' as const, 
        health_status: 'healthy' as const,
        is_archived: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      const updatedData = { age: 4 };
      
      // Mock successful API response
      mockCattleAPI.update.mockResolvedValue({ 
        data: { ...initialCattle, ...updatedData },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });
      
      // First load the initial cattle
      mockCattleAPI.list.mockResolvedValue({ 
        data: [initialCattle],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });
      
      const { result } = renderHook(() => useDashboard(), { wrapper });
      
      // Load initial cattle
      await act(async () => {
        await result.current.loadCattle();
      });
      
      expect(result.current.state.cattle[0].age).toBe(3);
      
      // Now update the cattle
      await act(async () => {
        await result.current.updateCattle('1', updatedData);
      });
      
      expect(mockCattleAPI.update).toHaveBeenCalledWith('1', updatedData);
      // After the update completes, the cattle should be updated
      expect(result.current.state.cattle[0].age).toBe(4);
    });
  });
});