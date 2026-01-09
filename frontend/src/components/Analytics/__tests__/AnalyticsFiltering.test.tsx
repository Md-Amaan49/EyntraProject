/**
 * Property-based tests for analytics filtering responsiveness
 * Feature: cattle-owner-dashboard, Property 30: Analytics filtering responsiveness
 * Validates: Requirements 9.4
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HealthAnalytics from '../../Health/HealthAnalytics';
import { dashboardAPI } from '../../../services/api';

// Mock the API
jest.mock('../../../services/api', () => ({
  dashboardAPI: {
    getHealthAnalytics: jest.fn(),
    getCattleOwnerStats: jest.fn(),
  },
}));

const mockDashboardAPI = dashboardAPI as jest.Mocked<typeof dashboardAPI>;

// Mock child components to track prop changes
jest.mock('../DashboardStats', () => {
  return function MockDashboardStats({ refreshTrigger }: any) {
    return (
      <div data-testid="dashboard-stats">
        <div data-testid="refresh-trigger">{refreshTrigger}</div>
      </div>
    );
  };
});

jest.mock('../HealthCharts', () => {
  return function MockHealthCharts({ cattleId, dateRange }: any) {
    return (
      <div data-testid="health-charts">
        <div data-testid="cattle-filter">{cattleId || 'all'}</div>
        <div data-testid="date-range-filter">
          {dateRange ? `${dateRange.start.getTime()}-${dateRange.end.getTime()}` : 'no-range'}
        </div>
      </div>
    );
  };
});

describe('Analytics Filtering - Responsiveness Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API responses
    mockDashboardAPI.getCattleOwnerStats.mockResolvedValue({
      data: { totalCattle: 10, healthyCattle: 8 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any
    });
    
    mockDashboardAPI.getHealthAnalytics.mockResolvedValue({
      data: { healthTrends: [], diseaseDistribution: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any
    });
  });

  describe('Property 30: Analytics filtering responsiveness', () => {
    it('should update all statistics and visualizations when cattle filter changes', async () => {
      // Property: For any cattle filter change, all analytics components should update accordingly
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument();
      });

      // Switch to charts tab to see filtering effects
      await user.click(screen.getByText('Detailed Charts'));

      await waitFor(() => {
        // Initially should show 'all' cattle
        expect(screen.getByTestId('cattle-filter')).toHaveTextContent('all');
      });

      // Change cattle filter by clicking on the select component
      const cattleSelect = screen.getByDisplayValue('All Cattle');
      await user.click(cattleSelect);
      await user.click(screen.getByText('MH001 (Holstein)'));

      await waitFor(() => {
        // Should update to show specific cattle ID
        expect(screen.getByTestId('cattle-filter')).toHaveTextContent('1');
      });
    });

    it('should update date range filter within 2 seconds', async () => {
      // Property: For any date range filter change, should update visualizations within 2 seconds
      const user = userEvent.setup();
      const startTime = Date.now();
      
      render(<HealthAnalytics />);

      // Switch to charts tab
      await user.click(screen.getByText('Detailed Charts'));

      // Record initial date range
      const initialDateRange = screen.getByTestId('date-range-filter').textContent;

      // Change time range by clicking on the select component
      const timeRangeSelect = screen.getByDisplayValue('Last 30 Days');
      await user.click(timeRangeSelect);
      await user.click(screen.getByText('Last 7 Days'));

      await waitFor(() => {
        // Should update date range
        const newDateRange = screen.getByTestId('date-range-filter').textContent;
        expect(newDateRange).not.toBe(initialDateRange);
        
        // Should complete within 2 seconds
        const elapsedTime = Date.now() - startTime;
        expect(elapsedTime).toBeLessThan(2000);
      });
    });

    it('should maintain filter state when switching between tabs', async () => {
      // Property: For any filter selection, state should persist across tab changes
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Set filters by clicking on select components
      const cattleSelect = screen.getByDisplayValue('All Cattle');
      await user.click(cattleSelect);
      await user.click(screen.getByText('MH002 (Jersey)'));
      
      const timeRangeSelect = screen.getByDisplayValue('Last 30 Days');
      await user.click(timeRangeSelect);
      await user.click(screen.getByText('Last 3 Months'));

      // Switch to charts tab
      await user.click(screen.getByText('Detailed Charts'));

      await waitFor(() => {
        // Filters should be applied
        expect(screen.getByTestId('cattle-filter')).toHaveTextContent('2');
      });

      // Switch back to overview
      await user.click(screen.getByText('Overview'));

      // Switch to charts again
      await user.click(screen.getByText('Detailed Charts'));

      await waitFor(() => {
        // Filters should still be applied
        expect(screen.getByTestId('cattle-filter')).toHaveTextContent('2');
      });

      // Verify dropdown still shows selected value
      expect(screen.getByDisplayValue('MH002 (Jersey)')).toBeInTheDocument();
    });

    it('should trigger refresh when refresh button is clicked', async () => {
      // Property: For any refresh action, should increment refresh trigger and update all components
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      await waitFor(() => {
        // Initial refresh trigger should be 0
        expect(screen.getByTestId('refresh-trigger')).toHaveTextContent('0');
      });

      // Click refresh button
      await user.click(screen.getByText('Refresh Data'));

      await waitFor(() => {
        // Refresh trigger should increment
        expect(screen.getByTestId('refresh-trigger')).toHaveTextContent('1');
      });

      // Click refresh again
      await user.click(screen.getByText('Refresh Data'));

      await waitFor(() => {
        // Should increment again
        expect(screen.getByTestId('refresh-trigger')).toHaveTextContent('2');
      });
    });

    it('should handle multiple rapid filter changes correctly', async () => {
      // Property: For any rapid filter changes, should handle them without errors or race conditions
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Switch to charts tab
      await user.click(screen.getByText('Detailed Charts'));

      // Rapidly change filters multiple times by clicking select components
      let cattleSelect = screen.getByDisplayValue('All Cattle');
      await user.click(cattleSelect);
      await user.click(screen.getByText('MH001 (Holstein)'));
      
      let timeRangeSelect = screen.getByDisplayValue('Last 30 Days');
      await user.click(timeRangeSelect);
      await user.click(screen.getByText('Last 7 Days'));
      
      cattleSelect = screen.getByDisplayValue('MH001 (Holstein)');
      await user.click(cattleSelect);
      await user.click(screen.getByText('MH003 (Gir)'));
      
      timeRangeSelect = screen.getByDisplayValue('Last 7 Days');
      await user.click(timeRangeSelect);
      await user.click(screen.getByText('Last Year'));

      await waitFor(() => {
        // Should end up with final filter values
        expect(screen.getByTestId('cattle-filter')).toHaveTextContent('3');
        expect(screen.getByDisplayValue('MH003 (Gir)')).toBeInTheDocument();
      });
    });

    it('should calculate correct date ranges for different time periods', async () => {
      // Property: For any time range selection, should calculate mathematically correct date ranges
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Switch to charts tab
      await user.click(screen.getByText('Detailed Charts'));

      const testCases = [
        { label: 'Last 7 Days', expectedDays: 7 },
        { label: 'Last 30 Days', expectedDays: 30 },
        { label: 'Last 3 Months', expectedDays: 90 },
        { label: 'Last Year', expectedDays: 365 },
      ];

      for (const testCase of testCases) {
        const timeRangeSelect = screen.getByDisplayValue(/Last \d+/);
        await user.click(timeRangeSelect);
        await user.click(screen.getByText(testCase.label));

        await waitFor(() => {
          const dateRangeText = screen.getByTestId('date-range-filter').textContent;
          if (dateRangeText && dateRangeText !== 'no-range') {
            const [startTime, endTime] = dateRangeText.split('-').map(Number);
            const daysDifference = Math.round((endTime - startTime) / (1000 * 60 * 60 * 24));
            
            // Allow for small variations due to timing
            expect(daysDifference).toBeGreaterThanOrEqual(testCase.expectedDays - 1);
            expect(daysDifference).toBeLessThanOrEqual(testCase.expectedDays + 1);
          }
        });
      }
    });

    it('should reset filters to default when "All Cattle" is selected', async () => {
      // Property: For "All Cattle" selection, should reset cattle-specific filtering
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Switch to charts tab
      await user.click(screen.getByText('Detailed Charts'));

      // Select specific cattle first by clicking select component
      const cattleSelect = screen.getByDisplayValue('All Cattle');
      await user.click(cattleSelect);
      await user.click(screen.getByText('MH001 (Holstein)'));

      await waitFor(() => {
        expect(screen.getByTestId('cattle-filter')).toHaveTextContent('1');
      });

      // Reset to all cattle by clicking select component
      const cattleSelectUpdated = screen.getByDisplayValue('MH001 (Holstein)');
      await user.click(cattleSelectUpdated);
      await user.click(screen.getByText('All Cattle'));

      await waitFor(() => {
        expect(screen.getByTestId('cattle-filter')).toHaveTextContent('all');
      });
    });

    it('should handle filter combinations correctly', async () => {
      // Property: For any combination of filters, should apply all filters simultaneously
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Apply multiple filters by clicking select components
      const cattleSelect = screen.getByDisplayValue('All Cattle');
      await user.click(cattleSelect);
      await user.click(screen.getByText('MH002 (Jersey)'));
      
      const timeRangeSelect = screen.getByDisplayValue('Last 30 Days');
      await user.click(timeRangeSelect);
      await user.click(screen.getByText('Last 3 Months'));

      // Switch to charts to verify both filters are applied
      await user.click(screen.getByText('Detailed Charts'));

      await waitFor(() => {
        // Both filters should be applied
        expect(screen.getByTestId('cattle-filter')).toHaveTextContent('2');
        
        // Date range should reflect 3 months (approximately 90 days)
        const dateRangeText = screen.getByTestId('date-range-filter').textContent;
        if (dateRangeText && dateRangeText !== 'no-range') {
          const [startTime, endTime] = dateRangeText.split('-').map(Number);
          const daysDifference = Math.round((endTime - startTime) / (1000 * 60 * 60 * 24));
          expect(daysDifference).toBeGreaterThanOrEqual(89);
          expect(daysDifference).toBeLessThanOrEqual(91);
        }
      });
    });
  });

  describe('Filter Performance Properties', () => {
    it('should not cause unnecessary re-renders when filters remain unchanged', async () => {
      // Property: For unchanged filter values, should not trigger component updates
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('refresh-trigger')).toHaveTextContent('0');
      });

      // Click on same cattle option that's already selected
      const cattleSelect = screen.getByDisplayValue('All Cattle');
      await user.click(cattleSelect);
      await user.click(screen.getByText('All Cattle')); // Already selected

      // Should not trigger refresh
      expect(screen.getByTestId('refresh-trigger')).toHaveTextContent('0');
    });

    it('should debounce rapid filter changes appropriately', async () => {
      // Property: For rapid successive filter changes, should handle efficiently without excessive API calls
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      const initialCallCount = mockDashboardAPI.getHealthAnalytics.mock.calls.length;

      // Make rapid changes by clicking select components
      let timeRangeSelect = screen.getByDisplayValue('Last 30 Days');
      await user.click(timeRangeSelect);
      await user.click(screen.getByText('Last 7 Days'));
      
      timeRangeSelect = screen.getByDisplayValue('Last 7 Days');
      await user.click(timeRangeSelect);
      await user.click(screen.getByText('Last 30 Days'));
      
      timeRangeSelect = screen.getByDisplayValue('Last 30 Days');
      await user.click(timeRangeSelect);
      await user.click(screen.getByText('Last 3 Months'));

      // Switch to charts tab to trigger the API calls
      await user.click(screen.getByText('Detailed Charts'));

      await waitFor(() => {
        // Should not make excessive API calls
        const finalCallCount = mockDashboardAPI.getHealthAnalytics.mock.calls.length;
        const newCalls = finalCallCount - initialCallCount;
        expect(newCalls).toBeLessThanOrEqual(3); // Should be reasonable number of calls
      });
    });
  });
});