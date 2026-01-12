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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Pets,
  Person,
  Phone,
  LocationOn,
  Schedule,
  NoteAdd,
  CheckCircle,
  History,
  TrendingUp,
  Refresh,
  Edit,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { consultationAPI } from '../../services/api';

interface Patient {
  id: string;
  cattle_breed: string;
  cattle_age: string;
  cattle_identification: string;
  owner_name: string;
  owner_phone: string;
  status: string;
  added_at: string;
  last_consultation_date?: string;
  next_follow_up?: string;
}

interface PatientDetail {
  id: string;
  veterinarian: any;
  cattle: any;
  cattle_owner: any;
  status: string;
  added_at: string;
  treatment_plan: string;
  last_consultation?: string;
  next_follow_up?: string;
  consultation_request: any;
  consultation_history: any[];
  notes_count: number;
}

interface PatientNote {
  id: string;
  note_type: string;
  content: string;
  is_private: boolean;
  created_at: string;
}

const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null);
  const [patientNotes, setPatientNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState('active');
  
  // Note dialog state
  const [noteDialog, setNoteDialog] = useState({
    open: false,
    type: 'general',
    content: '',
    isPrivate: false,
  });
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (user?.role === 'veterinarian') {
      loadPatients();
    }
  }, [user, statusFilter]);

  const loadPatients = async () => {
    try {
      const response = await consultationAPI.getMyPatients({ status: statusFilter });
      setPatients(response.data.patients || []);
    } catch (err: any) {
      console.error('Failed to load patients:', err);
      setError('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientDetail = async (patientId: string) => {
    setDetailLoading(true);
    try {
      const response = await consultationAPI.getPatientDetail(patientId);
      setSelectedPatient(response.data);
      // Load patient notes if needed
      // setPatientNotes(response.data.notes || []);
    } catch (err: any) {
      console.error('Failed to load patient details:', err);
      setError('Failed to load patient details');
    } finally {
      setDetailLoading(false);
    }
  };

  const addNote = async () => {
    if (!selectedPatient || !noteDialog.content.trim()) return;

    setAddingNote(true);
    try {
      await consultationAPI.addPatientNote(selectedPatient.id, {
        note_type: noteDialog.type,
        content: noteDialog.content,
        is_private: noteDialog.isPrivate,
      });

      // Reload patient details to get updated notes
      await loadPatientDetail(selectedPatient.id);
      
      setNoteDialog({
        open: false,
        type: 'general',
        content: '',
        isPrivate: false,
      });
    } catch (err: any) {
      console.error('Failed to add note:', err);
      setError('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const markPatientCompleted = async (patientId: string) => {
    try {
      await consultationAPI.markPatientCompleted(patientId);
      // Reload patients list
      await loadPatients();
      // Clear selected patient if it was the completed one
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }
    } catch (err: any) {
      console.error('Failed to mark patient as completed:', err);
      setError('Failed to mark patient as completed');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'default';
      case 'transferred': return 'warning';
      default: return 'default';
    }
  };

  if (user?.role !== 'veterinarian') {
    return (
      <Alert severity="error">
        Only veterinarians can access the patient dashboard.
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
          My Patients
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="transferred">Transferred</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh patients">
            <IconButton onClick={loadPatients} disabled={loading}>
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

      <Grid container spacing={3}>
        {/* Patients List */}
        <Grid item xs={12} md={selectedPatient ? 4 : 12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Patients ({patients.length})
              </Typography>
              
              {patients.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography variant="body2" color="text.secondary">
                    No {statusFilter} patients found
                  </Typography>
                </Box>
              ) : (
                <List>
                  {patients.map((patient, index) => (
                    <React.Fragment key={patient.id}>
                      <ListItem
                        button
                        onClick={() => loadPatientDetail(patient.id)}
                        selected={selectedPatient?.id === patient.id}
                      >
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          <Pets />
                        </Avatar>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle2">
                                {patient.cattle_breed} - {patient.cattle_identification}
                              </Typography>
                              <Chip
                                label={patient.status}
                                color={getStatusColor(patient.status)}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                Owner: {patient.owner_name}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Added: {formatDate(patient.added_at)}
                              </Typography>
                              {patient.next_follow_up && (
                                <Typography variant="caption" display="block" color="warning.main">
                                  Follow-up: {formatDate(patient.next_follow_up)}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </ListItem>
                      {index < patients.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Patient Details */}
        {selectedPatient && (
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                {detailLoading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box>
                    {/* Patient Header */}
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                      <Box>
                        <Typography variant="h5" gutterBottom>
                          {selectedPatient.cattle.breed} - {selectedPatient.cattle.identification_number}
                        </Typography>
                        <Box display="flex" gap={1} mb={2}>
                          <Chip
                            label={selectedPatient.status}
                            color={getStatusColor(selectedPatient.status)}
                          />
                          <Chip
                            label={`${selectedPatient.cattle.age} years old`}
                            variant="outlined"
                          />
                          <Chip
                            label={selectedPatient.cattle.gender}
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      <Box display="flex" gap={1}>
                        <Button
                          startIcon={<NoteAdd />}
                          onClick={() => setNoteDialog({ ...noteDialog, open: true })}
                        >
                          Add Note
                        </Button>
                        {selectedPatient.status === 'active' && (
                          <Button
                            startIcon={<CheckCircle />}
                            color="success"
                            onClick={() => markPatientCompleted(selectedPatient.id)}
                          >
                            Mark Complete
                          </Button>
                        )}
                      </Box>
                    </Box>

                    {/* Tabs */}
                    <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                      <Tab label="Overview" />
                      <Tab label="Consultation History" />
                      <Tab label="Treatment Plan" />
                    </Tabs>

                    {/* Tab Content */}
                    <Box sx={{ mt: 3 }}>
                      {activeTab === 0 && (
                        <Grid container spacing={3}>
                          {/* Owner Information */}
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="subtitle1" gutterBottom>
                                <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Owner Information
                              </Typography>
                              <Typography variant="body2">
                                <strong>Name:</strong> {selectedPatient.cattle_owner.name}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Phone:</strong> {selectedPatient.cattle_owner.phone}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Email:</strong> {selectedPatient.cattle_owner.email}
                              </Typography>
                            </Paper>
                          </Grid>

                          {/* Cattle Information */}
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="subtitle1" gutterBottom>
                                <Pets sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Cattle Information
                              </Typography>
                              <Typography variant="body2">
                                <strong>Breed:</strong> {selectedPatient.cattle.breed}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Age:</strong> {selectedPatient.cattle.age} years
                              </Typography>
                              <Typography variant="body2">
                                <strong>Gender:</strong> {selectedPatient.cattle.gender}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Weight:</strong> {selectedPatient.cattle.weight || 'Not recorded'} kg
                              </Typography>
                            </Paper>
                          </Grid>

                          {/* Case Timeline */}
                          <Grid item xs={12}>
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="subtitle1" gutterBottom>
                                <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Case Timeline
                              </Typography>
                              <Typography variant="body2">
                                <strong>Added to patients:</strong> {formatDateTime(selectedPatient.added_at)}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Last consultation:</strong> {formatDateTime(selectedPatient.last_consultation)}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Next follow-up:</strong> {formatDateTime(selectedPatient.next_follow_up)}
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      )}

                      {activeTab === 1 && (
                        <Box>
                          <Typography variant="subtitle1" gutterBottom>
                            Consultation History ({selectedPatient.consultation_history?.length || 0})
                          </Typography>
                          {selectedPatient.consultation_history?.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No consultations recorded yet.
                            </Typography>
                          ) : (
                            <List>
                              {selectedPatient.consultation_history?.map((consultation, index) => (
                                <React.Fragment key={consultation.id}>
                                  <ListItem>
                                    <ListItemText
                                      primary={`${consultation.consultation_type} consultation`}
                                      secondary={
                                        <Box>
                                          <Typography variant="caption" display="block">
                                            {formatDateTime(consultation.created_at)}
                                          </Typography>
                                          <Typography variant="caption" display="block">
                                            Status: {consultation.status}
                                          </Typography>
                                          {consultation.diagnosis && (
                                            <Typography variant="caption" display="block">
                                              Diagnosis: {consultation.diagnosis}
                                            </Typography>
                                          )}
                                        </Box>
                                      }
                                    />
                                  </ListItem>
                                  {index < selectedPatient.consultation_history!.length - 1 && <Divider />}
                                </React.Fragment>
                              ))}
                            </List>
                          )}
                        </Box>
                      )}

                      {activeTab === 2 && (
                        <Box>
                          <Typography variant="subtitle1" gutterBottom>
                            Treatment Plan
                          </Typography>
                          {selectedPatient.treatment_plan ? (
                            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                {selectedPatient.treatment_plan}
                              </Typography>
                            </Paper>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No treatment plan recorded yet.
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Add Note Dialog */}
      <Dialog open={noteDialog.open} onClose={() => setNoteDialog({ ...noteDialog, open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Add Patient Note</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Note Type</InputLabel>
              <Select
                value={noteDialog.type}
                onChange={(e) => setNoteDialog({ ...noteDialog, type: e.target.value })}
                label="Note Type"
              >
                <MenuItem value="observation">Observation</MenuItem>
                <MenuItem value="treatment">Treatment</MenuItem>
                <MenuItem value="follow_up">Follow-up</MenuItem>
                <MenuItem value="general">General</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Note Content"
              value={noteDialog.content}
              onChange={(e) => setNoteDialog({ ...noteDialog, content: e.target.value })}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog({ ...noteDialog, open: false })}>
            Cancel
          </Button>
          <Button
            onClick={addNote}
            variant="contained"
            disabled={addingNote || !noteDialog.content.trim()}
          >
            {addingNote ? 'Adding...' : 'Add Note'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientDashboard;