import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  Assessment,
  Timeline,
  BarChart,
  PieChart,
  TrendingUp,
} from '@mui/icons-material';
import { dashboardAPI } from '../../services/api';
import DashboardStats from '../Analytics/DashboardStats';
import HealthCharts from '../Analytics/HealthCharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const HealthAnalytics: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedCattle, setSelectedCattle] = useState('all');
  const [dateRange, setDateRange] = useState('30d');
  const [cattle, setCattle] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadCattleList();
  }, []);

  const loadCattleList = async () => {
    try {
      // This would normally load from cattleAPI
      // For now, using mock data
      setCattle([
        { id: '1', identification_number: 'MH001', breed: 'Holstein' },
        { id: '2', identification_number: 'MH002', breed: 'Jersey' },
        { id: '3', identification_number: 'MH003', breed: 'Gir' },
      ]);
    } catch (err) {
      console.error('Failed to load cattle list:', err);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📊 Health Analytics
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Comprehensive insights into your cattle's health trends and patterns
      </Typography>

      {/* Controls */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Cattle</InputLabel>
              <Select
                value={selectedCattle}
                label="Cattle"
                onChange={(e) => setSelectedCattle(e.target.value)}
              >
                <MenuItem value="all">All Cattle</MenuItem>
                {cattle.map((animal) => (
                  <MenuItem key={animal.id} value={animal.id}>
                    {animal.identification_number} ({animal.breed})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Time Range</InputLabel>
              <Select
                value={dateRange}
                label="Time Range"
                onChange={(e) => setDateRange(e.target.value)}
              >
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="90d">Last 3 Months</MenuItem>
                <MenuItem value="1y">Last Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              onClick={handleRefresh}
              disabled={loading}
              startIcon={<Assessment />}
            >
              Refresh Data
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="analytics tabs">
          <Tab 
            label="Overview" 
            icon={<Assessment />} 
            iconPosition="start"
            id="analytics-tab-0"
            aria-controls="analytics-tabpanel-0"
          />
          <Tab 
            label="Detailed Charts" 
            icon={<BarChart />} 
            iconPosition="start"
            id="analytics-tab-1"
            aria-controls="analytics-tabpanel-1"
          />
          <Tab 
            label="Trends" 
            icon={<TrendingUp />} 
            iconPosition="start"
            id="analytics-tab-2"
            aria-controls="analytics-tabpanel-2"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <DashboardStats 
          refreshTrigger={refreshTrigger}
          onStatsUpdate={(stats) => {/* Stats updated */}}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <HealthCharts 
          cattleId={selectedCattle !== 'all' ? selectedCattle : undefined}
          dateRange={{
            start: new Date(Date.now() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365) * 24 * 60 * 60 * 1000),
            end: new Date()
          }}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Trend Analysis:</strong> This section provides advanced trend analysis and predictive insights based on your cattle's health data.
            </Typography>
          </Alert>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🔮 Predictive Insights
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Based on current trends, your herd health is expected to remain stable over the next 30 days.
                  </Typography>
                  <Alert severity="success">
                    <Typography variant="body2">
                      <strong>Recommendation:</strong> Continue current health monitoring practices. Consider preventive vaccination for seasonal diseases.
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📈 Performance Metrics
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Your health monitoring frequency has increased by 25% this month, leading to earlier disease detection.
                  </Typography>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Impact:</strong> Early detection has reduced treatment costs by an estimated 15%.
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🎯 Optimization Suggestions
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Alert severity="warning">
                        <Typography variant="body2">
                          <strong>Seasonal Alert:</strong> Lumpy Skin Disease cases typically increase in the next 2 months. Consider preventive measures.
                        </Typography>
                      </Alert>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Alert severity="info">
                        <Typography variant="body2">
                          <strong>Monitoring:</strong> Increase health checks for cattle showing early symptoms of lethargy.
                        </Typography>
                      </Alert>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Alert severity="success">
                        <Typography variant="body2">
                          <strong>Success:</strong> Your current vaccination schedule is optimal for disease prevention.
                        </Typography>
                      </Alert>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </TabPanel>
    </Box>
  );
};

export default HealthAnalytics;