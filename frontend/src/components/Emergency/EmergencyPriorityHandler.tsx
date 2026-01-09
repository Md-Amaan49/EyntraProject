import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  LinearProgress,
  Avatar,
  Divider,
} from '@mui/material';
import {
  ReportProblem,
  AccessTime,
  LocalHospital,
  Phone,
  VideoCall,
  Chat,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import EmergencyFlag from './EmergencyFlag';

interface EmergencyCase {
  id: string;
  type: 'consultation' | 'symptom_report' | 'health_alert';
  priority: 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved';
  createdAt: Date;
  estimatedResponseTime: number; // minutes
  veterinarianId?: string;
  veterinarianName?: string;
  caseDescription: string;
  cattleId: string;
  cattleName: string;
}

interface EmergencyPriorityHandlerProps {
  emergencyCase: EmergencyCase;
  onStartSession?: () => void;
  onCancel?: () => void;
}

const EmergencyPriorityHandler: React.FC<EmergencyPriorityHandlerProps> = ({
  emergencyCase,
  onStartSession,
  onCancel,
}) => {
  const navigate = useNavigate();
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - emergencyCase.createdAt.getTime()) / 1000 / 60);
      setTimeElapsed(elapsed);
      
      // Calculate progress based on estimated response time
      const progressPercent = Math.min((elapsed / emergencyCase.estimatedResponseTime) * 100, 100);
      setProgress(progressPercent);
    }, 1000);

    return () => clearInterval(interval);
  }, [emergencyCase.createdAt, emergencyCase.estimatedResponseTime]);

  const getStatusColor = () => {
    switch (emergencyCase.status) {
      case 'pending':
        return 'warning';
      case 'assigned':
        return 'info';
      case 'in_progress':
        return 'success';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusText = () => {
    switch (emergencyCase.status) {
      case 'pending':
        return 'Searching for available veterinarian...';
      case 'assigned':
        return `Assigned to Dr. ${emergencyCase.veterinarianName}`;
      case 'in_progress':
        return 'Consultation in progress';
      case 'resolved':
        return 'Emergency resolved';
      default:
        return 'Processing...';
    }
  };

  const getProgressColor = () => {
    if (progress < 50) return 'success';
    if (progress < 80) return 'warning';
    return 'error';
  };

  const canStartSession = () => {
    return emergencyCase.status === 'assigned' && emergencyCase.veterinarianId;
  };

  const handleStartSession = () => {
    if (canStartSession() && onStartSession) {
      onStartSession();
    } else if (emergencyCase.type === 'consultation') {
      navigate(`/consultations/${emergencyCase.id}`);
    }
  };

  const formatTimeElapsed = () => {
    if (timeElapsed < 1) return 'Just now';
    if (timeElapsed === 1) return '1 minute ago';
    return `${timeElapsed} minutes ago`;
  };

  return (
    <Card
      sx={{
        border: '2px solid',
        borderColor: emergencyCase.priority === 'critical' ? 'error.main' : 'warning.main',
        bgcolor: emergencyCase.priority === 'critical' ? 'error.light' : 'warning.light',
        animation: emergencyCase.priority === 'critical' ? 'pulse 2s infinite' : 'none',
        '@keyframes pulse': {
          '0%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.7)' },
          '70%': { boxShadow: '0 0 0 10px rgba(244, 67, 54, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0)' },
        },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <ReportProblem
              color={emergencyCase.priority === 'critical' ? 'error' : 'warning'}
              sx={{ fontSize: 32 }}
            />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Emergency Case #{emergencyCase.id.slice(-6)}
              </Typography>
              <EmergencyFlag
                isEmergency={true}
                severity={emergencyCase.priority}
                variant="chip"
                size="small"
              />
            </Box>
          </Box>
          
          <Chip
            label={getStatusText()}
            color={getStatusColor() as any}
            icon={<AccessTime />}
          />
        </Box>

        {/* Progress Indicator */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Response Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatTimeElapsed()} • Est. {emergencyCase.estimatedResponseTime} min
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={getProgressColor() as any}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Case Details */}
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Case Details:
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Cattle:</strong> {emergencyCase.cattleName} (ID: {emergencyCase.cattleId})
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Issue:</strong> {emergencyCase.caseDescription}
          </Typography>
          <Typography variant="body2">
            <strong>Type:</strong> {emergencyCase.type.replace('_', ' ').toUpperCase()}
          </Typography>
        </Box>

        {/* Veterinarian Info */}
        {emergencyCase.veterinarianName && (
          <Box mb={3}>
            <Divider sx={{ mb: 2 }} />
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <LocalHospital />
              </Avatar>
              <Box>
                <Typography variant="subtitle2">
                  Dr. {emergencyCase.veterinarianName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Emergency Veterinarian
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Action Buttons */}
        <Box display="flex" gap={2} flexWrap="wrap">
          {canStartSession() && (
            <Button
              variant="contained"
              color="error"
              startIcon={<VideoCall />}
              onClick={handleStartSession}
              size="large"
              sx={{ fontWeight: 'bold' }}
            >
              Start Emergency Session
            </Button>
          )}

          {emergencyCase.status === 'assigned' && (
            <Button
              variant="outlined"
              startIcon={<Chat />}
              onClick={() => navigate(`/consultations/${emergencyCase.id}`)}
            >
              Open Chat
            </Button>
          )}

          {emergencyCase.veterinarianName && (
            <Button
              variant="outlined"
              startIcon={<Phone />}
              onClick={() => alert('Direct call feature coming soon!')}
            >
              Call Veterinarian
            </Button>
          )}

          {emergencyCase.status === 'pending' && onCancel && (
            <Button
              variant="text"
              color="error"
              onClick={onCancel}
            >
              Cancel Emergency
            </Button>
          )}
        </Box>

        {/* Emergency Instructions */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>While you wait:</strong> Keep your cattle calm and monitor symptoms. 
            Do not administer any medication unless instructed by the veterinarian.
          </Typography>
        </Alert>

        {progress > 80 && emergencyCase.status === 'pending' && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            <Typography variant="body2">
              Response time exceeded. We're escalating your case to ensure immediate attention.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default EmergencyPriorityHandler;