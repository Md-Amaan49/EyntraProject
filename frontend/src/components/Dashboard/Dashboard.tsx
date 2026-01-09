import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import CattleOwnerDashboard from './CattleOwnerDashboard';
import VeterinarianDashboard from './VeterinarianDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for user data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          User information not available. Please log in again.
        </Alert>
      </Box>
    );
  }

  // Route to appropriate dashboard based on user role
  switch (user.role) {
    case 'veterinarian':
      return <VeterinarianDashboard user={user} />;
    case 'owner':
    default:
      return <CattleOwnerDashboard user={user} />;
  }
};

export default Dashboard;