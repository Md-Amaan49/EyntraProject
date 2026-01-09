import { useCallback } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { Cattle } from '../types';

export const useCattleOperations = () => {
  const { state, loadCattle, addCattle, updateCattle, deleteCattle, selectCattle } = useDashboard();

  const handleAddCattle = useCallback(async (cattleData: any) => {
    try {
      const newCattle = await addCattle(cattleData);
      return { success: true, cattle: newCattle };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [addCattle]);

  const handleUpdateCattle = useCallback(async (id: string, cattleData: any) => {
    try {
      const updatedCattle = await updateCattle(id, cattleData);
      return { success: true, cattle: updatedCattle };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [updateCattle]);

  const handleDeleteCattle = useCallback(async (id: string) => {
    try {
      await deleteCattle(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [deleteCattle]);

  const refreshCattle = useCallback(async () => {
    try {
      await loadCattle();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [loadCattle]);

  const getCattleById = useCallback((id: string): Cattle | undefined => {
    return state.cattle.find(cattle => cattle.id === id);
  }, [state.cattle]);

  const getCattleByStatus = useCallback((status: string): Cattle[] => {
    return state.cattle.filter(cattle => cattle.health_status === status);
  }, [state.cattle]);

  const getHealthyCattle = useCallback((): Cattle[] => {
    return getCattleByStatus('healthy');
  }, [getCattleByStatus]);

  const getSickCattle = useCallback((): Cattle[] => {
    return getCattleByStatus('sick');
  }, [getCattleByStatus]);

  const getCattleUnderTreatment = useCallback((): Cattle[] => {
    return getCattleByStatus('under_treatment');
  }, [getCattleByStatus]);

  return {
    // State
    cattle: state.cattle,
    selectedCattle: state.selectedCattle,
    loading: state.loading.cattle || false,
    error: state.errors.cattle,
    
    // Operations
    handleAddCattle,
    handleUpdateCattle,
    handleDeleteCattle,
    refreshCattle,
    selectCattle,
    
    // Getters
    getCattleById,
    getCattleByStatus,
    getHealthyCattle,
    getSickCattle,
    getCattleUnderTreatment,
    
    // Statistics
    totalCattle: state.cattle.length,
    healthyCattleCount: getHealthyCattle().length,
    sickCattleCount: getSickCattle().length,
    treatmentCattleCount: getCattleUnderTreatment().length,
  };
};

export default useCattleOperations;