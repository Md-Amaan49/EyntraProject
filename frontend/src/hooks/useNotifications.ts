import { useCallback, useMemo } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { Notification } from '../types';

export const useNotifications = () => {
  const { 
    state, 
    loadNotifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
  } = useDashboard();

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationAsRead(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [markNotificationAsRead]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [markAllNotificationsAsRead]);

  const refreshNotifications = useCallback(async () => {
    try {
      await loadNotifications();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [loadNotifications]);

  // Computed values
  const notificationsByType = useMemo(() => {
    return state.notifications.reduce((acc, notification) => {
      const type = notification.type || 'general';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(notification);
      return acc;
    }, {} as Record<string, Notification[]>);
  }, [state.notifications]);

  const notificationsByPriority = useMemo(() => {
    return state.notifications.reduce((acc, notification) => {
      const priority = notification.priority || 'low';
      if (!acc[priority]) {
        acc[priority] = [];
      }
      acc[priority].push(notification);
      return acc;
    }, {} as Record<string, Notification[]>);
  }, [state.notifications]);

  const unreadNotifications = useMemo(() => {
    return state.notifications.filter(n => !n.isRead);
  }, [state.notifications]);

  const criticalNotifications = useMemo(() => {
    return state.notifications.filter(n => n.priority === 'critical');
  }, [state.notifications]);

  const recentNotifications = useMemo(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return state.notifications.filter(n => new Date(n.createdAt) > oneDayAgo);
  }, [state.notifications]);

  return {
    // State
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    loading: state.loading.notifications || false,
    error: state.errors.notifications,
    
    // Operations
    handleMarkAsRead,
    handleMarkAllAsRead,
    refreshNotifications,
    
    // Computed values
    notificationsByType,
    notificationsByPriority,
    unreadNotifications,
    criticalNotifications,
    recentNotifications,
    
    // Helpers
    hasUnreadNotifications: state.unreadCount > 0,
    hasCriticalNotifications: criticalNotifications.length > 0,
  };
};

export default useNotifications;