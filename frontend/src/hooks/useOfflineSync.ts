import { useCallback, useEffect, useState } from 'react';
import { useDashboard } from '../contexts/DashboardContext';

export const useOfflineSync = () => {
  const { state, syncPendingChanges } = useDashboard();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);

  const handleSync = useCallback(async () => {
    if (state.pendingChanges.length === 0) {
      return { success: true, message: 'No changes to sync' };
    }

    setSyncStatus('syncing');
    setLastSyncAttempt(new Date());

    try {
      await syncPendingChanges();
      setSyncStatus('success');
      return { success: true, message: 'Changes synced successfully' };
    } catch (error: any) {
      setSyncStatus('error');
      return { success: false, error: error.message };
    }
  }, [state.pendingChanges, syncPendingChanges]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (state.pendingChanges.length > 0) {
        handleSync();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [state.pendingChanges, handleSync]);

  // Reset sync status after success
  useEffect(() => {
    if (syncStatus === 'success') {
      const timer = setTimeout(() => setSyncStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  return {
    // State
    isOffline: state.isOffline,
    pendingChanges: state.pendingChanges,
    pendingChangesCount: state.pendingChanges.length,
    syncStatus,
    lastSyncAttempt,
    lastSyncTime: new Date(state.lastSyncTime),
    
    // Operations
    handleSync,
    
    // Helpers
    hasPendingChanges: state.pendingChanges.length > 0,
    canSync: navigator.onLine && state.pendingChanges.length > 0,
    isSyncing: syncStatus === 'syncing',
  };
};

export default useOfflineSync;