import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Chat,
  Videocam,
  CallEnd,
  Pets,
} from '@mui/icons-material';
import { consultationAPI } from '../../services/api';
import { Consultation } from '../../types';
import ChatInterface from './ChatInterface';
import VideoCallInterface from './VideoCallInterface';
import CattleInfoPanel from './CattleInfoPanel';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`consultation-tabpanel-${index}`}
      aria-labelledby={`consultation-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );
};

const ConsultationSession: React.FC = () => {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [endSessionDialogOpen, setEndSessionDialogOpen] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (consultationId) {
      loadConsultation();
    }
  }, [consultationId]);

  const loadConsultation = async () => {
    if (!consultationId) return;

    try {
      setLoading(true);
      setError('');
      
      const response = await consultationAPI.get(consultationId);
      setConsultation(response.data);
      
      // Auto-start session if it's scheduled and not started
      if (response.data.status === 'scheduled') {
        await consultationAPI.start(consultationId);
        setConsultation(prev => prev ? { ...prev, status: 'in_progress' } : null);
      }
    } catch (err: any) {
      console.error('Failed to load consultation:', err);
      setError('Failed to load consultation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleEndSession = () => {
    setEndSessionDialogOpen(true);
  };

  const confirmEndSession = async () => {
    if (!consultation) return;

    try {
      await consultationAPI.end(consultation.id, sessionNotes);
      setEndSessionDialogOpen(false);
      navigate('/consultations');
    } catch (err: any) {
      console.error('Failed to end session:', err);
      setError('Failed to end session. Please try again.');
    }
  };

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !consultation) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error || 'Consultation not found'}
        </Alert>
        <Button
          variant="outlined"
          onClick={() => navigate('/consultations')}
          sx={{ mt: 2 }}
        >
          Back to Consultations
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5">
              Consultation Session
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {consultation.type.toUpperCase()} • Status: {consultation.status.replace('_', ' ').toUpperCase()}
              {consultation.isEmergency && ' • EMERGENCY'}
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={2}>
            {!isConnected && consultation.type === 'video' && (
              <Alert severity="warning" sx={{ py: 0 }}>
                Connection issues detected
              </Alert>
            )}
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<CallEnd />}
              onClick={handleEndSession}
              disabled={consultation.status !== 'in_progress'}
            >
              End Session
            </Button>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, mx: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Cattle Information Panel */}
          <Grid item xs={12} md={3}>
            <CattleInfoPanel 
              cattleId={consultation.cattleId} 
              showOwnerInfo={true}
              compact={true}
            />
          </Grid>

          {/* Consultation Interface */}
          <Grid item xs={12} md={9}>
            {consultation.type === 'video' ? (
              <Paper sx={{ height: '100%' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab
                      icon={<Videocam />}
                      label="Video Call"
                      id="consultation-tab-0"
                      aria-controls="consultation-tabpanel-0"
                    />
                    <Tab
                      icon={<Chat />}
                      label="Chat"
                      id="consultation-tab-1"
                      aria-controls="consultation-tabpanel-1"
                    />
                    <Tab
                      icon={<Pets />}
                      label="Cattle Info"
                      id="consultation-tab-2"
                      aria-controls="consultation-tabpanel-2"
                    />
                  </Tabs>
                </Box>

                <TabPanel value={activeTab} index={0}>
                  <VideoCallInterface
                    consultation={consultation}
                    onCallEnd={handleEndSession}
                    onConnectionChange={handleConnectionChange}
                  />
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                  <ChatInterface
                    consultation={consultation}
                    onSessionEnd={handleEndSession}
                  />
                </TabPanel>

                <TabPanel value={activeTab} index={2}>
                  <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                    <CattleInfoPanel 
                      cattleId={consultation.cattleId} 
                      showOwnerInfo={true}
                      compact={false}
                    />
                  </Box>
                </TabPanel>
              </Paper>
            ) : (
              // Chat-only consultation
              <Paper sx={{ height: '100%' }}>
                <ChatInterface
                  consultation={consultation}
                  onSessionEnd={handleEndSession}
                />
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* End Session Dialog */}
      <Dialog open={endSessionDialogOpen} onClose={() => setEndSessionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>End Consultation Session</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Are you sure you want to end this consultation session? This action cannot be undone.
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Session Notes (Optional)"
            placeholder="Add any final notes about this consultation..."
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
          
          <Alert severity="info" sx={{ mt: 2 }}>
            The consultation transcript and any shared files will be saved automatically.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEndSessionDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirmEndSession}
            color="error"
            variant="contained"
            startIcon={<CallEnd />}
          >
            End Session
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsultationSession;