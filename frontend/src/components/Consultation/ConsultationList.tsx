import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Avatar,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  VideoCall,
  Chat,
  Call,
  Schedule,
  Cancel,
  MoreVert,
  LocalHospital,
  Warning,
  CheckCircle,
  AccessTime,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { consultationAPI } from '../../services/api';
import type { Consultation } from '../../types';

const ConsultationList: React.FC = () => {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await consultationAPI.list();
      let data = response.data;

      if (data && typeof data === 'object' && 'results' in data) {
        data = data.results;
      }

      setConsultations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading consultations:', err);
      setError('Failed to load consultations. Please try again.');
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'info';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getConsultationIcon = (type: string) => {
    switch (type) {
      case 'chat': return <Chat />;
      case 'voice': return <Call />;
      case 'video': return <VideoCall />;
      default: return <Chat />;
    }
  };

  const canStartConsultation = (consultation: Consultation) => {
    const now = new Date();
    const scheduledTime = new Date(consultation.scheduledTime);
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    return (
      consultation.status === 'scheduled' &&
      (consultation.isEmergency || minutesDiff <= 15) // Can start 15 minutes early or immediately for emergency
    );
  };

  const canCancelConsultation = (consultation: Consultation) => {
    const now = new Date();
    const scheduledTime = new Date(consultation.scheduledTime);
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    return consultation.status === 'scheduled' && hoursDiff >= 2; // Can cancel 2+ hours before
  };

  const handleStartConsultation = async (consultation: Consultation) => {
    try {
      await consultationAPI.start(consultation.id);
      // Navigate to consultation interface
      navigate(`/consultations/${consultation.id}`);
    } catch (err: any) {
      console.error('Error starting consultation:', err);
      setError('Failed to start consultation. Please try again.');
    }
  };

  const handleCancelConsultation = async () => {
    if (!selectedConsultation) return;

    try {
      await consultationAPI.cancel(selectedConsultation.id, 'Cancelled by user');
      setCancelDialogOpen(false);
      setSelectedConsultation(null);
      loadConsultations(); // Refresh list
    } catch (err: any) {
      console.error('Error cancelling consultation:', err);
      setError('Failed to cancel consultation. Please try again.');
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, consultation: Consultation) => {
    setAnchorEl(event.currentTarget);
    setSelectedConsultation(consultation);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedConsultation(null);
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
        My Consultations
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {consultations.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <LocalHospital sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Consultations Yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              You haven't booked any consultations yet. Find a veterinarian to get started.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/veterinarians')}
            >
              Find Veterinarians
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {consultations.map((consultation) => (
            <Grid item xs={12} md={6} lg={4} key={consultation.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getConsultationIcon(consultation.type)}
                      <Typography variant="h6" component="h3">
                        {consultation.type.charAt(0).toUpperCase() + consultation.type.slice(1)} Call
                      </Typography>
                      {consultation.isEmergency && (
                        <Chip
                          icon={<Warning />}
                          label="Emergency"
                          color="error"
                          size="small"
                        />
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, consultation)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  {/* Status */}
                  <Box mb={2}>
                    <Chip
                      label={getStatusLabel(consultation.status)}
                      color={getStatusColor(consultation.status) as any}
                      size="small"
                    />
                  </Box>

                  {/* Veterinarian Info */}
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <LocalHospital />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">
                        Dr. {consultation.veterinarianId} {/* This should be veterinarian name */}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Veterinarian
                      </Typography>
                    </Box>
                  </Box>

                  {/* Schedule Info */}
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Schedule fontSize="small" color="action" />
                    <Typography variant="body2">
                      {new Date(consultation.scheduledTime).toLocaleString()}
                    </Typography>
                  </Box>

                  {/* Case Description */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {consultation.caseDescription.length > 100
                      ? `${consultation.caseDescription.substring(0, 100)}...`
                      : consultation.caseDescription}
                  </Typography>

                  {/* Fee */}
                  <Typography variant="subtitle2" color="primary">
                    Fee: ₹{consultation.fee}
                  </Typography>
                </CardContent>

                <Divider />

                {/* Actions */}
                <Box sx={{ p: 2 }}>
                  {consultation.status === 'scheduled' && (
                    <Box display="flex" gap={1}>
                      {canStartConsultation(consultation) ? (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={getConsultationIcon(consultation.type)}
                          onClick={() => handleStartConsultation(consultation)}
                          fullWidth
                        >
                          Start Now
                        </Button>
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AccessTime />}
                          disabled
                          fullWidth
                        >
                          Starts at {new Date(consultation.scheduledTime).toLocaleTimeString()}
                        </Button>
                      )}
                    </Box>
                  )}

                  {consultation.status === 'completed' && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CheckCircle />}
                      fullWidth
                      disabled
                    >
                      Consultation Completed
                    </Button>
                  )}

                  {consultation.status === 'cancelled' && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Cancel />}
                      color="error"
                      fullWidth
                      disabled
                    >
                      Cancelled
                    </Button>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedConsultation && canCancelConsultation(selectedConsultation) && (
          <MenuItem
            onClick={() => {
              setCancelDialogOpen(true);
              handleMenuClose();
            }}
          >
            <Cancel fontSize="small" sx={{ mr: 1 }} />
            Cancel Consultation
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose}>
          <Schedule fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
      </Menu>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel Consultation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this consultation? 
            {selectedConsultation && canCancelConsultation(selectedConsultation) && (
              <> A refund will be processed within 24 hours.</>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            Keep Consultation
          </Button>
          <Button onClick={handleCancelConsultation} color="error" variant="contained">
            Cancel Consultation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsultationList;