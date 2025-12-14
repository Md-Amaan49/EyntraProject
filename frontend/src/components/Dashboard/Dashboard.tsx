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
} from '@mui/material';
import {
  Add,
  Pets,
  LocalHospital,
  Assessment,
  Warning,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { cattleAPI, healthAPI } from '../../services/api';
import { Cattle, SymptomEntry } from '../../types';
import CattleCard from '../Cattle/CattleCard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [cattle, setCattle] = useState<Cattle[]>([]);
  const [recentSymptoms, setRecentSymptoms] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Try to load cattle data
      const cattleResponse = await cattleAPI.list();
      let cattleData = cattleResponse.data;
      
      // If it's a paginated response, get the results array
      if (cattleData && typeof cattleData === 'object' && 'results' in cattleData) {
        cattleData = cattleData.results;
      }
      
      setCattle(Array.isArray(cattleData) ? cattleData : []);
      
      // Try to load symptoms data
      try {
        const symptomsResponse = await healthAPI.getSymptoms();
        let symptomsData = symptomsResponse.data;
        
        // If it's a paginated response, get the results array
        if (symptomsData && typeof symptomsData === 'object' && 'results' in symptomsData) {
          symptomsData = symptomsData.results;
        }
        
        setRecentSymptoms(Array.isArray(symptomsData) ? symptomsData.slice(0, 5) : []);
      } catch (symptomsErr) {
        console.warn('Could not load symptoms:', symptomsErr);
        setRecentSymptoms([]);
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
        Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Pets color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.totalCattle}</Typography>
                  <Typography color="text.secondary">Total Cattle</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assessment color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.healthyCattle}</Typography>
                  <Typography color="text.secondary">Healthy</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Warning color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.sickCattle}</Typography>
                  <Typography color="text.secondary">Sick</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <LocalHospital color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.underTreatment}</Typography>
                  <Typography color="text.secondary">Under Treatment</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<Assessment />}
                  onClick={() => navigate('/health/ai-detection')}
                  sx={{ bgcolor: '#1976d2' }}
                >
                  🤖 AI Disease Detection
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LocalHospital />}
                  onClick={() => navigate('/health/submit')}
                >
                  Report Symptoms
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => {
                    // For now, show an alert. In the future, this will navigate to add cattle page
                    alert('Add Cattle feature coming soon! For now, you can report symptoms for existing cattle.');
                  }}
                >
                  Add Cattle
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Health Reports
              </Typography>
              {recentSymptoms.length > 0 ? (
                <Box>
                  {recentSymptoms.map((symptom) => (
                    <Box key={symptom.id} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {symptom.cattle_name} - {symptom.cattle_id_number}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {symptom.severity} • {new Date(symptom.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  ))}
                  <Button
                    size="small"
                    onClick={() => {
                      alert('Health history page coming soon! For now, recent reports are shown here.');
                    }}
                    sx={{ mt: 1 }}
                  >
                    View All Reports
                  </Button>
                </Box>
              ) : (
                <Typography color="text.secondary">
                  No recent health reports
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Cattle */}
      <Typography variant="h6" gutterBottom>
        Your Cattle
      </Typography>
      {cattle.length > 0 ? (
        <Grid container spacing={2}>
          {cattle.slice(0, 6).map((animal) => (
            <Grid item xs={12} sm={6} md={4} key={animal.id}>
              <CattleCard cattle={animal} onUpdate={loadDashboardData} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Pets sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Welcome to Cattle Health System!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              You haven't registered any cattle yet. The cattle management feature is coming soon.<br/>
              For now, you can explore the health monitoring features.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<LocalHospital />}
                onClick={() => navigate('/health/submit')}
              >
                Report Health Symptoms
              </Button>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => {
                  alert('Add Cattle feature coming soon! We are working on cattle registration and management features.');
                }}
              >
                Add Cattle (Coming Soon)
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/health/submit')}
      >
        <LocalHospital />
      </Fab>
    </Box>
  );
};

export default Dashboard;