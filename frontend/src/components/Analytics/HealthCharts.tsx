import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ButtonGroup,
  Chip,
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { dashboardAPI } from '../../services/api';

interface HealthChartsProps {
  cattleId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface ChartData {
  healthTrends: any[];
  diseaseDistribution: any[];
  symptomFrequency: any[];
  treatmentOutcomes: any[];
  monthlyReports: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const HealthCharts: React.FC<HealthChartsProps> = ({ cattleId, dateRange }) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedCattle, setSelectedCattle] = useState(cattleId || 'all');
  const [startDate, setStartDate] = useState<Date | null>(
    dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState<Date | null>(
    dateRange?.end || new Date()
  );

  useEffect(() => {
    loadChartData();
  }, [timeRange, selectedCattle, startDate, endDate]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        timeRange,
        cattleId: selectedCattle !== 'all' ? selectedCattle : undefined,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      };

      const response = await dashboardAPI.getHealthAnalytics(params);
      setChartData(response.data);

    } catch (err: any) {
      console.error('Failed to load chart data:', err);
      setError('Failed to load analytics data.');
      
      // Fallback to mock data
      const mockData: ChartData = {
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
          { symptom: 'Lethargy', count: 10, severity: 5.5 },
          { symptom: 'Difficulty Breathing', count: 3, severity: 8.1 },
        ],
        treatmentOutcomes: [
          { treatment: 'Home Remedies', success: 85, total: 20 },
          { treatment: 'Veterinary Care', success: 95, total: 15 },
          { treatment: 'Emergency Care', success: 90, total: 5 },
        ],
        monthlyReports: [
          { month: 'Oct', reports: 8, diseases: 2 },
          { month: 'Nov', reports: 12, diseases: 3 },
          { month: 'Dec', reports: 15, diseases: 1 },
          { month: 'Jan', reports: 10, diseases: 2 },
        ],
      };
      setChartData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    const now = new Date();
    switch (range) {
      case '7d':
        setStartDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        break;
      case '30d':
        setStartDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        break;
      case '90d':
        setStartDate(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
        break;
      case '1y':
        setStartDate(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
        break;
    }
    setEndDate(now);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !chartData) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h6">
          📊 Health Analytics
        </Typography>
        
        <Box display="flex" gap={2} flexWrap="wrap">
          <ButtonGroup size="small">
            {['7d', '30d', '90d', '1y'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'contained' : 'outlined'}
                onClick={() => handleTimeRangeChange(range)}
              >
                {range}
              </Button>
            ))}
          </ButtonGroup>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error} (Showing sample data)
        </Alert>
      )}

      {/* Charts Grid */}
        <Grid container spacing={3}>
          {/* Health Trends Over Time */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Health Trends Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData?.healthTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="healthy"
                      stackId="1"
                      stroke="#4CAF50"
                      fill="#4CAF50"
                      name="Healthy"
                    />
                    <Area
                      type="monotone"
                      dataKey="treatment"
                      stackId="1"
                      stroke="#2196F3"
                      fill="#2196F3"
                      name="Under Treatment"
                    />
                    <Area
                      type="monotone"
                      dataKey="sick"
                      stackId="1"
                      stroke="#FF9800"
                      fill="#FF9800"
                      name="Sick"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Disease Distribution */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Health Status Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData?.diseaseDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData?.diseaseDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Symptom Frequency */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Most Common Symptoms
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData?.symptomFrequency} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="symptom" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Frequency" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Treatment Outcomes */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Treatment Success Rates
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData?.treatmentOutcomes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="treatment" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                    <Bar dataKey="success" fill="#4CAF50" name="Success Rate" />
                  </BarChart>
                </ResponsiveContainer>
                <Box mt={2}>
                  {chartData?.treatmentOutcomes.map((outcome, index) => (
                    <Chip
                      key={index}
                      label={`${outcome.treatment}: ${outcome.success}% (${outcome.total} cases)`}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Monthly Reports */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Health Reports & Disease Detection
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData?.monthlyReports}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="reports"
                      stroke="#2196F3"
                      strokeWidth={2}
                      name="Health Reports"
                    />
                    <Line
                      type="monotone"
                      dataKey="diseases"
                      stroke="#FF5722"
                      strokeWidth={2}
                      name="Diseases Detected"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Summary Insights */}
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            📈 Key Insights
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Health Trend:</strong> {chartData?.healthTrends?.length > 1 && 
                  chartData.healthTrends[chartData.healthTrends.length - 1].healthy > 
                  chartData.healthTrends[0].healthy ? 'Improving' : 'Stable'} over the selected period.
                </Typography>
              </Alert>
            </Grid>
            <Grid item xs={12} md={4}>
              <Alert severity="success">
                <Typography variant="body2">
                  <strong>Most Effective:</strong> Veterinary care shows {chartData?.treatmentOutcomes?.find(t => t.treatment === 'Veterinary Care')?.success || 95}% success rate.
                </Typography>
              </Alert>
            </Grid>
            <Grid item xs={12} md={4}>
              <Alert severity="warning">
                <Typography variant="body2">
                  <strong>Watch Out:</strong> {chartData?.symptomFrequency?.[0]?.symptom || 'Fever'} is the most common symptom reported.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </Box>
    </Box>
  );
};

export default HealthCharts;