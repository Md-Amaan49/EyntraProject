/**
 * Property-based tests for dashboard statistics components
 * Feature: cattle-owner-dashboard, Property 27: Dashboard statistics accuracy
 * Validates: Requirements 9.1
 */

import { render, screen, waitFor } from '@testing-library/react';
import DashboardStats from '../DashboardStats';
import { dashboardAPI } from '../../../services/api';

// Mock the API
jest.mock('../../../services/api', () => ({
  dashboardAPI: {
    getCattleOwnerStats: jest.fn(),
  },
}));

const mockDashboardAPI = dashboardAPI as jest.Mocked<typeof dashboardAPI>;

describe('DashboardStats - Statistics Accuracy Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 27: Dashboard statistics accuracy', () => {
    it('should display accurate cattle count statistics', async () => {
      // Property: For any valid statistics data, displayed counts should match source data
      const mockStats = {
        totalCattle: 15,
        healthyCattle: 12,
        sickCattle: 2,
        underTreatment: 1,
        totalReports: 45,
        recentReports: 5,
        avgHealthScore: 87,
        trends: {
          healthyTrend: { value: 8, direction: 'up' as const, period: '7 days' },
          reportsTrend: { value: 15, direction: 'up' as const, period: '30 days' },
        }
      };

      mockDashboardAPI.getCattleOwnerStats.mockResolvedValue({ 
        data: mockStats,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<DashboardStats />);

      await waitFor(() => {
        // Verify all statistics are displayed accurately
        expect(screen.getByText('15')).toBeInTheDocument(); // Total cattle
        expect(screen.getByText('12')).toBeInTheDocument(); // Healthy cattle
        expect(screen.getByText('2')).toBeInTheDocument();  // Sick cattle
        expect(screen.getByText('1')).toBeInTheDocument();  // Under treatment
        expect(screen.getByText('45')).toBeInTheDocument(); // Total reports
        expect(screen.getByText('87%')).toBeInTheDocument(); // Health score
      });
    });

    it('should calculate and display correct percentages', async () => {
      // Property: For any cattle distribution, percentage calculations should be mathematically correct
      const mockStats = {
        totalCattle: 20,
        healthyCattle: 16,
        sickCattle: 3,
        underTreatment: 1,
        avgHealthScore: 80,
      };

      mockDashboardAPI.getCattleOwnerStats.mockResolvedValue({ 
        data: mockStats,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<DashboardStats />);

      await waitFor(() => {
        // Verify percentage calculation: 16/20 = 80%
        expect(screen.getByText('80% of total')).toBeInTheDocument();
      });
    });

    it('should handle zero cattle gracefully', async () => {
      // Property: For zero cattle count, should display zeros without division errors
      const mockStats = {
        totalCattle: 0,
        healthyCattle: 0,
        sickCattle: 0,
        underTreatment: 0,
        totalReports: 0,
        recentReports: 0,
        avgHealthScore: 0,
      };

      mockDashboardAPI.getCattleOwnerStats.mockResolvedValue({ 
        data: mockStats,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<DashboardStats />);

      await waitFor(() => {
        // Should display zeros without errors
        expect(screen.getAllByText('0')).toHaveLength(5); // Multiple zero values
        expect(screen.getByText('0%')).toBeInTheDocument(); // Health score
      });
    });

    it('should display trend indicators correctly', async () => {
      // Property: For any trend data, direction and values should be displayed accurately
      const mockStats = {
        totalCattle: 10,
        healthyCattle: 8,
        trends: {
          healthyTrend: { value: 12, direction: 'up' as const, period: '7 days' },
          reportsTrend: { value: 5, direction: 'down' as const, period: '30 days' },
        }
      };

      mockDashboardAPI.getCattleOwnerStats.mockResolvedValue({ 
        data: mockStats,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<DashboardStats />);

      await waitFor(() => {
        // Verify trend values are displayed
        expect(screen.getByText('12% 7 days')).toBeInTheDocument();
      });
    });

    it('should handle API errors and show fallback data', async () => {
      // Property: For any API error, should display fallback statistics without crashing
      mockDashboardAPI.getCattleOwnerStats.mockRejectedValue(new Error('API Error'));

      render(<DashboardStats />);

      await waitFor(() => {
        // Should show fallback mock data
        expect(screen.getByText('Failed to load statistics. Please try again.')).toBeInTheDocument();
        // Should still display some statistics (fallback data)
        expect(screen.getByText('12')).toBeInTheDocument(); // Mock fallback total
      });
    });

    it('should update statistics when refresh trigger changes', async () => {
      // Property: For any refresh trigger change, should reload and display updated statistics
      const initialStats = {
        totalCattle: 10,
        healthyCattle: 8,
      };

      const updatedStats = {
        totalCattle: 12,
        healthyCattle: 10,
      };

      mockDashboardAPI.getCattleOwnerStats
        .mockResolvedValueOnce({ 
          data: initialStats,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        })
        .mockResolvedValueOnce({ 
          data: updatedStats,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        });

      const { rerender } = render(<DashboardStats refreshTrigger={1} />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });

      // Trigger refresh
      rerender(<DashboardStats refreshTrigger={2} />);

      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument();
      });

      // Verify API was called twice
      expect(mockDashboardAPI.getCattleOwnerStats).toHaveBeenCalledTimes(2);
    });
  });

  describe('Statistics Display Properties', () => {
    it('should display all required statistic cards', async () => {
      // Property: For any valid data, all required statistic categories should be displayed
      const mockStats = {
        totalCattle: 5,
        healthyCattle: 4,
        sickCattle: 1,
        underTreatment: 0,
        totalReports: 10,
        avgHealthScore: 85,
      };

      mockDashboardAPI.getCattleOwnerStats.mockResolvedValue({ 
        data: mockStats,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<DashboardStats />);

      await waitFor(() => {
        // Verify all required statistic categories are present
        expect(screen.getByText('Total Cattle')).toBeInTheDocument();
        expect(screen.getByText('Healthy Cattle')).toBeInTheDocument();
        expect(screen.getByText('Need Attention')).toBeInTheDocument();
        expect(screen.getByText('Under Treatment')).toBeInTheDocument();
        expect(screen.getByText('Health Reports')).toBeInTheDocument();
        expect(screen.getByText('Health Score')).toBeInTheDocument();
      });
    });

    it('should show appropriate insights based on data', async () => {
      // Property: For any statistics, insights should be contextually appropriate
      const mockStats = {
        totalCattle: 10,
        healthyCattle: 9,
        sickCattle: 1,
        underTreatment: 0,
        recentReports: 8,
      };

      mockDashboardAPI.getCattleOwnerStats.mockResolvedValue({ 
        data: mockStats,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<DashboardStats />);

      await waitFor(() => {
        // Should show positive insight for high health percentage (90%)
        expect(screen.getByText(/Excellent herd health/)).toBeInTheDocument();
        // Should show high activity insight
        expect(screen.getByText(/High monitoring activity/)).toBeInTheDocument();
      });
    });
  });
});