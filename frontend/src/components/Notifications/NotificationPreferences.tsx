import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
  Button,
  Alert,
  CircularProgress,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Notifications,
  Email,
  Sms,
  Schedule,
  Warning,
  LocalHospital,
  Info,
  Save,
} from '@mui/icons-material';
import { notificationAPI } from '../../services/api';
import { NotificationPreferences as NotificationPreferencesType } from '../../types';

const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferencesType>({
    userId: '',
    enablePush: true,
    enableEmail: true,
    enableSMS: false,
    reminderTypes: ['appointment', 'medication', 'checkup'],
    alertTypes: ['emergency', 'critical_health', 'system'],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await notificationAPI.getPreferences();
      setPreferences(response.data);
    } catch (err: any) {
      console.error('Failed to load preferences:', err);
      setError('Failed to load notification preferences.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await notificationAPI.updatePreferences(preferences);
      setSuccess('Notification preferences saved successfully!');
    } catch (err: any) {
      console.error('Failed to save preferences:', err);
      setError('Failed to save notification preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReminderType = (type: string) => {
    setPreferences(prev => ({
      ...prev,
      reminderTypes: prev.reminderTypes.includes(type)
        ? prev.reminderTypes.filter(t => t !== type)
        : [...prev.reminderTypes, type],
    }));
  };

  const handleToggleAlertType = (type: string) => {
    setPreferences(prev => ({
      ...prev,
      alertTypes: prev.alertTypes.includes(type)
        ? prev.alertTypes.filter(t => t !== type)
        : [...prev.alertTypes, type],
    }));
  };

  const reminderTypeOptions = [
    { value: 'appointment', label: 'Veterinary Appointments', description: 'Reminders for upcoming consultations' },
    { value: 'medication', label: 'Medication Schedule', description: 'Reminders for cattle medication times' },
    { value: 'checkup', label: 'Health Checkups', description: 'Regular health monitoring reminders' },
    { value: 'vaccination', label: 'Vaccinations', description: 'Vaccination schedule reminders' },
    { value: 'feeding', label: 'Feeding Schedule', description: 'Feeding time reminders' },
  ];

  const alertTypeOptions = [
    { value: 'emergency', label: 'Emergency Alerts', description: 'Critical health emergencies requiring immediate attention' },
    { value: 'critical_health', label: 'Critical Health Issues', description: 'Serious health conditions detected by AI' },
    { value: 'system', label: 'System Notifications', description: 'App updates and system maintenance notices' },
    { value: 'consultation_updates', label: 'Consultation Updates', description: 'Updates about your veterinary consultations' },
    { value: 'treatment_progress', label: 'Treatment Progress', description: 'Updates on ongoing treatments' },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Notification Preferences
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Customize how and when you receive notifications about your cattle's health and appointments.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Delivery Methods */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Delivery Methods
          </Typography>
          
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.enablePush}
                  onChange={(e) => setPreferences(prev => ({ ...prev, enablePush: e.target.checked }))}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Notifications />
                  <Box>
                    <Typography variant="body1">Push Notifications</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Receive notifications directly in the app and browser
                    </Typography>
                  </Box>
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.enableEmail}
                  onChange={(e) => setPreferences(prev => ({ ...prev, enableEmail: e.target.checked }))}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Email />
                  <Box>
                    <Typography variant="body1">Email Notifications</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Receive notifications via email
                    </Typography>
                  </Box>
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.enableSMS}
                  onChange={(e) => setPreferences(prev => ({ ...prev, enableSMS: e.target.checked }))}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Sms />
                  <Box>
                    <Typography variant="body1">SMS Notifications</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Receive critical notifications via text message
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </FormGroup>
        </CardContent>
      </Card>

      {/* Reminder Types */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Schedule />
            <Typography variant="h6">
              Reminder Notifications
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Choose which types of reminders you want to receive.
          </Typography>
          
          <Box>
            {reminderTypeOptions.map((option) => (
              <Box key={option.value} sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.reminderTypes.includes(option.value)}
                      onChange={() => handleToggleReminderType(option.value)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">{option.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Alert Types */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Warning />
            <Typography variant="h6">
              Alert Notifications
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Choose which types of alerts you want to receive. Critical alerts cannot be disabled.
          </Typography>
          
          <Box>
            {alertTypeOptions.map((option) => (
              <Box key={option.value} sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.alertTypes.includes(option.value)}
                      onChange={() => handleToggleAlertType(option.value)}
                      disabled={option.value === 'emergency'} // Emergency alerts cannot be disabled
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box>
                        <Typography variant="body1">
                          {option.label}
                          {option.value === 'emergency' && (
                            <Chip label="Required" size="small" color="error" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quiet Hours
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Set hours when you don't want to receive non-critical notifications.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Emergency and critical health alerts will always be delivered regardless of quiet hours.
          </Alert>
          
          <Box display="flex" gap={2} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Quiet Hours: 10:00 PM to 8:00 AM (Default)
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box display="flex" justifyContent="flex-end" gap={2}>
        <Button
          variant="outlined"
          onClick={loadPreferences}
          disabled={saving}
        >
          Reset
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </Box>
    </Box>
  );
};

export default NotificationPreferences;