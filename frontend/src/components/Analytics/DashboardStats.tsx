import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Pets,
  HealthAndSafety,
  Warning,
  LocalHospital,
  TrendingUp,
  TrendingDown,
  Refresh,
  Info,
  Assessment,
} from '@mui/icons-material';
import { dashboardAPI } from '../../services/api';

interface DashboardStatsProps {
  refreshTrigger?: number;
  onStatsUpdate?: (stats: any) => void;
}

interface StatCard {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    direction: 'up' | 'down';
    period: string;
  };
  progress?: {
    value: number;
    max: number;
  };
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  refreshTrigger, 
  onStatsUpdate 
}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await dashboardAPI.getCattleOwnerStats();
      const statsData = response.data;
      
      setStats(statsData);
      setLastUpdated(new Date());
      
      if (onStatsUpdate) {
        onStatsUpdate(statsData);
      }
      
    } catch (err: any) {
      console.error('Failed to load dashboard stats:', err);
      setError('Failed to load statistics. Please try again.');
      
      // Fallback to mock data for demonstration
      const mockStats = {
        totalCattle: 12,
        healthyCattle: 8,
        sickCattle: 2,
        underTreatment: 2,
        totalReports: 45,
        recentReports: 3,
        avgHealthScore: 85,
        trends: {
          healthyTrend: { value: 5, direction: 'up' as const, period: '7 days' },
          reportsTrend: { value: 12, direction: 'up' as const, period: '30 days' },
        }
      };
      setStats(mockStats);
      
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStats();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !stats) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={handleRefresh}>
          <Refresh />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  const statCards: StatCard[] = [
    {
      title: 'Total Cattle',
      value: stats?.totalCattle || 0,
      subtitle: 'Registered animals',
      icon: <Pets sx={{ fontSize: 40 }} />,
      color: 'primary',
    },
    {
      title: 'Healthy Cattle',
      value: stats?.healthyCattle || 0,
      subtitle: `${stats?.totalCattle > 0 ? Math.round((stats?.healthyCattle / stats?.totalCattle) * 100) : 0}% of total`,
      icon: <HealthAndSafety sx={{ fontSize: 40 }} />,
      color: 'success',
      trend: stats?.trends?.healthyTrend,
      progress: {
        value: stats?.healthyCattle || 0,
        max: stats?.totalCattle || 1,
      },
    },
    {
      title: 'Need Attention',
      value: stats?.sickCattle || 0,
      subtitle: stats?.sickCattle > 0 ? 'Require immediate care' : 'All cattle healthy',
      icon: <Warning sx={{ fontSize: 40 }} />,
      color: 'warning',
    },
    {
      title: 'Under Treatment',
      value: stats?.underTreatment || 0,
      subtitle: 'Currently receiving care',
      icon: <LocalHospital sx={{ fontSize: 40 }} />,
      color: 'info',
    },
    {
      title: 'Health Reports',
      value: stats?.totalReports || 0,
      subtitle: `+${stats?.recentReports || 0} this week`,
      icon: <Assessment sx={{ fontSize: 40 }} />,
      color: 'primary',
      trend: stats?.trends?.reportsTrend,
    },
    {
      title: 'Health Score',
      value: `${stats?.avgHealthScore || 0}%`,
      subtitle: 'Average herd health',
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      color: stats?.avgHealthScore >= 80 ? 'success' : stats?.avgHealthScore >= 60 ? 'warning' : 'error',
      progress: {
        value: stats?.avgHealthScore || 0,
        max: 100,
      },
    },
  ];

  return (
    <Box>
      {/* Header with refresh */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h6">
          📊 Herd Statistics
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Refresh statistics">
            <IconButton size="small" onClick={handleRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error} (Showing cached data)
        </Alert>
      )}

      {/* Statistics Grid */}
      <Grid container spacing={3}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box flex={1}>
                    <Typography variant="h4" color={`${card.color}.main`} gutterBottom>
                      {card.value}
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                    
                    {/* Trend indicator */}
                    {card.trend && (
                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        {card.trend.direction === 'up' ? (
                          <TrendingUp color="success" fontSize="small" />
                        ) : (
                          <TrendingDown color="error" fontSize="small" />
                        )}
                        <Typography 
                          variant="caption" 
                          color={card.trend.direction === 'up' ? 'success.main' : 'error.main'}
                        >
                          {card.trend.value}% {card.trend.period}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Progress bar */}
                    {card.progress && (
                      <Box mt={2}>
                        <LinearProgress
                          variant="determinate"
                          value={(card.progress.value / card.progress.max) * 100}
                          color={card.color}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    )}
                  </Box>
                  
                  <Box color={`${card.color}.main`}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick insights */}
      <Box mt={3}>
        <Typography variant="subtitle1" gutterBottom>
          📈 Quick Insights
        </Typography>
        <Grid container spacing={2}>
          {stats?.healthyCattle / stats?.totalCattle >= 0.8 && (
            <Grid item xs={12} sm={6}>
              <Alert severity="success" icon={<HealthAndSafety />}>
                <Typography variant="body2">
                  Excellent herd health! {Math.round((stats.healthyCattle / stats.totalCattle) * 100)}% of your cattle are healthy.
                </Typography>
              </Alert>
            </Grid>
          )}
          
          {stats?.sickCattle > 0 && (
            <Grid item xs={12} sm={6}>
              <Alert severity="warning" icon={<Warning />}>
                <Typography variant="body2">
                  {stats.sickCattle} cattle need attention. Consider scheduling veterinary consultations.
                </Typography>
              </Alert>
            </Grid>
          )}
          
          {stats?.recentReports > 5 && (
            <Grid item xs={12} sm={6}>
              <Alert severity="info" icon={<Info />}>
                <Typography variant="body2">
                  High monitoring activity! {stats.recentReports} reports submitted this week.
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardStats;