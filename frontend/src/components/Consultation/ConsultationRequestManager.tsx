import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Avatar,
  Badge,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Info,
  ReportProblem,
  LocationOn,
  Schedule,
  Person,
  Phone,
  Pets,
  Warning,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { consultationAPI } from '../../services/api';

interface ConsultationRequest {
  id: string;
  cattle_breed: string;
  cattle_age: string;
  cattle_identification: string;
  owner_name: string;
  owner_phone: string;
  symptoms: string;
  is_emergency: boolean;
  status: string;
  priority: string;
  created_at: string;
  expires_at: string;
  distance_km: number;
  notification_id: string;
}

const ConsultationRequestManager: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState<string | null>(null);
  const [responseDialog, setResponseDialog] = useState<{
    open: boolean;
    request: ConsultationRequest | null;
    action: 'accept' | 'decline' | 'request_info';
  }>({
    open: false,
    request: null,
    action: 'accept',
  });
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    if (user?.role === 'veterinarian') {
      loadRequests();
      // Set up polling for new requests
      const interval = setInterval(loadRequests, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadRequests = async () => {
    try {
      const response = await consultationAPI.getConsultationRequests({ status: 'pending' });
      setRequests(response.data.consultation_requests || []);
    } catch (err: any) {
      console.error('Failed to load consultation requests:', err);
      setError('Failed to load consultation requests');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (action: 'accept' | 'decline' | 'request_info') => {
    if (!responseDialog.request) return;

    setResponding(responseDialog.request.id);
    try {
      await consultationAPI.respondToRequest(responseDialog.request.id, {
        action,
        message: responseMessage,
      });

      // Remove the request from the list or update its status
      setRequests(prev => prev.filter(req => req.id !== responseDialog.request!.id));
      
      setResponseDialog({ open: false, request: null, action: 'accept' });
      setResponseMessage('');
      
      // Show success message based on action
      const actionMessages = {
        accept: 'Consultation request accepted! The cattle owner has been notified.',
        decline: 'Consultation request declined.',
        request_info: 'Information request sent to cattle owner.',
      };
      
      // You might want to show a success snackbar here
      console.log(actionMessages[action]);
      
    } catch (err: any) {
      console.error('Failed to respond to request:', err);
      setError(err.response?.data?.error || 'Failed to respond to request');
    } finally {
      setResponding(null);
    }
  };

  const openResponseDialog = (request: ConsultationRequest, action: 'accept' | 'decline' | 'request_info') => {
    setResponseDialog({ open: true, request, action });
    setResponseMessage('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'error';
      case 'urgent': return 'warning';
      default: return 'success';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 2; // Less than 2 hours remaining
  };

  if (user?.role !== 'veterinarian') {
    return (
      <Alert severity="error">
        Only veterinarians can access consultation requests.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Consultation Requests
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Badge badgeContent={requests.length} color="primary">
            <Typography variant="body2" color="text.secondary">
              Pending Requests
            </Typography>
          </Badge>
          <Tooltip title="Refresh requests">
            <IconButton onClick={loadRequests} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {requests.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No pending consultation requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              New requests will appear here when cattle owners report symptoms in your area.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {requests.map((request) => (
            <Grid item xs={12} key={request.id}>
              <Card 
                sx={{ 
                  border: request.is_emergency ? '2px solid' : '1px solid',
                  borderColor: request.is_emergency ? 'error.main' : 'divider',
                  position: 'relative',
                }}
              >
                {request.is_emergency && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bgcolor: 'error.main',
                      color: 'white',
                      px: 2,
                      py: 0.5,
                      borderBottomLeftRadius: 8,
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <ReportProblem fontSize="small" />
                      <Typography variant="caption" fontWeight="bold">
                        EMERGENCY
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                <CardContent>
                  <Grid container spacing={3}>
                    {/* Request Header */}
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Box display="flex" alignItems="center" gap={2} mb={1}>
                            <Chip
                              label={request.priority.toUpperCase()}
                              color={getPriorityColor(request.priority)}
                              size="small"
                            />
                            <Typography variant="caption" color="text.secondary">
                              {formatTimeAgo(request.created_at)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              • {request.distance_km}km away
                            </Typography>
                            {isExpiringSoon(request.expires_at) && (
                              <Chip
                                label="Expiring Soon"
                                color="warning"
                                size="small"
                                icon={<Schedule />}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Grid>

                    {/* Cattle and Owner Information */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          <Pets sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Cattle Information
                        </Typography>
                        <Typography variant="body2">
                          <strong>Breed:</strong> {request.cattle_breed}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Age:</strong> {request.cattle_age}
                        </Typography>
                        <Typography variant="body2">
                          <strong>ID:</strong> {request.cattle_identification}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Owner Information
                        </Typography>
                        <Typography variant="body2">
                          <strong>Name:</strong> {request.owner_name}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Phone:</strong> {request.owner_phone}
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Symptoms */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Reported Symptoms
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'info.50' }}>
                        <Typography variant="body2">
                          {request.symptoms}
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Action Buttons */}
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Box display="flex" gap={2} justifyContent="flex-end">
                        <Button
                          variant="outlined"
                          startIcon={<Info />}
                          onClick={() => openResponseDialog(request, 'request_info')}
                          disabled={responding === request.id}
                        >
                          Request Info
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => openResponseDialog(request, 'decline')}
                          disabled={responding === request.id}
                        >
                          Decline
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={responding === request.id ? <CircularProgress size={20} /> : <CheckCircle />}
                          onClick={() => openResponseDialog(request, 'accept')}
                          disabled={responding === request.id}
                        >
                          {responding === request.id ? 'Processing...' : 'Accept Case'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Response Dialog */}
      <Dialog 
        open={responseDialog.open} 
        onClose={() => setResponseDialog({ open: false, request: null, action: 'accept' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {responseDialog.action === 'accept' && 'Accept Consultation Request'}
          {responseDialog.action === 'decline' && 'Decline Consultation Request'}
          {responseDialog.action === 'request_info' && 'Request More Information'}
        </DialogTitle>
        <DialogContent>
          {responseDialog.request && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Case: {responseDialog.request.cattle_breed} - {responseDialog.request.cattle_identification}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Owner: {responseDialog.request.owner_name}
              </Typography>
              
              {responseDialog.action === 'accept' && (
                <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                  By accepting this case, the cattle will be added to your patient list and the owner will be notified.
                </Alert>
              )}
              
              {responseDialog.action === 'decline' && (
                <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                  This request will be offered to other nearby veterinarians.
                </Alert>
              )}
              
              {responseDialog.action === 'request_info' && (
                <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                  The cattle owner will receive your message and can provide additional information.
                </Alert>
              )}

              <TextField
                fullWidth
                multiline
                rows={3}
                label={
                  responseDialog.action === 'accept' ? 'Initial notes (optional)' :
                  responseDialog.action === 'decline' ? 'Reason for declining (optional)' :
                  'What information do you need?'
                }
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                sx={{ mt: 2 }}
                required={responseDialog.action === 'request_info'}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setResponseDialog({ open: false, request: null, action: 'accept' })}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleResponse(responseDialog.action)}
            variant="contained"
            color={
              responseDialog.action === 'accept' ? 'success' :
              responseDialog.action === 'decline' ? 'error' : 'primary'
            }
            disabled={responding !== null || (responseDialog.action === 'request_info' && !responseMessage.trim())}
          >
            {responseDialog.action === 'accept' && 'Accept Case'}
            {responseDialog.action === 'decline' && 'Decline'}
            {responseDialog.action === 'request_info' && 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsultationRequestManager;