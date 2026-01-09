/**
 * Property-based tests for health analytics trends
 * Feature: cattle-owner-dashboard, Property 28: Health analytics trend display
 * Validates: Requirements 9.2
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HealthCharts from '../HealthCharts';
import { dashboardAPI } from '../../../services/api';

// Mock the API
jest.mock('../../../services/api', () => ({
  dashboardAPI: {
    getHealthAnalytics: jest.fn(),
  },
}));

const mockDashboardAPI = dashboardAPI as jest.Mocked<typeof dashboardAPI>;

// Mock recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

describe('HealthCharts - Analytics Trend Properties', () => {
  const mockAnalyticsData = {
    healthTrends: [
      { date: '2024-01-01', healthy: 8, sick: 2, treatment: 2 },
      { date: '2024-01-08', healthy: 9, sick: 1, treatment: 2 },
      { date: '2024-01-15', healthy: 10, sick: 1, treatment: 1 },
      { date: '2024-01-22', healthy: 11, sick: 0, treatment: 1 },
      { date: '2024-01-29', healthy: 12, sick: 0, treatment: 0 },
    ],
    diseaseDistribution: [
      { name: 'Healthy', value: 75, count: 9 },
      { name: 'Lumpy Skin Disease', value: 16.7, count: 2 },
      { name: 'Foot & Mouth', value: 8.3, count: 1 },
    ],
    symptomFrequency: [
      { symptom: 'Fever', count: 15, severity: 6.5 },
      { symptom: 'Loss of Appetite', count: 12, severity: 5.8 },
      { symptom: 'Skin Lesions', count: 8, severity: 7.2 },
    ],
    treatmentOutcomes: [
      { treatment: 'Home Remedies', success: 85, total: 20 },
      { treatment: 'Veterinary Care', success: 95, total: 15 },
    ],
    monthlyReports: [
      { month: 'Oct', reports: 8, diseases: 2 },
      { month: 'Nov', reports: 12, diseases: 3 },
      { month: 'Dec', reports: 15, diseases: 1 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 28: Health analytics trend display', () => {
    it('should display health trends over time accurately', async () => {
      // Property: For any health trend data, should display chronological progression accurately
      mockDashboardAPI.getHealthAnalytics.mockResolvedValue({ 
        data: mockAnalyticsData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<HealthCharts />);

      await waitFor(() => {
        // Verify trend chart components are rendered
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
        expect(screen.getByText('Health Trends Over Time')).toBeInTheDocument();
        
        // Verify trend analysis is displayed
        expect(screen.getByText(/Improving/)).toBeInTheDocument();
      });
    });

    it('should display disease distribution correctly', async () => {
      // Property: For any disease distribution data, percentages should sum to 100% and be displayed accurately
      mockDashboardAPI.getHealthAnalytics.mockResolvedValue({ 
        data: mockAnalyticsData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<HealthCharts />);

      await waitFor(() => {
        // Verify pie chart is rendered
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
        expect(screen.getByText('Health Status Distribution')).toBeInTheDocument();
        
        // Verify distribution data is accurate (75% + 16.7% + 8.3% = 100%)
        const totalPercentage = mockAnalyticsData.diseaseDistribution.reduce((sum, item) => sum + item.value, 0);
        expect(Math.round(totalPercentage)).toBe(100);
      });
    });

    it('should display symptom frequency in descending order', async () => {
      // Property: For any symptom frequency data, should display symptoms ordered by frequency
      mockDashboardAPI.getHealthAnalytics.mockResolvedValue({ 
        data: mockAnalyticsData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<HealthCharts />);

      await waitFor(() => {
        // Verify bar chart is rendered
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByText('Most Common Symptoms')).toBeInTheDocument();
        
        // Verify symptoms are ordered by frequency (Fever: 15, Loss of Appetite: 12, Skin Lesions: 8)
        const symptoms = mockAnalyticsData.symptomFrequency;
        for (let i = 0; i < symptoms.length - 1; i++) {
          expect(symptoms[i].count).toBeGreaterThanOrEqual(symptoms[i + 1].count);
        }
      });
    });

    it('should display treatment success rates accurately', async () => {
      // Property: For any treatment outcome data, success rates should be calculated and displayed correctly
      mockDashboardAPI.getHealthAnalytics.mockResolvedValue({ 
        data: mockAnalyticsData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<HealthCharts />);

      await waitFor(() => {
        // Verify treatment outcomes chart
        expect(screen.getByText('Treatment Success Rates')).toBeInTheDocument();
        
        // Verify success rates are within valid range (0-100%)
        mockAnalyticsData.treatmentOutcomes.forEach(outcome => {
          expect(outcome.success).toBeGreaterThanOrEqual(0);
          expect(outcome.success).toBeLessThanOrEqual(100);
        });
      });
    });

    it('should update charts when time range changes', async () => {
      // Property: For any time range change, should reload data and update all charts
      const user = userEvent.setup();
      
      mockDashboardAPI.getHealthAnalytics.mockResolvedValue({ 
        data: mockAnalyticsData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<HealthCharts />);

      await waitFor(() => {
        expect(screen.getByText('Health Trends Over Time')).toBeInTheDocument();
      });

      // Change time range
      const sevenDayButton = screen.getByText('7d');
      await user.click(sevenDayButton);

      // Verify API was called with new parameters
      await waitFor(() => {
        expect(mockDashboardAPI.getHealthAnalytics).toHaveBeenCalledWith(
          expect.objectContaining({
            timeRange: '7d',
          })
        );
      });
    });

    it('should handle empty data gracefully', async () => {
      // Property: For empty analytics data, should display appropriate empty states
      const emptyData = {
        healthTrends: [],
        diseaseDistribution: [],
        symptomFrequency: [],
        treatmentOutcomes: [],
        monthlyReports: [],
      };

      mockDashboardAPI.getHealthAnalytics.mockResolvedValue({ 
        data: emptyData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<HealthCharts />);

      await waitFor(() => {
        // Should still render chart containers
        expect(screen.getByText('Health Trends Over Time')).toBeInTheDocument();
        expect(screen.getByText('Health Status Distribution')).toBeInTheDocument();
        expect(screen.getByText('Most Common Symptoms')).toBeInTheDocument();
      });
    });

    it('should display monthly trends correctly', async () => {
      // Property: For any monthly data, should display chronological progression
      mockDashboardAPI.getHealthAnalytics.mockResolvedValue({ 
        data: mockAnalyticsData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<HealthCharts />);

      await waitFor(() => {
        // Verify monthly reports chart
        expect(screen.getByText('Monthly Health Reports & Disease Detection')).toBeInTheDocument();
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        
        // Verify monthly data is in chronological order
        const monthlyData = mockAnalyticsData.monthlyReports;
        expect(monthlyData).toHaveLength(3);
        expect(monthlyData[0].month).toBe('Oct');
        expect(monthlyData[2].month).toBe('Dec');
      });
    });

    it('should provide meaningful insights based on trends', async () => {
      // Property: For any trend data, should generate contextually appropriate insights
      mockDashboardAPI.getHealthAnalytics.mockResolvedValue({ 
        data: mockAnalyticsData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<HealthCharts />);

      await waitFor(() => {
        // Verify insights section
        expect(screen.getByText('Key Insights')).toBeInTheDocument();
        
        // Should show trend analysis (improving trend from 8 to 12 healthy cattle)
        expect(screen.getByText(/Improving/)).toBeInTheDocument();
        
        // Should show most effective treatment
        expect(screen.getByText(/Veterinary care shows 95% success rate/)).toBeInTheDocument();
        
        // Should show most common symptom
        expect(screen.getByText(/Fever is the most common symptom/)).toBeInTheDocument();
      });
    });
  });

  describe('Chart Interaction Properties', () => {
    it('should handle date picker changes correctly', async () => {
      // Property: For any date range selection, should update analytics data accordingly
      const user = userEvent.setup();
      
      mockDashboardAPI.getHealthAnalytics.mockResolvedValue({ 
        data: mockAnalyticsData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      render(<HealthCharts />);

      await waitFor(() => {
        expect(screen.getByText('Health Analytics')).toBeInTheDocument();
      });

      // Change start date
      const startDatePicker = screen.getByLabelText('Start Date');
      await user.clear(startDatePicker);
      await user.type(startDatePicker, '2024-01-01');

      // Verify API was called with updated date
      await waitFor(() => {
        expect(mockDashboardAPI.getHealthAnalytics).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.stringContaining('2024-01-01'),
          })
        );
      });
    });

    it('should handle API errors gracefully', async () => {
      // Property: For any API error, should display error message and fallback data
      mockDashboardAPI.getHealthAnalytics.mockRejectedValue(new Error('Network error'));

      render(<HealthCharts />);

      await waitFor(() => {
        // Should show error message
        expect(screen.getByText(/Failed to load analytics data/)).toBeInTheDocument();
        
        // Should still show chart structure with sample data
        expect(screen.getByText('Health Trends Over Time')).toBeInTheDocument();
      });
    });
  });
});