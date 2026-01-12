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
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Avatar,
  Badge,
  Divider,
  IconButton,
} from '@mui/material';
import {
  LocalHospital,
  Assessment,
  Warning,
  TrendingUp,
  Notifications,
  Schedule,
  ReportProblem,
  LocationOn,
  Phone,
  VideoCall,
  Chat,
  People,
  Analytics,
  Map,
  NotificationImportant,
  CheckCircle,
  AccessTime,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Consultation, DashboardStatistics } from '../../types';
import { dashboardAPI, consultationAPI } from '../../services/api';

interface VeterinarianDashboardProps {
  user: any;
}

const VeterinarianDashboard: React.FC<VeterinarianDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [regionalAlerts, setRegionalAlerts] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [myPatients, setMyPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadVeterinarianDashboard();
  }, []);

  const loadVeterinarianDashboard = async () => {
    try {
      setLoading(true);
      
      // Load veterinarian-specific dashboard statistics
      try {
        const statsResponse = await consultationAPI.getDashboardStats();
        setDashboardStats(statsResponse.data);
      } catch (dashboardErr) {
        console.warn('Could not load dashboard stats:', dashboardErr);
        // Fallback to mock data
        setDashboardStats({
          pending_requests: 3,
          total_consultations: 45,
          active_patients: 12,
          emergency_responses: 2,
          average_response_time: 15.5,
          patient_satisfaction_rating: 4.8,
          total_earnings: 5000.00,
          consultation_fees: 4500.00,
          emergency_fees: 500.00
        });
      }

      // Load pending consultation requests
      try {
        const requestsResponse = await consultationAPI.getConsultationRequests({ status: 'pending' });
        setPendingRequests(requestsResponse.data.consultation_requests || []);
      } catch (requestsErr) {
        console.warn('Could not load consultation requests:', requestsErr);
        setPendingRequests([]);
      }

      // Load my patients
      try {
        const patientsResponse = await consultationAPI.getMyPatients({ status: 'active' });
        setMyPatients(patientsResponse.data.patients || []);
      } catch (patientsErr) {
        console.warn('Could not load patients:', patientsErr);
        setMyPatients([]);
      }

      // Load upcoming consultations
      try {
        const consultationsResponse = await consultationAPI.list({ 
          status: 'scheduled',
          date: new Date().toISOString().split('T')[0]
        });
        setConsultations(consultationsResponse.data.results || []);
      } catch (consultationsErr) {
        console.warn('Could not load consultations:', consultationsErr);
      }

      // Load regional disease alerts
      try {
        const alertsResponse = await dashboardAPI.getOutbreakAlerts();
        setRegionalAlerts(alertsResponse.data.outbreak_alerts || []);
      } catch (alertsErr) {
        console.warn('Could not load regional alerts:', alertsErr);
        // Fallback to mock data
        setRegionalAlerts([
          {
            id: '1',
            disease_name: 'Lumpy Skin Disease',
            location: 'Pune District',
            cases: 15,
            risk_level: 'high',
            distance: 25,
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            disease_name: 'Foot and Mouth Disease',
            location: 'Satara District',
            cases: 8,
            risk_level: 'medium',
            distance: 45,
            created_at: new Date().toISOString()
          }
        ]);
      }
      
    } catch (err: any) {
      console.error('Veterinarian dashboard error:', err);
      setError('Failed to load dashboard data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Veterinarian Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Welcome back, Dr. {user.name}! Here's your practice overview.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <LocalHospital color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{dashboardStats?.total_consultations || 0}</Typography>
                  <Typography color="text.secondary">Total Consultations</Typography>
                  <Typography variant="caption" color="success.main">
                    All time
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Badge badgeContent={dashboardStats?.pending_requests || 0} color="warning">
                  <Schedule color="info" sx={{ mr: 2, fontSize: 40 }} />
                </Badge>
                <Box>
                  <Typography variant="h4">{dashboardStats?.pending_requests || 0}</Typography>
                  <Typography color="text.secondary">Pending Requests</Typography>
                  {(dashboardStats?.pending_requests || 0) > 0 && (
                    <Chip 
                      label="Action Required" 
                      color="warning" 
                      size="small" 
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <People color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{dashboardStats?.active_patients || 0}</Typography>
                  <Typography color="text.secondary">Active Patients</Typography>
                  <Typography variant="caption" color="success.main">
                    Under your care
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assessment color="warning" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{dashboardStats?.patient_satisfaction_rating || 0}</Typography>
                  <Typography color="text.secondary">Satisfaction Rating</Typography>
                  <Typography variant="caption" color="success.main">
                    ⭐ Excellent
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions for Veterinarians */}
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
                    startIcon={<Schedule />}
                    onClick={() => navigate('/consultations')}
                    sx={{ 
                      bgcolor: '#1976d2',
                      py: 1.5,
                      '&:hover': { bgcolor: '#1565c0' }
                    }}
                  >
                    📅 My Schedule
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Map />}
                    onClick={() => navigate('/regional-map')}
                    sx={{ py: 1.5 }}
                  >
                    🗺️ Regional Map
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Analytics />}
                    onClick={() => navigate('/performance')}
                    sx={{ py: 1.5 }}
                  >
                    📊 Performance
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<People />}
                    onClick={() => navigate('/patients')}
                    sx={{ py: 1.5 }}
                  >
                    👥 My Patients
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<NotificationImportant />}
                    onClick={() => navigate('/alerts')}
                    sx={{ py: 1.5 }}
                  >
                    🔔 Disease Alerts
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<TrendingUp />}
                    onClick={() => navigate('/trends')}
                    sx={{ py: 1.5 }}
                  >
                    📈 Health Trends
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
                🏥 Regional Health Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Active Cases in Your Region
                </Typography>
                <Typography variant="h5" color="primary">
                  {dashboardStats?.regionalCases || 0}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Active Outbreaks
                </Typography>
                <Typography variant="h5" color={dashboardStats?.activeOutbreaks > 0 ? "warning.main" : "success.main"}>
                  {dashboardStats?.activeOutbreaks || 0}
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => navigate('/regional-overview')}
                sx={{ mt: 1 }}
              >
                View Regional Overview
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Consultation Requests */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="warning.main">
                ⏰ Pending Consultation Requests
              </Typography>
              {pendingRequests.length > 0 ? (
                <List>
                  {pendingRequests.map((request) => (
                    <ListItem key={request.id} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: request.priority === 'emergency' ? 'error.main' : 'warning.main' }}>
                          {request.priority === 'emergency' ? <ReportProblem /> : <Schedule />}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2">
                              {request.cattle_owner?.name || request.cattle_owner || 'Unknown Owner'}
                            </Typography>
                            <Chip 
                              label={request.priority} 
                              size="small" 
                              color={request.priority === 'emergency' ? 'error' : 'warning'}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Cattle ID: {request.cattle?.identification_number || request.cattle_id || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(request.case_description || request.caseDescription || 'No description available').substring(0, 50)}...
                            </Typography>
                          </Box>
                        }
                      />
                      <Box display="flex" flexDirection="column" gap={1}>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => navigate(`/consultation/accept/${request.id}`)}
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="success"
                          onClick={() => navigate(`/consultation/video/${request.id}`)}
                        >
                          <VideoCall />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No pending consultation requests
                </Typography>
              )}
              <Button
                size="small"
                onClick={() => navigate('/consultation-requests')}
                sx={{ mt: 1 }}
              >
                View All Requests
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="error.main">
                🚨 Regional Disease Alerts
              </Typography>
              {regionalAlerts.length > 0 ? (
                <List>
                  {regionalAlerts.map((alert) => (
                    <ListItem key={alert.id} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <LocationOn color={alert.risk_level === 'high' ? 'error' : 'warning'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2">
                              {alert.disease_name}
                            </Typography>
                            <Chip 
                              label={alert.risk_level} 
                              size="small" 
                              color={alert.risk_level === 'high' ? 'error' : 'warning'}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {alert.location} • {alert.distance}km away
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {alert.cases} cases reported
                            </Typography>
                          </Box>
                        }
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/alert/${alert.id}`)}
                      >
                        View
                      </Button>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No active disease alerts in your region
                </Typography>
              )}
              <Button
                size="small"
                onClick={() => navigate('/regional-alerts')}
                sx={{ mt: 1 }}
              >
                View Regional Map
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Today's Schedule */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📅 Today's Schedule
              </Typography>
              {consultations.length > 0 ? (
                <Grid container spacing={2}>
                  {consultations.slice(0, 4).map((consultation) => (
                    <Grid item xs={12} sm={6} md={3} key={consultation.id}>
                      <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {consultation.type === 'video' ? <VideoCall /> : 
                             consultation.type === 'voice' ? <Phone /> : <Chat />}
                          </Avatar>
                          <Typography variant="subtitle2">
                            {new Date(consultation.scheduledTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                        </Box>
                        <Typography variant="body2" gutterBottom>
                          Patient: {consultation.cattleId || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(consultation.caseDescription || 'No description available').substring(0, 40)}...
                        </Typography>
                        <Box mt={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            fullWidth
                            onClick={() => navigate(`/consultation/${consultation.id}`)}
                          >
                            Join
                          </Button>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Schedule sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    No consultations scheduled for today
                  </Typography>
                  <Typography color="text.secondary">
                    You're all caught up! Check back later for new consultation requests.
                  </Typography>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VeterinarianDashboard;