import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Fab,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  useMediaQuery,
  useTheme,
  Drawer,
  IconButton,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Add,
  Pets,
  LocalHospital,
  Assessment,
  Warning,
  PersonSearch,
  TrendingUp,
  Notifications,
  Schedule,
  HealthAndSafety,
  ReportProblem,
  Menu,
  Close,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { cattleAPI, healthAPI, dashboardAPI } from '../../services/api';
import { Cattle, SymptomEntry, DashboardStatistics, HealthTrend } from '../../types';
import CattleCard from '../Cattle/CattleCard';
import AddCattleForm from '../Cattle/AddCattleForm';

interface CattleOwnerDashboardProps {
  user: any;
}

const CattleOwnerDashboard: React.FC<CattleOwnerDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [cattle, setCattle] = useState<Cattle[]>([]);
  const [recentSymptoms, setRecentSymptoms] = useState<SymptomEntry[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStatistics | null>(null);
  const [healthTrends, setHealthTrends] = useState<HealthTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addCattleDialogOpen, setAddCattleDialogOpen] = useState(false);
  const [nearbyAlerts, setNearbyAlerts] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load cattle data
      const cattleResponse = await cattleAPI.list();
      let cattleData = cattleResponse.data;
      if (cattleData && typeof cattleData === 'object' && 'results' in cattleData) {
        cattleData = cattleData.results;
      }
      setCattle(Array.isArray(cattleData) ? cattleData : []);
      
      // Load recent symptoms
      try {
        const symptomsResponse = await healthAPI.getSymptoms();
        let symptomsData = symptomsResponse.data;
        if (symptomsData && typeof symptomsData === 'object' && 'results' in symptomsData) {
          symptomsData = symptomsData.results;
        }
        setRecentSymptoms(Array.isArray(symptomsData) ? symptomsData.slice(0, 5) : []);
      } catch (symptomsErr) {
        console.warn('Could not load symptoms:', symptomsErr);
        setRecentSymptoms([]);
      }

      // Load dashboard statistics
      try {
        const statsResponse = await dashboardAPI.getCattleOwnerStats();
        setDashboardStats(statsResponse.data);
      } catch (statsErr) {
        console.warn('Could not load dashboard stats:', statsErr);
      }

      // Load health trends
      try {
        const trendsResponse = await dashboardAPI.getHealthTrends({ days: 30 });
        setHealthTrends(trendsResponse.data.trends || []);
      } catch (trendsErr) {
        console.warn('Could not load health trends:', trendsErr);
      }

      // Load nearby disease alerts
      try {
        const alertsResponse = await dashboardAPI.getOutbreakAlerts();
        setNearbyAlerts(alertsResponse.data.outbreak_alerts || []);
      } catch (alertsErr) {
        console.warn('Could not load disease alerts:', alertsErr);
      }
      
    } catch (err: any) {
      console.error('Dashboard error:', err);
      setError('Failed to load dashboard data. Please check your connection and try again.');
      setCattle([]);
      setRecentSymptoms([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalCattle: cattle.length,
    healthyCattle: cattle.filter(c => c.health_status === 'healthy').length,
    sickCattle: cattle.filter(c => c.health_status === 'sick').length,
    underTreatment: cattle.filter(c => c.health_status === 'under_treatment').length,
  };

  const healthPercentage = stats.totalCattle > 0 ? (stats.healthyCattle / stats.totalCattle) * 100 : 0;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Mobile Header */}
      {isMobile && (
        <AppBar position="static" sx={{ mb: 2, borderRadius: 1 }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Cattle Dashboard
            </Typography>
            <IconButton
              color="inherit"
              onClick={() => setMobileMenuOpen(true)}
              edge="end"
            >
              <Menu />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <>
          <Typography variant="h4" gutterBottom>
            Cattle Owner Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Welcome back, {user.name}! Here's your herd overview.
          </Typography>
        </>
      )}

      {/* Mobile Quick Actions Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: { width: '80%', maxWidth: 300 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Quick Actions</Typography>
            <IconButton onClick={() => setMobileMenuOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          
          <List>
            <ListItem 
              button 
              onClick={() => {
                navigate('/health/enhanced-detection');
                setMobileMenuOpen(false);
              }}
            >
              <ListItemIcon><Assessment /></ListItemIcon>
              <ListItemText primary="🤖 AI Disease Detection" />
            </ListItem>
            
            <ListItem 
              button 
              onClick={() => {
                if (cattle.length === 0) {
                  alert('Please add cattle first before reporting symptoms.');
                } else if (cattle.length === 1) {
                  navigate(`/health/submit?cattle=${cattle[0].id}`);
                } else {
                  navigate('/health/submit');
                }
                setMobileMenuOpen(false);
              }}
            >
              <ListItemIcon><LocalHospital /></ListItemIcon>
              <ListItemText primary="📝 Report Symptoms" />
            </ListItem>
            
            <ListItem 
              button 
              onClick={() => {
                navigate('/veterinarians');
                setMobileMenuOpen(false);
              }}
            >
              <ListItemIcon><PersonSearch /></ListItemIcon>
              <ListItemText primary="🩺 Find Veterinarians" />
            </ListItem>
            
            <ListItem 
              button 
              onClick={() => {
                navigate('/consultations');
                setMobileMenuOpen(false);
              }}
            >
              <ListItemIcon><Schedule /></ListItemIcon>
              <ListItemText primary="📅 My Consultations" />
            </ListItem>
            
            <ListItem 
              button 
              onClick={() => {
                navigate('/health/analytics');
                setMobileMenuOpen(false);
              }}
            >
              <ListItemIcon><TrendingUp /></ListItemIcon>
              <ListItemText primary="📊 Health Analytics" />
            </ListItem>
            
            <ListItem 
              button 
              onClick={() => {
                setAddCattleDialogOpen(true);
                setMobileMenuOpen(false);
              }}
            >
              <ListItemIcon><Add /></ListItemIcon>
              <ListItemText primary="➕ Add Cattle" />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Herd Health Overview */}
      <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box display="flex" alignItems="center" flexDirection={isMobile ? 'column' : 'row'}>
                <Pets color="primary" sx={{ mr: isMobile ? 0 : 2, mb: isMobile ? 1 : 0, fontSize: isMobile ? 30 : 40 }} />
                <Box textAlign={isMobile ? 'center' : 'left'}>
                  <Typography variant={isMobile ? "h5" : "h4"}>{stats.totalCattle}</Typography>
                  <Typography color="text.secondary" variant={isMobile ? "caption" : "body2"}>
                    Total Cattle
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box display="flex" alignItems="center" flexDirection={isMobile ? 'column' : 'row'}>
                <HealthAndSafety color="success" sx={{ mr: isMobile ? 0 : 2, mb: isMobile ? 1 : 0, fontSize: isMobile ? 30 : 40 }} />
                <Box textAlign={isMobile ? 'center' : 'left'}>
                  <Typography variant={isMobile ? "h5" : "h4"}>{stats.healthyCattle}</Typography>
                  <Typography color="text.secondary" variant={isMobile ? "caption" : "body2"}>
                    Healthy
                  </Typography>
                  {!isMobile && (
                    <LinearProgress 
                      variant="determinate" 
                      value={healthPercentage} 
                      color="success"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box display="flex" alignItems="center" flexDirection={isMobile ? 'column' : 'row'}>
                <Warning color="warning" sx={{ mr: isMobile ? 0 : 2, mb: isMobile ? 1 : 0, fontSize: isMobile ? 30 : 40 }} />
                <Box textAlign={isMobile ? 'center' : 'left'}>
                  <Typography variant={isMobile ? "h5" : "h4"}>{stats.sickCattle}</Typography>
                  <Typography color="text.secondary" variant={isMobile ? "caption" : "body2"}>
                    Need Attention
                  </Typography>
                  {stats.sickCattle > 0 && !isMobile && (
                    <Chip 
                      label="Action Required" 
                      color="warning" 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box display="flex" alignItems="center" flexDirection={isMobile ? 'column' : 'row'}>
                <LocalHospital color="info" sx={{ mr: isMobile ? 0 : 2, mb: isMobile ? 1 : 0, fontSize: isMobile ? 30 : 40 }} />
                <Box textAlign={isMobile ? 'center' : 'left'}>
                  <Typography variant={isMobile ? "h5" : "h4"}>{stats.underTreatment}</Typography>
                  <Typography color="text.secondary" variant={isMobile ? "caption" : "body2"}>
                    Under Treatment
                  </Typography>
                  {stats.underTreatment > 0 && !isMobile && (
                    <Chip 
                      label="Monitoring" 
                      color="info" 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions for Cattle Owners - Desktop Only */}
      {!isMobile && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🚀 Quick Actions
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<Assessment />}
                      onClick={() => navigate('/health/enhanced-detection')}
                      sx={{ 
                        bgcolor: '#1976d2',
                        py: 1.5,
                        '&:hover': { bgcolor: '#1565c0' }
                      }}
                    >
                      🤖 AI Disease Detection
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<LocalHospital />}
                      onClick={() => {
                        if (cattle.length === 0) {
                          alert('Please add cattle first before reporting symptoms.');
                        } else if (cattle.length === 1) {
                          navigate(`/health/submit?cattle=${cattle[0].id}`);
                        } else {
                          navigate('/health/submit');
                        }
                      }}
                      sx={{ py: 1.5 }}
                    >
                      📝 Report Symptoms
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<PersonSearch />}
                      onClick={() => navigate('/veterinarians')}
                      sx={{ py: 1.5 }}
                    >
                      🩺 Find Veterinarians
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Schedule />}
                      onClick={() => navigate('/consultations')}
                      sx={{ py: 1.5 }}
                    >
                      📅 My Consultations
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<TrendingUp />}
                      onClick={() => navigate('/health/analytics')}
                      sx={{ py: 1.5 }}
                    >
                      📊 Health Analytics
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Add />}
                      onClick={() => setAddCattleDialogOpen(true)}
                      sx={{ py: 1.5 }}
                    >
                      ➕ Add Cattle
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔔 Recent Health Activity
                </Typography>
                {recentSymptoms.length > 0 ? (
                  <List dense>
                    {recentSymptoms.map((symptom) => (
                      <ListItem key={symptom.id} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <LocalHospital 
                            color={symptom.severity === 'severe' ? 'error' : 
                                  symptom.severity === 'moderate' ? 'warning' : 'info'} 
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${symptom.cattle_name} - ${symptom.cattle_id_number}`}
                          secondary={
                            <Box>
                              <Chip 
                                label={symptom.severity} 
                                size="small" 
                                color={symptom.severity === 'severe' ? 'error' : 
                                      symptom.severity === 'moderate' ? 'warning' : 'default'}
                                sx={{ mr: 1 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(symptom.created_at).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">
                    No recent health reports
                  </Typography>
                )}
                <Button
                  size="small"
                  onClick={() => navigate('/health/history')}
                  sx={{ mt: 1 }}
                >
                  View Full History
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Mobile Quick Actions - Floating Buttons */}
      {isMobile && (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<Assessment />}
                onClick={() => navigate('/health/enhanced-detection')}
                sx={{ 
                  bgcolor: '#1976d2',
                  py: 2,
                  fontSize: '0.875rem',
                  '&:hover': { bgcolor: '#1565c0' }
                }}
              >
                🤖 AI Detection
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<LocalHospital />}
                onClick={() => {
                  if (cattle.length === 0) {
                    alert('Please add cattle first before reporting symptoms.');
                  } else if (cattle.length === 1) {
                    navigate(`/health/submit?cattle=${cattle[0].id}`);
                  } else {
                    navigate('/health/submit');
                  }
                }}
                sx={{ py: 2, fontSize: '0.875rem' }}
              >
                📝 Report
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Nearby Disease Alerts */}
      {nearbyAlerts.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.main">
                  ⚠️ Nearby Disease Alerts
                </Typography>
                <List>
                  {nearbyAlerts.slice(0, 3).map((alert, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <ReportProblem color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={alert.disease_name}
                        secondary={`${alert.distance}km away - ${alert.cases} cases reported`}
                      />
                      <Chip 
                        label={alert.risk_level} 
                        color={alert.risk_level === 'high' ? 'error' : 'warning'}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
                <Button
                  size="small"
                  onClick={() => navigate('/alerts')}
                  sx={{ mt: 1 }}
                >
                  View All Alerts
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Your Cattle Grid */}
      <Typography variant="h6" gutterBottom>
        🐄 Your Cattle
      </Typography>
      {cattle.length > 0 ? (
        <Grid container spacing={isMobile ? 1 : 2}>
          {cattle.slice(0, isMobile ? 4 : 6).map((animal) => (
            <Grid item xs={12} sm={6} md={4} key={animal.id}>
              <CattleCard cattle={animal} onUpdate={loadDashboardData} />
            </Grid>
          ))}
          {cattle.length > (isMobile ? 4 : 6) && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Showing {isMobile ? 4 : 6} of {cattle.length} cattle
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/cattle')}
                  fullWidth={isMobile}
                >
                  View All Cattle
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: isMobile ? 3 : 4 }}>
            <Pets sx={{ fontSize: isMobile ? 48 : 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant={isMobile ? "h6" : "h6"} gutterBottom>
              Welcome to Cattle Health System!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }} variant={isMobile ? "body2" : "body1"}>
              You haven't registered any cattle yet. Start by adding your first cattle to begin monitoring their health.
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              justifyContent: 'center', 
              flexDirection: isMobile ? 'column' : 'row',
              flexWrap: 'wrap' 
            }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddCattleDialogOpen(true)}
                fullWidth={isMobile}
              >
                Add Your First Cattle
              </Button>
              <Button
                variant="outlined"
                startIcon={<Assessment />}
                onClick={() => navigate('/health/enhanced-detection')}
                fullWidth={isMobile}
              >
                Try AI Detection
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button - Mobile Only */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setAddCattleDialogOpen(true)}
        >
          <Add />
        </Fab>
      )}

      {/* Floating Action Button - Desktop */}
      {!isMobile && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setAddCattleDialogOpen(true)}
        >
          <Add />
        </Fab>
      )}

      <AddCattleForm
        open={addCattleDialogOpen}
        onClose={() => setAddCattleDialogOpen(false)}
        onSuccess={(newCattle) => {
          setAddCattleDialogOpen(false);
          loadDashboardData();
        }}
      />
    </Box>
  );
};

export default CattleOwnerDashboard;