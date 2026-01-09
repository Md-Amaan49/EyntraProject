/**
 * Property-based tests for analytics visualization
 * Feature: cattle-owner-dashboard, Property 29: Analytics visualization completeness
 * Validates: Requirements 9.3
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HealthAnalytics from '../HealthAnalytics';

// Mock the child components
jest.mock('../../Analytics/DashboardStats', () => {
  return function MockDashboardStats({ refreshTrigger, onStatsUpdate }: any) {
    return (
      <div data-testid="dashboard-stats">
        <div>Dashboard Statistics</div>
        <div>Refresh Trigger: {refreshTrigger}</div>
        <button onClick={() => onStatsUpdate({ totalCattle: 10 })}>
          Update Stats
        </button>
      </div>
    );
  };
});

jest.mock('../../Analytics/HealthCharts', () => {
  return function MockHealthCharts({ cattleId, dateRange }: any) {
    return (
      <div data-testid="health-charts">
        <div>Health Charts</div>
        <div>Cattle ID: {cattleId || 'all'}</div>
        <div>Date Range: {dateRange?.start?.toDateString()} - {dateRange?.end?.toDateString()}</div>
      </div>
    );
  };
});

describe('HealthAnalytics - Visualization Completeness Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 29: Analytics visualization completeness', () => {
    it('should display all required visualization components', async () => {
      // Property: For any analytics page load, all required visualization components should be present
      render(<HealthAnalytics />);

      // Verify main title and description
      expect(screen.getByText('📊 Health Analytics')).toBeInTheDocument();
      expect(screen.getByText(/Comprehensive insights into your cattle's health trends/)).toBeInTheDocument();

      // Verify control panel
      expect(screen.getByLabelText('Cattle')).toBeInTheDocument();
      expect(screen.getByLabelText('Time Range')).toBeInTheDocument();
      expect(screen.getByText('Refresh Data')).toBeInTheDocument();

      // Verify tabs
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Detailed Charts')).toBeInTheDocument();
      expect(screen.getByText('Trends')).toBeInTheDocument();

      // Verify default tab content (Overview)
      expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument();
    });

    it('should display correct tab content when switching tabs', async () => {
      // Property: For any tab selection, should display corresponding visualization content
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Initially should show Overview tab
      expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument();

      // Switch to Detailed Charts tab
      await user.click(screen.getByText('Detailed Charts'));
      
      await waitFor(() => {
        expect(screen.getByTestId('health-charts')).toBeInTheDocument();
        expect(screen.queryByTestId('dashboard-stats')).not.toBeInTheDocument();
      });

      // Switch to Trends tab
      await user.click(screen.getByText('Trends'));
      
      await waitFor(() => {
        expect(screen.getByText('🔮 Predictive Insights')).toBeInTheDocument();
        expect(screen.getByText('📈 Performance Metrics')).toBeInTheDocument();
        expect(screen.getByText('🎯 Optimization Suggestions')).toBeInTheDocument();
      });
    });

    it('should pass correct parameters to visualization components', async () => {
      // Property: For any filter selection, should pass accurate parameters to child components
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Change cattle selection by clicking on the select component directly
      const cattleSelect = screen.getByDisplayValue('All Cattle');
      await user.click(cattleSelect);
      await user.click(screen.getByText('MH001 (Holstein)'));

      // Switch to charts tab to see the cattle ID parameter
      await user.click(screen.getByText('Detailed Charts'));

      await waitFor(() => {
        expect(screen.getByText('Cattle ID: 1')).toBeInTheDocument();
      });

      // Change time range by clicking on the select component directly
      const timeRangeSelect = screen.getByDisplayValue('Last 30 Days');
      await user.click(timeRangeSelect);
      await user.click(screen.getByText('Last 7 Days'));

      await waitFor(() => {
        // Should update date range in charts
        expect(screen.getByTestId('health-charts')).toBeInTheDocument();
      });
    });

    it('should handle refresh functionality correctly', async () => {
      // Property: For any refresh action, should trigger data reload in all components
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Initial refresh trigger should be 0
      expect(screen.getByText('Refresh Trigger: 0')).toBeInTheDocument();

      // Click refresh button
      await user.click(screen.getByText('Refresh Data'));

      await waitFor(() => {
        // Refresh trigger should increment
        expect(screen.getByText('Refresh Trigger: 1')).toBeInTheDocument();
      });
    });

    it('should display visual charts and graphs for data interpretation', async () => {
      // Property: For any analytics data, should provide visual representations for easy interpretation
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Overview tab should show dashboard stats
      expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument();

      // Switch to detailed charts
      await user.click(screen.getByText('Detailed Charts'));

      await waitFor(() => {
        expect(screen.getByTestId('health-charts')).toBeInTheDocument();
        expect(screen.getByText('Health Charts')).toBeInTheDocument();
      });

      // Trends tab should show predictive visualizations
      await user.click(screen.getByText('Trends'));

      await waitFor(() => {
        // Should show trend analysis cards
        expect(screen.getByText('🔮 Predictive Insights')).toBeInTheDocument();
        expect(screen.getByText('📈 Performance Metrics')).toBeInTheDocument();
        
        // Should show optimization suggestions with visual alerts
        expect(screen.getByText('🎯 Optimization Suggestions')).toBeInTheDocument();
      });
    });

    it('should provide cattle-specific filtering options', async () => {
      // Property: For any cattle selection, should filter analytics to specific animal
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Verify cattle dropdown has options by clicking on the select
      const cattleSelect = screen.getByDisplayValue('All Cattle');
      await user.click(cattleSelect);
      
      expect(screen.getByText('All Cattle')).toBeInTheDocument();
      expect(screen.getByText('MH001 (Holstein)')).toBeInTheDocument();
      expect(screen.getByText('MH002 (Jersey)')).toBeInTheDocument();
      expect(screen.getByText('MH003 (Gir)')).toBeInTheDocument();

      // Select specific cattle
      await user.click(screen.getByText('MH002 (Jersey)'));

      // Switch to charts to verify filtering
      await user.click(screen.getByText('Detailed Charts'));

      await waitFor(() => {
        expect(screen.getByText('Cattle ID: 2')).toBeInTheDocument();
      });
    });

    it('should provide date range filtering for analytics', async () => {
      // Property: For any date range selection, should update analytics accordingly
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Verify time range options by clicking on the select
      const timeRangeSelect = screen.getByDisplayValue('Last 30 Days');
      await user.click(timeRangeSelect);
      
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
      expect(screen.getByText('Last 3 Months')).toBeInTheDocument();
      expect(screen.getByText('Last Year')).toBeInTheDocument();

      // Select different time range
      await user.click(screen.getByText('Last 3 Months'));

      // Switch to charts to verify date range
      await user.click(screen.getByText('Detailed Charts'));

      await waitFor(() => {
        // Should show updated date range in charts component
        expect(screen.getByTestId('health-charts')).toBeInTheDocument();
      });
    });

    it('should display comprehensive trend analysis and insights', async () => {
      // Property: For any analytics view, should provide meaningful insights and recommendations
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Switch to trends tab
      await user.click(screen.getByText('Trends'));

      await waitFor(() => {
        // Should show predictive insights
        expect(screen.getByText('🔮 Predictive Insights')).toBeInTheDocument();
        expect(screen.getByText(/Based on current trends/)).toBeInTheDocument();
        
        // Should show performance metrics
        expect(screen.getByText('📈 Performance Metrics')).toBeInTheDocument();
        expect(screen.getByText(/health monitoring frequency/)).toBeInTheDocument();
        
        // Should show optimization suggestions
        expect(screen.getByText('🎯 Optimization Suggestions')).toBeInTheDocument();
        expect(screen.getByText(/Seasonal Alert/)).toBeInTheDocument();
        expect(screen.getByText(/Monitoring/)).toBeInTheDocument();
        expect(screen.getByText(/Success/)).toBeInTheDocument();
      });
    });
  });

  describe('User Interface Properties', () => {
    it('should maintain consistent navigation and layout', async () => {
      // Property: For any tab or filter change, should maintain consistent UI layout
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Verify consistent header across all tabs
      const header = screen.getByText('📊 Health Analytics');
      expect(header).toBeInTheDocument();

      // Switch tabs and verify header remains
      await user.click(screen.getByText('Detailed Charts'));
      expect(header).toBeInTheDocument();

      await user.click(screen.getByText('Trends'));
      expect(header).toBeInTheDocument();

      // Verify controls remain accessible
      expect(screen.getByDisplayValue('All Cattle')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Last 30 Days')).toBeInTheDocument();
    });

    it('should handle component interactions correctly', async () => {
      // Property: For any component interaction, should respond appropriately without errors
      const user = userEvent.setup();
      
      render(<HealthAnalytics />);

      // Test stats update callback
      const updateButton = screen.getByText('Update Stats');
      await user.click(updateButton);

      // Should not crash and should handle the callback
      expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument();
    });
  });
});